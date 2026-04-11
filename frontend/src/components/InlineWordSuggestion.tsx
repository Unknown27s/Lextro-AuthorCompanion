/**
 * Inline Word Suggestion Component
 * Traditional autocomplete-style word search with inline suggestions
 * No popups - appears inline as user types
 */

import React, { useState, useRef, useEffect } from 'react';
import { dictionaryApi, VocabItem } from '../api/client';
import { wordLoadingService } from '../services/wordLoadingService';

interface InlineWordSuggestionProps {
    onWordSelect: (word: string, vocabItem: VocabItem) => void;
    onSave: (word: string) => void;
    placeholder?: string;
}

const InlineWordSuggestion: React.FC<InlineWordSuggestionProps> = ({
    onWordSelect,
    onSave,
    placeholder = 'Search or add word...'
}) => {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Fetch suggestions as user types
    useEffect(() => {
        if (inputValue.trim().length < 2) {
            setSuggestions([]);
            setSelectedIndex(-1);
            return;
        }

        const fetchSuggestions = async () => {
            setIsLoading(true);
            try {
                const results = await wordLoadingService.searchByPrefix(inputValue.trim(), 10);
                setSuggestions(results.slice(0, 8)); // Limit to 8 suggestions
                setSelectedIndex(-1);
            } catch (error) {
                console.error('Failed to fetch suggestions:', error);
                setSuggestions([]);
            } finally {
                setIsLoading(false);
            }
        };

        const debounceTimer = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(debounceTimer);
    }, [inputValue]);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;

            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
                break;

            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                    selectSuggestion(suggestions[selectedIndex]);
                } else if (inputValue.trim()) {
                    handleAddWord();
                }
                break;

            case 'Escape':
                setSuggestions([]);
                setSelectedIndex(-1);
                break;

            default:
                break;
        }
    };

    // Select a suggestion
    const selectSuggestion = async (word: string) => {
        setInputValue(word);
        setSuggestions([]);
        setSelectedIndex(-1);

        try {
            const wordData = await dictionaryApi.getWord(word);
            if (wordData) {
                const vocabItem: VocabItem = dictionaryApi.transformToVocabItem(wordData, word);
                onWordSelect(word, vocabItem);
            }
        } catch (error) {
            console.error('Failed to get word data:', error);
        }
    };

    // Add custom word
    const handleAddWord = async () => {
        if (!inputValue.trim()) return;

        try {
            const wordData = await dictionaryApi.getWord(inputValue.trim());
            if (wordData) {
                const vocabItem: VocabItem = dictionaryApi.transformToVocabItem(wordData, inputValue.trim());
                onSave(inputValue.trim());
                onWordSelect(inputValue.trim(), vocabItem);
                setInputValue('');
                setSuggestions([]);
            }
        } catch (error) {
            console.error('Failed to add word:', error);
            // Show error toast
        }
    };

    // Scroll selected suggestion into view
    useEffect(() => {
        if (selectedIndex >= 0 && suggestionsRef.current) {
            const selectedElement = suggestionsRef.current.querySelector(
                `[data-index="${selectedIndex}"]`
            ) as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    return (
        <div className="relative w-full">
            {/* Search Input */}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => inputValue.length >= 2 && setSuggestions(suggestions)}
                    placeholder={placeholder}
                    className="w-full px-4 py-2.5 border border-warm-gray-dark rounded-lg focus:outline-none focus:border-accent-teal focus:ring-1 focus:ring-accent-teal text-text-primary placeholder-text-muted transition-all"
                />

                {/* Loading indicator */}
                {isLoading && (
                    <div className="absolute right-3 top-2.5">
                        <div className="animate-spin h-5 w-5 border-2 border-accent-teal border-t-transparent rounded-full"></div>
                    </div>
                )}

                {/* Clear button */}
                {inputValue.length > 0 && (
                    <button
                        onClick={() => {
                            setInputValue('');
                            setSuggestions([]);
                            inputRef.current?.focus();
                        }}
                        className="absolute right-3 top-2.5 text-text-muted hover:text-text-primary"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
                <div
                    ref={suggestionsRef}
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-warm-gray-dark rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
                >
                    {suggestions.map((word, index) => (
                        <button
                            key={index}
                            data-index={index}
                            onClick={() => selectSuggestion(word)}
                            className={`w-full text-left px-4 py-2.5 hover:bg-accent-teal/5 transition-colors flex items-center justify-between ${index === selectedIndex
                                    ? 'bg-accent-teal/10 border-l-2 border-accent-teal'
                                    : ''
                                } ${index !== suggestions.length - 1
                                    ? 'border-b border-warm-gray'
                                    : ''
                                }`}
                        >
                            <span className="text-text-primary font-medium">{word}</span>
                            <span className="text-text-muted text-xs">↵</span>
                        </button>
                    ))}
                </div>
            )}

            {/* No suggestions message */}
            {inputValue.length >= 2 && !isLoading && suggestions.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-warm-gray-dark rounded-lg shadow-lg p-3 text-center text-text-muted text-sm">
                    No suggestions found. Press Enter to add "{inputValue}"
                </div>
            )}

            {/* Add button */}
            {inputValue.length > 0 && suggestions.length === 0 && !isLoading && (
                <button
                    onClick={handleAddWord}
                    className="absolute top-full left-0 right-0 mt-1 w-full bg-accent-teal text-white py-2.5 rounded-lg hover:bg-accent-teal-dark transition-colors text-sm font-medium"
                >
                    ✓ Add "{inputValue.trim()}"
                </button>
            )}
        </div>
    );
};

export default InlineWordSuggestion;
