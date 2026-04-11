import React, { useState, useRef } from 'react';
import { dictionaryApi, localStorageApi } from '../api/client';
import VocabCard from './VocabCard';

interface WordSearchProps {
    onWordAdded?: () => void;
    onClose?: () => void;
    onPractice?: (id: string) => void;
    onUseInDocument?: (id: string) => void;
}

const CATEGORIES = ['emotion', 'expression', 'movement', 'action', 'place', 'quality', 'other'] as const;

export default function WordSearch({ onWordAdded, onClose, onPractice, onUseInDocument }: WordSearchProps): React.ReactElement {
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchResult, setSearchResult] = useState<any>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [savedWordIds, setSavedWordIds] = useState<Set<string>>(new Set());
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const recognitionRef = useRef<any>(null);

    // Load saved words on mount
    React.useEffect(() => {
        const vocab = localStorageApi.getUserVocab();
        setSavedWordIds(new Set(vocab.map(v => v.id)));
    }, []);

    // Popular words for suggestions
    const popularWords = ['eloquent', 'ephemeral', 'ubiquitous', 'sanguine', 'serendipity', 'mellifluous', 'pragmatic', 'taciturn', 'ebullient', 'obfuscate', 'perspicacious', 'verbose', 'laconic', 'ameliorate', 'exacerbate', 'pandemonium', 'euphoria', 'malaise', 'despairing', 'hopeful', 'blustery', 'placid', 'volatile', 'serene', 'jubilant', 'melancholic', 'meander', 'lurk', 'trudge', 'scurry', 'cavort', 'traverse', 'amble', 'hasten', 'skulk', 'saunter'];

    const getRecentSearches = () => {
        try {
            const searches = localStorage.getItem('recentSearches');
            return searches ? JSON.parse(searches) : [];
        } catch {
            return [];
        }
    };

    const saveRecentSearch = (term: string) => {
        try {
            let searches = getRecentSearches();
            searches = [term, ...searches.filter((s: string) => s !== term)].slice(0, 5);
            localStorage.setItem('recentSearches', JSON.stringify(searches));
        } catch {
            // Silently fail
        }
    };

    const getSuggestions = () => {
        // Only show suggestions if user is actively typing
        if (!searchTerm.trim()) {
            // Show recent searches if available
            const recent = getRecentSearches();
            if (recent.length > 0) {
                return { label: '📋 Recent Searches', items: recent };
            }
            return { label: '', items: [] };
        }

        // Show matching words from the popular words list
        const searchLower = searchTerm.toLowerCase();
        const filtered = popularWords.filter(word =>
            word.toLowerCase().startsWith(searchLower) || word.toLowerCase().includes(searchLower)
        );

        // Also include recent searches that match
        const recent = getRecentSearches().filter((word: string) =>
            word.toLowerCase().includes(searchLower)
        );

        const combined = [...new Set([...filtered, ...recent])]; // Remove duplicates
        return { label: combined.length > 0 ? '✨ Suggestions' : '', items: combined.slice(0, 8) };
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedTerm = searchTerm.trim();
        if (!trimmedTerm) {
            setError('Please enter a word to search');
            return;
        }

        setLoading(true);
        setError('');
        setSearchResult(null);
        setHasSearched(true);
        setShowSuggestions(false);

        // Scroll to top when search is initiated
        try {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            // Silently fail if scroll not supported
        }

        try {
            const lowerSearchTerm = trimmedTerm.toLowerCase();
            // If category filter is applied, search within that category
            if (selectedCategory !== 'all') {
                const categoryResults = await dictionaryApi.searchInCategory(lowerSearchTerm, selectedCategory);
                if (categoryResults.length > 0) {
                    // Use the first result
                    const result = categoryResults[0];
                    const vocabItem = dictionaryApi.transformToVocabItem(
                        { meanings: [{ definitions: [{ definition: result.definition }] }] },
                        trimmedTerm
                    );
                    setSearchResult(vocabItem);
                    saveRecentSearch(trimmedTerm);
                } else {
                    setError(`No words found in "${selectedCategory}" category matching "${trimmedTerm}"`);
                }
            } else {
                // Regular search across all dictionaries
                const data = await dictionaryApi.getWord(lowerSearchTerm);
                const vocabItem = dictionaryApi.transformToVocabItem(data, trimmedTerm);
                setSearchResult(vocabItem);
                saveRecentSearch(trimmedTerm);
            }
        } catch (err: any) {
            if (err.response?.status === 404) {
                setError(`Word "${trimmedTerm}" not found in dictionary`);
            } else if (err.message === 'Word cannot be empty') {
                setError('Please enter a valid word');
            } else if (err.message === 'Network Error') {
                setError('Network error. Please check your connection.');
            } else {
                setError('Failed to fetch data. Please try again.');
            }
            console.error('Search error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleVoiceSearch = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError('🎤 Voice search not supported in your browser');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            setError('');
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            setSearchTerm(transcript);
            setIsListening(false);
            // Auto-search after voice input
            setTimeout(() => {
                performSearch(transcript);
            }, 100);
        };

        recognition.onerror = (event: any) => {
            setError(`🎤 Voice error: ${event.error}`);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        // Store recognition instance for cancellation
        recognitionRef.current = recognition;
        recognition.start();
    };

    const handleCancelListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.abort();
            recognitionRef.current = null;
        }
        setIsListening(false);
        setError('');
    };

    const performSearch = async (term: string) => {
        const trimmedTerm = term.trim();
        if (!trimmedTerm) {
            setError('Please enter a word to search');
            return;
        }

        setLoading(true);
        setError('');
        setSearchResult(null);
        setHasSearched(true);
        setShowSuggestions(false);

        // Scroll to top when search is initiated
        try {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            // Silently fail if scroll not supported
        }

        try {
            const lowerTerm = trimmedTerm.toLowerCase();
            const data = await dictionaryApi.getWord(lowerTerm);
            const vocabItem = dictionaryApi.transformToVocabItem(data, trimmedTerm);
            setSearchResult(vocabItem);
            saveRecentSearch(lowerTerm);
        } catch (err: any) {
            if (err.response?.status === 404) {
                setError(`Word "${trimmedTerm}" not found in dictionary`);
            } else if (err.message === 'Word cannot be empty') {
                setError('Please enter a valid word');
            } else if (err.message === 'Network Error') {
                setError('Network error. Please check your connection.');
            } else {
                setError('Failed to fetch data. Please try again.');
            }
            console.error('Search error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveVocab = (id: string) => {
        if (savedWordIds.has(id)) {
            localStorageApi.removeVocab(id);
            setSavedWordIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
            if (onWordAdded) {
                onWordAdded();
            }
        } else {
            if (searchResult) {
                localStorageApi.saveVocab(id, searchResult, 'saved');
                setSavedWordIds(prev => new Set(prev).add(id));
                if (onWordAdded) {
                    onWordAdded();
                }
            }
        }
    };

    const handlePractice = (id: string) => {
        if (onPractice) {
            onPractice(id);
            handleCloseSearch();
        }
    };

    const handleUseInDocument = (id: string) => {
        if (onUseInDocument) {
            onUseInDocument(id);
            handleCloseSearch();
        }
    };

    const handleCloseSearch = () => {
        // Keep the search term, only close the modal
        setSearchResult(null);
        setHasSearched(false);
        setError('');
        setIsListening(false);
        setShowSuggestions(false);

        // Stop voice recognition if active
        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort();
            } catch (e) {
                // Silently fail if already stopped
                console.warn('Failed to abort voice recognition', e);
            }
            recognitionRef.current = null;
        }

        if (onClose) {
            onClose();
        }
    };

    const handleSynonymClick = (word: string) => {
        // Search for the synonym word
        performSearch(word);
    };

    // Modal search result view - Display as full VocabCard
    if (hasSearched && searchResult) {
        return (
            <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
                <div className="bg-white rounded-2xl sm:rounded-3xl w-full sm:max-w-2xl shadow-2xl animate-slide-up max-h-[95vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 sm:p-6 border-b border-warm-gray sticky top-0 bg-white z-10">
                        <h3 className="font-serif text-lg sm:text-2xl font-semibold text-text-primary">Word Details</h3>
                        <button
                            onClick={handleCloseSearch}
                            className="text-text-secondary hover:text-text-primary transition-all p-2 touch-target"
                            title="Close"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content - Full VocabCard */}
                    <div className="p-0">
                        <VocabCard
                            item={searchResult}
                            onSave={handleSaveVocab}
                            onPractice={handlePractice}
                            onUseInDocument={handleUseInDocument}
                            onSynonymClick={handleSynonymClick}
                            isSaved={savedWordIds.has(searchResult.id)}
                            source="online"
                        />
                    </div>
                </div>
            </div>
        );
    }

    // Modal Search Overlay
    return (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl sm:rounded-3xl w-full sm:max-w-lg shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-3 sm:p-6 border-b border-warm-gray">
                    <h3 className="font-serif text-lg sm:text-xl font-semibold text-text-primary">Search Dictionary</h3>
                    <button
                        onClick={handleCloseSearch}
                        className="text-text-secondary hover:text-text-primary transition-colors p-2 touch-target"
                        title="Close search"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Category Filter */}
                <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b border-warm-gray">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Filter by Category</p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all touch-target ${selectedCategory === 'all'
                                ? 'bg-accent-teal text-white'
                                : 'bg-warm-gray text-text-secondary hover:bg-warm-gray/80'
                                }`}
                        >
                            All
                        </button>
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize touch-target ${selectedCategory === cat
                                    ? 'bg-accent-teal text-white'
                                    : 'bg-warm-gray text-text-secondary hover:bg-warm-gray/80'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
                    <form onSubmit={handleSearch} className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 300)}
                            placeholder="Search for a word..."
                            className="w-full pl-4 pr-24 py-3 sm:py-4 bg-white border border-warm-gray rounded-lg focus:outline-none focus:border-accent-teal focus:ring-2 focus:ring-accent-teal transition-all font-serif text-base text-text-primary placeholder-text-muted"
                            disabled={loading || isListening}
                            autoComplete="off"
                            autoFocus
                        />

                        {/* Search Suggestions Dropdown */}
                        {showSuggestions && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-warm-gray rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                                <div className="p-2">
                                    {getSuggestions().label && (
                                        <p className="text-xs font-semibold text-text-muted px-2 py-1 uppercase tracking-wide">
                                            {getSuggestions().label}
                                        </p>
                                    )}
                                    {getSuggestions().items.length > 0 ? (
                                        getSuggestions().items.map((word: string) => (
                                            <button
                                                key={word}
                                                type="button"
                                                onClick={() => {
                                                    setSearchTerm(word);
                                                    setShowSuggestions(false);
                                                    performSearch(word);
                                                }}
                                                className="w-full text-left px-3 py-2 hover:bg-warm-gray rounded text-sm text-text-primary transition-colors"
                                            >
                                                {word}
                                            </button>
                                        ))
                                    ) : (
                                        searchTerm.trim() && (
                                            <p className="px-3 py-2 text-xs text-text-muted italic">
                                                No suggestions. Press Enter to search.
                                            </p>
                                        )
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <button
                                type="button"
                                onClick={handleVoiceSearch}
                                disabled={loading || isListening}
                                title="Search by voice"
                                className={`p-2.5 rounded-full transition-all touch-target ${isListening ? 'bg-accent-teal text-white animate-pulse' : 'text-accent-teal hover:bg-accent-teal/10'} disabled:opacity-50`}
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                    <path d="M17 16.91c-1.48 1.46-3.51 2.36-5.7 2.36-2.2 0-4.2-.9-5.7-2.36M19 21h2v-1c0-2.76-4.02-4.3-7-4.3s-7 1.54-7 4.3v1h2v-1c0-1.39 2.78-2.3 5-2.3s5 .91 5 2.3v1z" />
                                </svg>
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !searchTerm.trim()}
                                className="p-2.5 text-accent-teal hover:bg-accent-teal/10 rounded-full transition-colors disabled:opacity-50 touch-target"
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-2 border-accent-teal border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </form>

                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    {isListening && (
                        <div className="flex items-center justify-center gap-3">
                            <p className="text-accent-teal text-sm animate-pulse">🎤 Listening...</p>
                            <button
                                type="button"
                                onClick={handleCancelListening}
                                className="text-accent-teal hover:bg-accent-teal/10 rounded-full p-1 transition-colors"
                                title="Cancel voice input"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
