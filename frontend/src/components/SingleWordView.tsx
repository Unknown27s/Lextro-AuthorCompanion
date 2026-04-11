import React, { useState, useEffect } from 'react';
import { localStorageApi } from '../api/client';

interface SingleWordViewProps {
    isOpen: boolean;
    onClose: () => void;
    onWordSelected?: (word: any) => void;
}

const SingleWordView: React.FC<SingleWordViewProps> = ({ isOpen, onClose, onWordSelected }) => {
    const [words, setWords] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredWords, setFilteredWords] = useState<any[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true);
            // Load saved words
            const savedVocab = localStorageApi.getUserVocab();
            const loadedWords = savedVocab.map((sv: any) => ({
                ...sv.vocab_item,
                userVocabId: sv.id
            }));
            setWords(loadedWords);
            setFilteredWords(loadedWords);
            setCurrentIndex(0);
            setSearchQuery('');
        }
    }, [isOpen]);

    // Filter words based on search query
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredWords(words);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = words.filter(
                word =>
                    word.word.toLowerCase().includes(query) ||
                    (word.definition && word.definition.toLowerCase().includes(query))
            );
            setFilteredWords(filtered);
            setCurrentIndex(0);
        }
    }, [searchQuery, words]);

    if (!isOpen) return null;

    const currentWord = filteredWords[currentIndex];

    const handleNext = () => {
        if (currentIndex < filteredWords.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleClose = () => {
        setIsAnimating(false);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const handleWordClick = () => {
        if (onWordSelected && currentWord) {
            onWordSelected(currentWord);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeydown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'ArrowRight') {
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                handlePrev();
            } else if (e.key === 'Escape') {
                handleClose();
            }
        };

        window.addEventListener('keydown', handleKeydown);
        return () => window.removeEventListener('keydown', handleKeydown);
    }, [isOpen, currentIndex, filteredWords.length]);

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${isAnimating ? 'opacity-50' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={handleClose}
            />

            {/* Modal */}
            <div
                className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
            >
                <div
                    className="bg-warm-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="sticky top-0 bg-gradient-to-r from-accent-teal to-accent-teal-dark text-white p-3 sm:p-6 flex items-center justify-between rounded-t-xl sm:rounded-t-2xl gap-2">
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg sm:text-2xl font-serif font-bold truncate">Word Explorer</h2>
                            <p className="text-teal-100 text-xs sm:text-sm mt-0.5 sm:mt-1">
                                {filteredWords.length > 0 ? `${currentIndex + 1} of ${filteredWords.length}` : 'No words found'}
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                            aria-label="Close"
                        >
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="sticky top-12 sm:top-20 bg-warm-gray-light p-2.5 sm:p-4 border-b border-warm-gray">
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search words..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 sm:pl-10 pr-8 sm:pr-4 py-1.5 sm:py-2 text-sm sm:text-base border border-warm-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-teal"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-text-muted hover:text-text-primary"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    {filteredWords.length > 0 && currentWord ? (
                        <div className="p-3 sm:p-8 space-y-3 sm:space-y-6">
                            {/* Word Card */}
                            <div
                                onClick={handleWordClick}
                                className="bg-gradient-to-br from-accent-teal/10 to-accent-teal/5 rounded-lg sm:rounded-xl p-4 sm:p-8 border-2 border-accent-teal/30 hover:border-accent-teal/60 transition-colors cursor-pointer"
                            >
                                {/* Word */}
                                <div className="text-center mb-3 sm:mb-4">
                                    <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-accent-teal mb-1.5 sm:mb-2 break-words leading-tight">
                                        {currentWord.word}
                                    </h1>
                                    {currentWord.pos && (
                                        <p className="text-xs sm:text-sm font-semibold text-text-muted uppercase tracking-wide">
                                            {currentWord.pos}
                                        </p>
                                    )}
                                </div>

                                {/* Difficulty */}
                                {currentWord.difficulty && (
                                    <div className="flex justify-center mb-3 sm:mb-4">
                                        <span className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-xs font-semibold whitespace-nowrap ${currentWord.difficulty === 'easy'
                                            ? 'bg-green-100 text-green-800'
                                            : currentWord.difficulty === 'medium'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}>
                                            {currentWord.difficulty.charAt(0).toUpperCase() + currentWord.difficulty.slice(1)}
                                        </span>
                                    </div>
                                )}

                                {/* Definition */}
                                {currentWord.definition && (
                                    <div className="border-t-2 border-accent-teal/20 pt-3 sm:pt-6">
                                        <p className="text-base sm:text-lg text-text-primary leading-relaxed">
                                            {currentWord.definition}
                                        </p>
                                    </div>
                                )}

                                {/* Example */}
                                {currentWord.example && (
                                    <div className="mt-3 sm:mt-6 pt-3 sm:pt-6 border-t-2 border-accent-teal/20">
                                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5 sm:mb-2">
                                            Example
                                        </p>
                                        <p className="text-sm sm:text-base text-text-secondary italic">
                                            "{currentWord.example}"
                                        </p>
                                    </div>
                                )}

                                {/* Synonyms */}
                                {currentWord.synonyms && currentWord.synonyms.length > 0 && (
                                    <div className="mt-3 sm:mt-6 pt-3 sm:pt-6 border-t-2 border-accent-teal/20">
                                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 sm:mb-3">
                                            Synonyms
                                        </p>
                                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                            {currentWord.synonyms.map((syn: string, idx: number) => (
                                                <span
                                                    key={idx}
                                                    className="bg-accent-teal/20 text-accent-teal px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm truncate"
                                                >
                                                    {syn}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Navigation Instructions */}
                            <div className="text-center text-xs text-text-muted space-y-0.5 sm:space-y-1 pb-2 sm:pb-0">
                                <p>← Use arrow keys or buttons to navigate →</p>
                                <p>Press ESC to close</p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 sm:p-8 text-center">
                            <p className="text-sm sm:text-base text-text-secondary mb-3 sm:mb-4">
                                {searchQuery ? 'No words match your search' : 'No saved words found'}
                            </p>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-accent-teal text-white rounded-lg hover:bg-accent-teal-dark transition-colors"
                                >
                                    Clear Search
                                </button>
                            )}
                        </div>
                    )}

                    {/* Navigation Controls */}
                    {filteredWords.length > 0 && (
                        <div className="sticky bottom-0 bg-warm-gray-light border-t border-warm-gray p-2.5 sm:p-6 flex gap-2 sm:gap-4">
                            <button
                                onClick={handlePrev}
                                disabled={currentIndex === 0}
                                className="flex-1 px-2 sm:px-4 py-2 sm:py-3 bg-white border-2 border-accent-teal text-accent-teal font-semibold text-xs sm:text-base rounded-lg hover:bg-accent-teal/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1 sm:gap-2 min-h-10 sm:min-h-12"
                            >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                <span className="hidden sm:inline">Previous</span>
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={currentIndex === filteredWords.length - 1}
                                className="flex-1 px-2 sm:px-4 py-2 sm:py-3 bg-accent-teal hover:bg-accent-teal-dark text-white font-semibold text-xs sm:text-base rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1 sm:gap-2 min-h-10 sm:min-h-12"
                            >
                                <span className="hidden sm:inline">Next</span>
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default SingleWordView;
