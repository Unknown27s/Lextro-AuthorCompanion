import React, { useState, useEffect } from 'react';
import { localStorageApi } from '../api/client';

interface WordClassifierProps {
    onOpenSingleWordView?: () => void;
}

const WordClassifier: React.FC<WordClassifierProps> = ({ onOpenSingleWordView }) => {
    const [allWords, setAllWords] = useState<any[]>([]);
    const [filteredWords, setFilteredWords] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedWord, setSelectedWord] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Load all saved words
    useEffect(() => {
        const loadSavedWords = () => {
            try {
                const userVocab = localStorageApi.getUserVocab();

                // Extract vocab items and sort alphabetically
                const wordsWithTracking = userVocab
                    .map((item: any) => ({
                        ...item.vocab_item,
                        userVocabId: item.id,
                        added_at: item.added_at,
                    }))
                    .sort((a: any, b: any) => a.word.localeCompare(b.word));

                setAllWords(wordsWithTracking);
                setFilteredWords(wordsWithTracking);
                setIsLoading(false);
            } catch (error) {
                console.error('Error loading saved words:', error);
                setIsLoading(false);
            }
        };

        loadSavedWords();
    }, []);

    // Handle word click to show details
    const handleWordClick = (word: any) => {
        setSelectedWord(word);
    };

    // Handle synonym/antonym click
    const handleSynonymClick = (synonymWord: string) => {
        const foundWord = allWords.find((w: any) => w.word.toLowerCase() === synonymWord.toLowerCase());
        if (foundWord) {
            setSelectedWord(foundWord);
        }
    };

    // Filter words based on search query
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredWords(allWords);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = allWords.filter(
                word =>
                    word.word.toLowerCase().includes(query) ||
                    (word.definition && word.definition.toLowerCase().includes(query))
            );
            setFilteredWords(filtered);
        }
    }, [searchQuery, allWords]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-text-muted">Loading your saved words...</div>
            </div>
        );
    }

    if (allWords.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-4xl mb-3">📚</div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">No Saved Words Yet</h3>
                <p className="text-text-secondary">
                    Start adding words you learn! Search for words in the main page to get started.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            {/* If no word selected, show A-Z list */}
            {!selectedWord && (
                <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                            <h2 className="text-2xl font-serif text-text-primary">Your Vocabulary</h2>
                            <p className="text-sm text-text-muted mt-1">
                                {filteredWords.length} of {allWords.length} words
                            </p>
                        </div>
                        {onOpenSingleWordView && allWords.length > 0 && (
                            <button
                                onClick={onOpenSingleWordView}
                                className="px-3 py-2 bg-accent-teal hover:bg-accent-teal-dark text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="hidden sm:inline">One by One</span>
                            </button>
                        )}
                    </div>

                    {/* Search Bar */}
                    <div className="relative mb-6">
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search words or definitions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 border border-warm-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-teal bg-white"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted hover:text-text-primary"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Alphabetical List */}
                    {filteredWords.length > 0 ? (
                        <div className="space-y-2">
                            {filteredWords.map((word: any, idx: number) => (
                                <button
                                    key={idx}
                                    onClick={() => handleWordClick(word)}
                                    className="w-full text-left p-3 bg-white border border-warm-border rounded-lg hover:border-accent-teal hover:shadow-md transition-all active:scale-95"
                                >
                                    <h3 className="font-serif font-semibold text-text-primary">
                                        {word.word}
                                    </h3>
                                    <p className="text-sm text-text-secondary line-clamp-1 mt-1">
                                        {word.definition}
                                    </p>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-text-secondary">No words match your search</p>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="mt-3 px-4 py-2 text-sm bg-accent-teal text-white rounded-lg hover:bg-accent-teal-dark transition-colors"
                            >
                                Clear Search
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* If word selected, show details */}
            {selectedWord && (
                <div className="space-y-4">
                    {/* Back Button */}
                    <button
                        onClick={() => setSelectedWord(null)}
                        className="flex items-center gap-2 px-4 py-2 text-accent-teal hover:bg-accent-teal/10 rounded-lg transition-colors font-medium"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to List
                    </button>

                    {/* Word Details Card */}
                    <div className="bg-white rounded-lg border border-accent-teal/20 p-6">
                        {/* Word Title */}
                        <h1 className="font-serif text-3xl font-bold text-text-primary mb-2">
                            {selectedWord.word}
                        </h1>

                        {/* Part of Speech */}
                        {selectedWord.pos && (
                            <p className="text-sm text-text-muted mb-4">
                                <span className="inline-block px-3 py-1 bg-accent-teal/10 text-accent-teal rounded-full font-medium">
                                    {selectedWord.pos}
                                </span>
                            </p>
                        )}

                        {/* Definition */}
                        <div className="mb-6 pb-6 border-b border-warm-border">
                            <h3 className="text-sm font-semibold text-text-muted uppercase mb-2">Definition</h3>
                            <p className="text-base text-text-primary leading-relaxed">
                                {selectedWord.definition}
                            </p>
                        </div>

                        {/* Example from Corpus */}
                        {selectedWord.example_corpus && (
                            <div className="mb-6 pb-6 border-b border-warm-border">
                                <h3 className="text-sm font-semibold text-text-muted uppercase mb-2">Example</h3>
                                <p className="text-base text-text-primary italic">
                                    "{selectedWord.example_corpus}"
                                </p>
                            </div>
                        )}

                        {/* AI Generated Example */}
                        {selectedWord.ai_example && (
                            <div className="mb-6 pb-6 border-b border-warm-border bg-accent-teal/5 p-4 rounded-lg">
                                <h3 className="text-sm font-semibold text-text-muted uppercase mb-2">In Your Voice</h3>
                                <p className="text-base text-text-primary italic">
                                    "{selectedWord.ai_example}"
                                </p>
                            </div>
                        )}

                        {/* Synonyms */}
                        {selectedWord.synonyms && selectedWord.synonyms.length > 0 && (
                            <div className="mb-6 pb-6 border-b border-warm-border">
                                <h3 className="text-sm font-semibold text-text-muted uppercase mb-3">Similar Words (Synonyms)</h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedWord.synonyms.map((syn: string, idx: number) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSynonymClick(syn)}
                                            className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full text-sm font-medium transition-colors active:scale-95"
                                        >
                                            {syn}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Antonyms */}
                        {selectedWord.antonyms && selectedWord.antonyms.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-text-muted uppercase mb-3">Opposite Words (Antonyms)</h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedWord.antonyms.map((ant: string, idx: number) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSynonymClick(ant)}
                                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-full text-sm font-medium transition-colors active:scale-95"
                                        >
                                            {ant}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WordClassifier;
