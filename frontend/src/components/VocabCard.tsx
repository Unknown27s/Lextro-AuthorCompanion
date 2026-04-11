import React, { useState } from 'react';
import { VocabItem } from '../api/client';
import WordDetailsModal from './WordDetailsModal';
import SaveMenu from './SaveMenu';

interface VocabCardProps {
    item: VocabItem;
    onSave: (id: string) => void;
    onPractice: (id: string) => void;
    onUseInDocument: (id: string) => void;
    onSynonymClick?: (word: string) => void;
    source?: 'offline' | 'cache' | 'online';
    isSaved?: boolean;
    isLoading?: boolean;
    onOpenSingleWordView?: () => void;
}

const VocabCard: React.FC<VocabCardProps> = ({
    item,
    onSave,
    onPractice,
    onUseInDocument,
    onSynonymClick,
    source,
    isSaved = false,
    isLoading = false,
    onOpenSingleWordView,
}) => {
    const [expanded, setExpanded] = useState(false);
    const [saved, setSaved] = useState(isSaved);
    const [showSaveToast, setShowSaveToast] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showSaveMenu, setShowSaveMenu] = useState(false);

    const difficultyDots = {
        easy: 1,
        medium: 3,
        hard: 5,
    };

    const handleSave = () => {
        setShowSaveMenu(true);
    };

    const handleSaveMenuConfirm = (category: string) => {
        setSaved(!saved);
        onSave(item.id);
        // Show brief toast feedback
        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 1500);
    };

    const handlePronounce = () => {
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(item.word);
            utterance.rate = 0.9;
            speechSynthesis.speak(utterance);
        }
    };

    const getFormattedDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (date.toDateString() === today.toDateString()) {
                return 'Today';
            } else if (date.toDateString() === yesterday.toDateString()) {
                return 'Yesterday';
            } else {
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
        } catch {
            return 'Unknown';
        }
    };

    // Category mapping for words
    const getCategoryTag = () => {
        const categoryMap: { [key: string]: { label: string; color: string } } = {
            'leer': { label: 'Expression', color: 'bg-blue-100 text-blue-700' },
            'constrain': { label: 'Expression', color: 'bg-blue-100 text-blue-700' },
            'glare': { label: 'Expression', color: 'bg-blue-100 text-blue-700' },
            'smirk': { label: 'Expression', color: 'bg-blue-100 text-blue-700' },
            'grimace': { label: 'Expression', color: 'bg-blue-100 text-blue-700' },
            'scowl': { label: 'Expression', color: 'bg-blue-100 text-blue-700' },
            'sneer': { label: 'Expression', color: 'bg-blue-100 text-blue-700' },
            'bemoan': { label: 'Expression', color: 'bg-blue-100 text-blue-700' },
            'articulate': { label: 'Expression', color: 'bg-blue-100 text-blue-700' },
            'despairing': { label: 'Emotion', color: 'bg-pink-100 text-pink-700' },
            'hopeful': { label: 'Emotion', color: 'bg-pink-100 text-pink-700' },
            'blustery': { label: 'Emotion', color: 'bg-pink-100 text-pink-700' },
            'placid': { label: 'Emotion', color: 'bg-pink-100 text-pink-700' },
            'volatile': { label: 'Emotion', color: 'bg-pink-100 text-pink-700' },
            'serene': { label: 'Emotion', color: 'bg-pink-100 text-pink-700' },
            'jubilant': { label: 'Emotion', color: 'bg-pink-100 text-pink-700' },
            'meander': { label: 'Movement', color: 'bg-purple-100 text-purple-700' },
            'lurk': { label: 'Action', color: 'bg-orange-100 text-orange-700' },
            'trudge': { label: 'Movement', color: 'bg-purple-100 text-purple-700' },
            'scurry': { label: 'Movement', color: 'bg-purple-100 text-purple-700' },
            'cavort': { label: 'Movement', color: 'bg-purple-100 text-purple-700' },
            'traverse': { label: 'Movement', color: 'bg-purple-100 text-purple-700' },
            'amble': { label: 'Movement', color: 'bg-purple-100 text-purple-700' },
            'hasten': { label: 'Action', color: 'bg-orange-100 text-orange-700' },
            'skulk': { label: 'Movement', color: 'bg-purple-100 text-purple-700' },
            'saunter': { label: 'Movement', color: 'bg-purple-100 text-purple-700' },
            'vale': { label: 'Place', color: 'bg-green-100 text-green-700' },
            'precipice': { label: 'Place', color: 'bg-green-100 text-green-700' },
            'knoll': { label: 'Place', color: 'bg-green-100 text-green-700' },
            'cove': { label: 'Place', color: 'bg-green-100 text-green-700' },
            'chasm': { label: 'Place', color: 'bg-green-100 text-green-700' },
            'plateau': { label: 'Place', color: 'bg-green-100 text-green-700' },
        };

        const category = categoryMap[item.word.toLowerCase()];
        if (category) {
            return (
                <span className={`inline-block px-2 py-0.5 ${category.color} rounded-full text-xs font-medium`}>
                    {category.label}
                </span>
            );
        }
        return null;
    };

    // Hide offline badge if word is saved
    const shouldShowSourceBadge = () => {
        if (saved || !source) return false;
        return source === 'offline' || source === 'cache' || source === 'online';
    };

    const getSourceBadge = () => {
        if (!shouldShowSourceBadge()) return null;

        const badgeConfig = {
            offline: { bg: 'bg-green-100', text: 'text-green-700', label: '📚 Offline' },
            cache: { bg: 'bg-blue-100', text: 'text-blue-700', label: '💾 Cached' },
            online: { bg: 'bg-purple-100', text: 'text-purple-700', label: '🌐 Online' },
        };

        const config = badgeConfig[source || 'online'];
        return (
            <span
                className={`inline-block px-2 py-0.5 ${config.bg} ${config.text} rounded-full text-xs font-medium ml-2`}
            >
                {config.label}
            </span>
        );
    };

    return (
        <article className="bg-card-bg rounded-card shadow-card hover:shadow-card-hover transition-all duration-200 p-3 sm:p-5 mx-1 sm:mx-4 mb-2 sm:mb-4 transform hover:scale-[1.01]">
            {/* Header: Centered word with pronunciation */}
            <div className="flex flex-col items-center justify-center mb-3 gap-0.5">
                <div className="flex items-center justify-center gap-1 sm:gap-2 min-h-fit">
                    <h3 className="font-serif text-word-title text-text-primary text-center break-words leading-tight">{item.word}</h3>
                    <button
                        onClick={handlePronounce}
                        className="p-1.5 sm:p-2 hover:bg-warm-gray rounded-lg transition-colors flex-shrink-0"
                        title="Pronounce word"
                        aria-label={`Pronounce ${item.word}`}
                    >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-accent-teal" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5h-2v-2h2l5 5v2zm6-6c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1zm0-4c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1zm4 10h-2v-2h2v2zm0-4h-2v-2h2v2z" />
                        </svg>
                    </button>
                </div>

                {/* POS + Category Tags - Centered & Compact */}
                <div className="flex items-center gap-1 mt-1 justify-center flex-wrap">
                    {item.pos && (
                        <span className="inline-block px-1.5 py-0.5 bg-warm-gray rounded-full text-xs text-text-secondary font-medium">
                            {item.pos}
                        </span>
                    )}
                    {getCategoryTag()}
                </div>

                {/* Difficulty dots - Centered */}
                <div className="flex items-center space-x-0.5 mt-1.5">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-1 h-1 rounded-full ${i < difficultyDots[item.difficulty]
                                ? 'bg-accent-teal'
                                : 'bg-warm-gray-dark'
                                }`}
                        />
                    ))}
                </div>

                {/* Source Badge - Centered */}
                {getSourceBadge()}
            </div>

            {/* Definition - Larger & More Visible */}
            <p className="text-xs sm:text-body-sm text-text-primary mb-3 leading-relaxed text-center font-medium px-1">
                {item.definition}
            </p>

            {/* Synonyms row - Compact */}
            {item.synonyms && item.synonyms.length > 0 && (
                <div className="mb-3 px-1">
                    <p className="text-xs font-semibold text-text-muted mb-1.5">Related:</p>
                    <div className="flex flex-wrap gap-1">
                        {item.synonyms.slice(0, expanded ? undefined : 2).map((syn) => (
                            <button
                                key={syn}
                                onClick={() => onSynonymClick?.(syn)}
                                className="inline-flex items-center px-1.5 py-0.5 bg-warm-gray hover:bg-accent-teal hover:text-white rounded-full text-xs text-text-secondary transition-colors cursor-pointer"
                                title={`Search for ${syn}`}
                            >
                                {syn}
                            </button>
                        ))}
                        {item.synonyms.length > 2 && !expanded && (
                            <button
                                onClick={() => setExpanded(true)}
                                className="inline-flex items-center px-1.5 py-0.5 text-xs text-accent-teal hover:text-accent-teal-dark font-medium"
                            >
                                +{item.synonyms.length - 2}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Examples (collapsible) - Compact */}
            {expanded && (item.example_corpus || item.ai_example) && (
                <div className="mb-3 space-y-1.5 animate-fade-up px-1 border-l-2 border-accent-teal/30 pl-2">
                    <p className="text-xs font-semibold text-text-muted mb-1.5">Examples:</p>
                    {item.example_corpus && (
                        <p className="text-xs sm:text-body-sm text-text-primary italic">
                            "{item.example_corpus}"
                        </p>
                    )}
                    {item.ai_example && (
                        <div>
                            <p className="text-xs sm:text-body-sm text-text-primary italic">
                                "{item.ai_example}"
                            </p>
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-accent-teal/10 rounded text-xs text-accent-teal font-medium">
                                in your voice
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Action buttons - Horizontal row, more compact */}
            <div className="flex items-center justify-center gap-1.5 pt-2 sm:pt-3 border-t border-warm-gray-dark flex-wrap">
                <button
                    onClick={() => onPractice(item.id)}
                    className="inline-flex items-center px-2.5 sm:px-4 py-1.5 sm:py-2 bg-accent-teal hover:bg-accent-teal-dark text-white rounded-lg text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-none justify-center"
                    aria-label="Practice this word"
                >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="hidden sm:inline">Practice</span>
                </button>

                <button
                    onClick={() => setShowDetailsModal(true)}
                    className="inline-flex items-center px-2.5 sm:px-4 py-1.5 sm:py-2 border border-accent-teal text-accent-teal hover:bg-accent-teal/5 rounded-lg text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-none justify-center"
                    aria-label="View detailed information"
                    title="View detailed information from Wordnik API"
                >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="hidden sm:inline">Details</span>
                </button>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    className={`p-2 sm:p-2.5 rounded-lg transition-colors flex-shrink-0 ${saved
                        ? 'bg-green-500 text-white'
                        : 'border border-warm-gray-dark text-text-secondary hover:border-text-secondary'
                        }`}
                    aria-label={saved ? 'Unsave word' : 'Save word'}
                    title={saved ? 'Click to remove from saved' : 'Click to save'}
                >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                </button>

                <button
                    onClick={() => onUseInDocument(item.id)}
                    className="inline-flex items-center px-2.5 sm:px-4 py-1.5 sm:py-2 border border-warm-gray-dark hover:border-accent-teal text-text-secondary hover:text-accent-teal rounded-lg text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-none justify-center"
                    aria-label="Use in document"
                >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden sm:inline">Use</span>
                </button>

                {!expanded && (item.example_corpus || item.ai_example) && (
                    <button
                        onClick={() => setExpanded(true)}
                        className="text-xs font-medium text-accent-teal hover:text-accent-teal-dark ml-auto sm:ml-2"
                    >
                        Examples
                    </button>
                )}
            </div>

            {/* Date Added Footer */}
            {item.created_at && (
                <div className="mt-2 pt-2 border-t border-warm-gray-dark">
                    <p className="text-xs text-text-muted">
                        📅 Added {getFormattedDate(item.created_at)}
                    </p>
                </div>
            )}

            {/* Save Feedback Toast */}
            {showSaveToast && (
                <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium animate-pulse z-50">
                    {saved ? '✓ Saved!' : '✗ Removed from saved'}
                </div>
            )}

            {/* Word Details Modal */}
            <WordDetailsModal
                word={item.word}
                isOpen={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
            />

            {/* Save Menu */}
            <SaveMenu
                isOpen={showSaveMenu}
                wordTitle={item.word}
                isSaved={saved}
                onClose={() => setShowSaveMenu(false)}
                onSave={handleSaveMenuConfirm}
                onOpenSingleWordView={onOpenSingleWordView}
            />
        </article>
    );
};

export default VocabCard;
