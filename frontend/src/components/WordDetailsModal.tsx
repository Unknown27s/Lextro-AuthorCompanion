import React, { useState, useEffect } from 'react';
import { wordnikService } from '../services/wordnikService';

interface WordDetailsModalProps {
    word: string;
    isOpen: boolean;
    onClose: () => void;
}

const WordDetailsModal: React.FC<WordDetailsModalProps> = ({ word, isOpen, onClose }) => {
    const [details, setDetails] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'definitions' | 'examples' | 'related' | 'pronunciation'>('definitions');

    useEffect(() => {
        if (isOpen && word) {
            fetchWordDetails();
        }
    }, [isOpen, word]);

    const fetchWordDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const wordDetails = await wordnikService.getWordDetails(word);
            if (wordDetails) {
                setDetails(wordDetails);
            } else {
                setError('Could not find detailed information for this word');
            }
        } catch (err) {
            setError('Error fetching word details');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-accent-teal to-accent-teal-dark text-white p-4 sm:p-6 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold capitalize">{word}</h2>
                        {details?.definitions?.[0]?.partOfSpeech && (
                            <p className="text-sm opacity-90 mt-1 italic">
                                {details.definitions[0].partOfSpeech}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-xl hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="p-8 text-center">
                        <div className="inline-flex items-center gap-2">
                            <div className="animate-spin h-5 w-5 border-2 border-accent-teal border-t-transparent rounded-full"></div>
                            <p className="text-text-muted">Loading detailed information...</p>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="p-6 text-center text-red-600">
                        <p>⚠️ {error}</p>
                    </div>
                )}

                {/* Content */}
                {details && !loading && (
                    <div>
                        {/* Tab Navigation */}
                        <div className="flex border-b overflow-x-auto">
                            <button
                                onClick={() => setActiveTab('definitions')}
                                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'definitions'
                                        ? 'border-b-2 border-accent-teal text-accent-teal'
                                        : 'text-text-muted hover:text-text-secondary'
                                    }`}
                            >
                                Definitions ({details.definitions?.length || 0})
                            </button>
                            <button
                                onClick={() => setActiveTab('examples')}
                                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'examples'
                                        ? 'border-b-2 border-accent-teal text-accent-teal'
                                        : 'text-text-muted hover:text-text-secondary'
                                    }`}
                            >
                                Examples ({details.examples?.length || 0})
                            </button>
                            <button
                                onClick={() => setActiveTab('related')}
                                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'related'
                                        ? 'border-b-2 border-accent-teal text-accent-teal'
                                        : 'text-text-muted hover:text-text-secondary'
                                    }`}
                            >
                                Related
                            </button>
                            <button
                                onClick={() => setActiveTab('pronunciation')}
                                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'pronunciation'
                                        ? 'border-b-2 border-accent-teal text-accent-teal'
                                        : 'text-text-muted hover:text-text-secondary'
                                    }`}
                            >
                                Pronunciation
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="p-4 sm:p-6">
                            {/* Definitions Tab */}
                            {activeTab === 'definitions' && (
                                <div className="space-y-4">
                                    {details.definitions && details.definitions.length > 0 ? (
                                        details.definitions.map((def: any, idx: number) => (
                                            <div key={idx} className="border-l-4 border-accent-teal pl-4 py-2">
                                                <p className="text-sm font-semibold text-text-secondary">
                                                    {def.partOfSpeech}
                                                    {def.source && <span className="text-xs text-text-muted ml-2">({def.source})</span>}
                                                </p>
                                                <p className="text-text-primary mt-1">{def.text}</p>
                                                {def.note && (
                                                    <p className="text-xs text-text-muted mt-2 italic">Note: {def.note}</p>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-text-muted">No definitions available</p>
                                    )}
                                </div>
                            )}

                            {/* Examples Tab */}
                            {activeTab === 'examples' && (
                                <div className="space-y-4">
                                    {details.examples && details.examples.length > 0 ? (
                                        details.examples.map((example: any, idx: number) => (
                                            <div key={idx} className="bg-warm-gray rounded-lg p-4">
                                                <p className="text-text-primary italic">"{example.text}"</p>
                                                {example.title && (
                                                    <p className="text-xs text-text-muted mt-2">— {example.title}</p>
                                                )}
                                                {example.url && (
                                                    <a
                                                        href={example.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-accent-teal hover:underline mt-2 block"
                                                    >
                                                        Read more
                                                    </a>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-text-muted">No examples available</p>
                                    )}
                                </div>
                            )}

                            {/* Related Words Tab */}
                            {activeTab === 'related' && (
                                <div className="space-y-4">
                                    {details.relatedWords && details.relatedWords.length > 0 ? (
                                        details.relatedWords.map((related: any, idx: number) => (
                                            <div key={idx}>
                                                <h4 className="font-semibold text-text-secondary capitalize mb-2">
                                                    {related.relationshipType}
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {related.words.map((w: string, widx: number) => (
                                                        <span
                                                            key={widx}
                                                            className="bg-accent-teal bg-opacity-10 text-accent-teal px-3 py-1 rounded-full text-sm"
                                                        >
                                                            {w}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-text-muted">No related words available</p>
                                    )}
                                </div>
                            )}

                            {/* Pronunciation Tab */}
                            {activeTab === 'pronunciation' && (
                                <div className="space-y-4">
                                    {details.pronunciations && details.pronunciations.length > 0 ? (
                                        <div>
                                            <div className="space-y-3">
                                                {details.pronunciations.map((pron: any, idx: number) => (
                                                    <div key={idx} className="bg-warm-gray rounded-lg p-4">
                                                        <p className="text-sm text-text-muted">IPA</p>
                                                        <p className="text-lg font-mono text-text-primary mt-1">
                                                            {pron.raw || pron.rawType}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                            {details.frequency && (
                                                <div className="mt-4 bg-accent-teal bg-opacity-10 rounded-lg p-4">
                                                    <p className="text-sm text-text-muted">Frequency</p>
                                                    <div className="mt-2">
                                                        <p className="text-text-primary">
                                                            Normalized: {(details.frequency.normalizedFrequency * 100).toFixed(2)}%
                                                        </p>
                                                        <div className="w-full bg-warm-gray rounded-full h-2 mt-2">
                                                            <div
                                                                className="bg-accent-teal h-2 rounded-full"
                                                                style={{
                                                                    width: `${Math.min(
                                                                        details.frequency.normalizedFrequency * 100,
                                                                        100
                                                                    )}%`,
                                                                }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-text-muted">No pronunciation data available</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="sticky bottom-0 bg-warm-gray border-t p-4 flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-text-primary text-white rounded-lg py-3 font-medium hover:bg-opacity-90 transition-opacity"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WordDetailsModal;
