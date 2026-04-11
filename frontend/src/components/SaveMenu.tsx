import React, { useState, useEffect } from 'react';

interface SaveMenuProps {
    isOpen: boolean;
    wordTitle: string;
    onClose: () => void;
    onSave: (category: string) => void;
    isSaved?: boolean;
    onOpenSingleWordView?: () => void;
}

interface SaveCategory {
    id: string;
    label: string;
    icon: string;
    description: string;
    letter: string;
}

const SaveMenu: React.FC<SaveMenuProps> = ({ isOpen, wordTitle, onClose, onSave, isSaved = false, onOpenSingleWordView }) => {
    const [selectedCategory, setSelectedCategory] = useState('saved');
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true);
        }
    }, [isOpen]);

    // Organized categories with letter grouping
    const categories: SaveCategory[] = [
        { id: 'writing', label: 'Writing', icon: '✍️', description: 'For writing projects', letter: 'W' },
        { id: 'speaking', label: 'Speaking', icon: '🗣️', description: 'For speaking practice', letter: 'S' },
        { id: 'saved', label: 'General Vocab', icon: '📚', description: 'General vocabulary', letter: 'G' },
        { id: 'practice', label: 'To Practice', icon: '⚡', description: 'Focus on learning', letter: 'T' },
    ];

    // Group categories by letter
    const groupedCategories = categories.reduce((acc, cat) => {
        const letter = cat.letter;
        if (!acc[letter]) {
            acc[letter] = [];
        }
        acc[letter].push(cat);
        return acc;
    }, {} as Record<string, SaveCategory[]>);

    const sortedLetters = Object.keys(groupedCategories).sort();

    const handleSave = () => {
        onSave(selectedCategory);
        setIsAnimating(false);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const handleClose = () => {
        setIsAnimating(false);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${isAnimating ? 'opacity-50' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={handleClose}
            />

            {/* Menu */}
            <div
                className={`fixed inset-x-0 bottom-0 z-50 bg-warm-white rounded-t-3xl shadow-xl transition-transform duration-300 transform ${isAnimating ? 'translate-y-0' : 'translate-y-full'
                    }`}
            >
                {/* Header */}
                <div className="sticky top-0 bg-warm-white border-b border-warm-gray-dark px-4 sm:px-6 py-4 rounded-t-3xl">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="font-serif text-lg sm:text-xl text-text-primary">
                            {isSaved ? 'Move' : 'Save'} "{wordTitle}"
                        </h2>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-warm-gray rounded-lg transition-colors"
                            aria-label="Close menu"
                        >
                            <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <p className="text-xs sm:text-sm text-text-muted">
                        {isSaved ? 'Choose a new category' : 'Choose where to save this word'}
                    </p>
                </div>

                {/* Alphabetical Sections */}
                <div className="px-2 sm:px-4 py-4 space-y-0 max-h-[60vh] overflow-y-auto">
                    {sortedLetters.map((letter, letterIndex) => (
                        <div key={letter} className={letterIndex > 0 ? 'pt-2' : ''}>
                            {/* Section Header with Large Letter */}
                            <div className="sticky top-12 bg-warm-white/95 backdrop-blur-sm py-2 px-3 flex items-center gap-3 mb-2">
                                <div className="text-4xl sm:text-5xl font-serif font-bold text-accent-teal/20 -ml-2">
                                    {letter}
                                </div>
                                <div className="flex-1 h-px bg-gradient-to-r from-warm-gray-dark to-transparent" />
                            </div>

                            {/* Categories in this section */}
                            <div className="space-y-1.5 px-2">
                                {groupedCategories[letter].map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => setSelectedCategory(category.id)}
                                        className={`w-full text-left px-4 py-3 rounded-lg transition-all active:scale-95 ${selectedCategory === category.id
                                            ? 'bg-accent-teal text-white shadow-md'
                                            : 'bg-white hover:bg-warm-gray text-text-primary border border-warm-gray-dark/30'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg">{category.icon}</span>
                                                    <div>
                                                        <p className="font-semibold text-sm sm:text-base">{category.label}</p>
                                                        <p className={`text-xs ${selectedCategory === category.id ? 'text-white/70' : 'text-text-muted'}`}>
                                                            {category.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div
                                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-2 ${selectedCategory === category.id
                                                    ? 'bg-white border-white'
                                                    : 'border-text-muted/50'
                                                    }`}
                                            >
                                                {selectedCategory === category.id && (
                                                    <div className="w-2 h-2 bg-accent-teal rounded-full" />
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Subtle divider between sections */}
                            {letterIndex < sortedLetters.length - 1 && (
                                <div className="h-px bg-warm-gray-dark/30 mt-3" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="sticky bottom-0 bg-white border-t border-warm-gray-dark px-4 sm:px-6 py-4 space-y-3">
                    <div className="flex gap-3">
                        <button
                            onClick={handleClose}
                            className="flex-1 px-4 py-3 border border-warm-gray-dark text-text-primary font-medium rounded-lg hover:bg-warm-gray transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 px-4 py-3 bg-accent-teal hover:bg-accent-teal-dark text-white font-medium rounded-lg transition-colors shadow-sm"
                        >
                            {isSaved ? 'Move' : 'Save'} Word
                        </button>
                    </div>
                    {onOpenSingleWordView && (
                        <button
                            onClick={() => {
                                handleClose();
                                setTimeout(() => {
                                    onOpenSingleWordView();
                                }, 300);
                            }}
                            className="w-full px-4 py-3 border-2 border-accent-teal text-accent-teal font-semibold rounded-lg hover:bg-accent-teal/10 transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            View Words One at a Time
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

export default SaveMenu;
