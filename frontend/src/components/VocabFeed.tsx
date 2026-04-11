import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { setLoading, addItems } from '../store/feedSlice';
import { localStorageApi, VocabItem } from '../api/client';
import { dictionaryService } from '../services/dictionaryService';
import { authService } from '../services/authService';
import VocabCard from './VocabCard';

interface VocabFeedProps {
    onPractice: (id: string) => void;
    onUseInDocument: (id: string) => void;
    onWordAdded?: () => void;  // NEW: Callback when a word is added/removed
    showTypeSelector?: boolean;
    showOnlySaved?: boolean;  // NEW: Show only saved words
    onOpenSingleWordView?: () => void;  // NEW: Callback to open single word view
}

const VocabFeed: React.FC<VocabFeedProps> = ({
    onPractice,
    onUseInDocument,
    onWordAdded,
    showTypeSelector = false,
    showOnlySaved = true,  // Default to showing only saved words
    onOpenSingleWordView
}) => {
    const dispatch = useDispatch<AppDispatch>();
    const { items, loading } = useSelector((state: RootState) => state.feed);
    const loaderRef = useRef<HTMLDivElement>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [loadingSamples, setLoadingSamples] = useState(false);
    const [savedWordIds, setSavedWordIds] = useState<Set<string>>(new Set());
    const [refreshKey, setRefreshKey] = useState(0);  // NEW: Force refresh key

    // Infinite scroll state
    const [displayedWords, setDisplayedWords] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMoreWords, setHasMoreWords] = useState(true);
    const [allWords, setAllWords] = useState<any[]>([]);
    const WORDS_PER_PAGE = 5; // Load 5 words at a time

    // Load saved words on mount
    useEffect(() => {
        if (showOnlySaved) {
            const savedVocab = localStorageApi.getUserVocab();
            const savedIds = new Set(savedVocab.map((v: any) => v.id));
            setSavedWordIds(savedIds);
        }
    }, [showOnlySaved]);

    // Initialize all words on mount
    useEffect(() => {
        if (isInitialLoad) {
            if (showOnlySaved) {
                // Show only saved words - load from localStorage
                try {
                    const savedVocab = localStorageApi.getUserVocab();
                    // Remove duplicates by word name
                    const seenWords = new Set<string>();
                    const uniqueWords = savedVocab.filter((sv: any) => {
                        const key = sv.vocab_item.word.toLowerCase();
                        if (seenWords.has(key)) {
                            return false; // Skip duplicate
                        }
                        seenWords.add(key);
                        return true;
                    });

                    const savedWords = uniqueWords.map((sv: any) => ({
                        ...sv.vocab_item,
                        type: sv.vocab_item.tags?.[0] || 'saved',
                        userVocabId: sv.id  // Keep track of the localStorage ID for removal
                    }));

                    setAllWords(savedWords);
                    setHasMoreWords(savedWords.length > WORDS_PER_PAGE);

                    // Load first page (5 words)
                    const firstPage = savedWords.slice(0, WORDS_PER_PAGE);
                    setDisplayedWords(firstPage);
                    setCurrentPage(1);
                    setIsInitialLoad(false);

                    console.log('Loaded ' + savedWords.length + ' unique saved words');
                } catch (error) {
                    console.error('Failed to load saved words:', error);
                    setIsInitialLoad(false);
                }
            } else if (showTypeSelector) {
                // Original behavior: Load from dictionary
                try {
                    const user = authService.getCurrentUser();
                    const purpose = user?.learningPurpose || 'writing';
                    const purposeWords = dictionaryService.getWordsByPurpose(purpose);

                    const allLoadedWords: any[] = purposeWords.map(word => ({
                        word,
                        type: purpose,
                        pos: 'noun',
                        definition: `${word} - vocabulary for ${purpose}`,
                        difficulty: 'medium'
                    }));

                    const shuffled = allLoadedWords.sort(() => Math.random() - 0.5);
                    setAllWords(shuffled);
                    setHasMoreWords(shuffled.length > WORDS_PER_PAGE);

                    const firstPage = shuffled.slice(0, WORDS_PER_PAGE);
                    setDisplayedWords(firstPage);
                    setCurrentPage(1);
                    setIsInitialLoad(false);
                } catch (error) {
                    console.error('Failed to initialize dictionary:', error);
                    setIsInitialLoad(false);
                }
            } else {
                loadMore();
                setIsInitialLoad(false);
            }
        }
    }, [isInitialLoad, showTypeSelector, showOnlySaved]);

    // Refresh saved words whenever the component re-mounts (e.g., after adding a word)
    useEffect(() => {
        if (showOnlySaved) {
            const savedVocab = localStorageApi.getUserVocab();
            // Remove duplicates by word name
            const seenWords = new Set<string>();
            const uniqueWords = savedVocab.filter((sv: any) => {
                const key = sv.vocab_item.word.toLowerCase();
                if (seenWords.has(key)) {
                    return false; // Skip duplicate
                }
                seenWords.add(key);
                return true;
            });

            const savedWords = uniqueWords.map((sv: any) => ({
                ...sv.vocab_item,
                type: sv.vocab_item.tags?.[0] || 'saved',
                userVocabId: sv.id  // Keep track of the localStorage ID for removal
            }));

            // Update the display
            setAllWords(savedWords);
            setHasMoreWords(savedWords.length > WORDS_PER_PAGE);
            const firstPage = savedWords.slice(0, Math.min(WORDS_PER_PAGE, savedWords.length));
            setDisplayedWords(firstPage);
            setCurrentPage(1);

            console.log('Refreshed saved words: ' + savedWords.length + ' unique words (' + savedVocab.length + ' total)');
        }
    }, [showOnlySaved]);

    // Listen for word additions via storage events (from other components)
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'userVocab' && showOnlySaved) {
                console.log('Detected change in userVocab, refreshing...');
                setRefreshKey(prev => prev + 1);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [showOnlySaved]);

    // Refresh when refreshKey changes
    useEffect(() => {
        if (showOnlySaved && refreshKey > 0) {
            const savedVocab = localStorageApi.getUserVocab();
            const seenWords = new Set<string>();
            const uniqueWords = savedVocab.filter((sv: any) => {
                const key = sv.vocab_item.word.toLowerCase();
                if (seenWords.has(key)) {
                    return false;
                }
                seenWords.add(key);
                return true;
            });

            const savedWords = uniqueWords.map((sv: any) => ({
                ...sv.vocab_item,
                type: sv.vocab_item.tags?.[0] || 'saved',
                userVocabId: sv.id
            }));

            setAllWords(savedWords);
            setHasMoreWords(savedWords.length > WORDS_PER_PAGE);
            const firstPage = savedWords.slice(0, Math.min(WORDS_PER_PAGE, savedWords.length));
            setDisplayedWords(firstPage);
            setCurrentPage(1);

            console.log('Updated saved words after add/remove: ' + savedWords.length + ' total');
        }
    }, [refreshKey, showOnlySaved]);

    useEffect(() => {
        if (!loaderRef.current) return;
        if (!showTypeSelector && !showOnlySaved) return;

        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMoreWords && !loadingSamples) {
                    loadMorePaginatedWords();
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [hasMoreWords, loadingSamples, currentPage, allWords, showTypeSelector, showOnlySaved]);

    const loadMorePaginatedWords = useCallback(() => {
        if (loadingSamples || currentPage <= 0) return;

        setLoadingSamples(true);
        try {
            const startIdx = currentPage * WORDS_PER_PAGE;
            const endIdx = startIdx + WORDS_PER_PAGE;
            const newWords = allWords.slice(startIdx, endIdx);

            if (newWords.length === 0) {
                setHasMoreWords(false);
            } else {
                setDisplayedWords(prev => [...prev, ...newWords]);
                setCurrentPage(prev => prev + 1);
                if (endIdx >= allWords.length) {
                    setHasMoreWords(false);
                }
            }
        } catch (error) {
            console.error('Failed to load more words:', error);
        } finally {
            setLoadingSamples(false);
        }
    }, [allWords, currentPage, loadingSamples]);

    const handleToggleSave = (word: any) => {
        const wordId = `${word.word}-${word.type}`;
        const isSaved = savedWordIds.has(wordId);

        console.log('Toggling save for word:', word.word, 'isSaved:', isSaved);

        if (isSaved) {
            const savedVocab = localStorageApi.getUserVocab();
            const itemToRemove = savedVocab.find((v: any) => v.vocab_item.word === word.word);
            console.log('Removing word:', itemToRemove?.id);
            if (itemToRemove) {
                localStorageApi.removeVocab(itemToRemove.id);
            }
            setSavedWordIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(wordId);
                return newSet;
            });
        } else {
            const vocabItem: VocabItem = {
                id: wordId,
                word: word.word,
                pos: word.pos || 'noun',
                definition: word.definition || 'Definition not available',
                difficulty: word.difficulty || 'medium',
                example_corpus: '',
                ai_example: '',
                synonyms: [],
                tags: [word.type || 'word'],
                created_at: new Date().toISOString()
            };
            console.log('Saving word:', vocabItem);
            const result = localStorageApi.saveVocab(wordId, vocabItem, 'saved');
            console.log('Save result:', result);
            setSavedWordIds(prev => new Set(prev).add(wordId));
        }

        // Trigger refresh of WordClassifier
        if (onWordAdded) {
            console.log('Calling onWordAdded callback');
            onWordAdded();
        }
    };

    const loadMore = useCallback(async () => {
        dispatch(setLoading(true));
        try {
            const savedVocab = localStorageApi.getUserVocab();
            const vocabItems = savedVocab.map((sv: any) => sv.vocab_item);

            dispatch(
                addItems({
                    items: vocabItems,
                    nextCursor: null,
                }),
            );
        } catch (error) {
            console.error('Failed to load feed:', error);
        } finally {
            dispatch(setLoading(false));
        }
    }, [dispatch]);

    const convertToVocabItem = (word: any): VocabItem => {
        const wordId = `${word.word}-${word.type}`;
        return {
            id: wordId,
            word: word.word,
            pos: word.pos || 'noun',
            definition: word.definition || 'Definition not available',
            difficulty: word.difficulty || 'medium',
            example_corpus: '',
            ai_example: '',
            synonyms: [],
            tags: [word.type || 'word'],
            created_at: new Date().toISOString()
        };
    };

    return (
        <div className="w-full pb-8">
            <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
                {/* Show only saved words from localStorage */}
                {showOnlySaved && displayedWords.length > 0 && (
                    <>
                        <div className="text-center py-3 space-y-2">
                            <p className="text-text-muted text-sm font-semibold">
                                Saved: {displayedWords.length} of {allWords.length} words
                            </p>
                            {onOpenSingleWordView && (
                                <button
                                    onClick={onOpenSingleWordView}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-accent-teal text-white rounded-lg hover:bg-accent-teal/90 transition-colors font-medium text-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    View One by One
                                </button>
                            )}
                        </div>
                        {displayedWords.map((word: any) => (
                            <VocabCard
                                key={word.id || `${word.word}-${word.type}`}
                                item={word}
                                onSave={() => {
                                    // Remove from saved using the userVocabId
                                    if (word.userVocabId) {
                                        localStorageApi.removeVocab(word.userVocabId);
                                    } else {
                                        // Fallback: find by word name
                                        const savedVocab = localStorageApi.getUserVocab();
                                        const itemToRemove = savedVocab.find((v: any) => v.vocab_item.word === word.word);
                                        if (itemToRemove) {
                                            localStorageApi.removeVocab(itemToRemove.id);
                                        }
                                    }
                                    // Update displayed words
                                    setDisplayedWords(prev => prev.filter(w => w.word !== word.word));
                                    setSavedWordIds(prev => {
                                        const newSet = new Set(prev);
                                        newSet.delete(word.id || `${word.word}-${word.type}`);
                                        return newSet;
                                    });
                                }}
                                onPractice={() => onPractice(word.word)}
                                onUseInDocument={() => onUseInDocument(word.word)}
                                isLoading={false}
                                isSaved={true}
                                onOpenSingleWordView={onOpenSingleWordView}
                            />
                        ))}

                        {/* Infinite scroll loader */}
                        {hasMoreWords && (
                            <div ref={loaderRef} className="py-6 text-center">
                                <div className="inline-flex items-center gap-2">
                                    <div className="animate-spin h-4 w-4 border-2 border-accent-teal border-t-transparent rounded-full"></div>
                                    <p className="text-text-muted text-sm">Loading more words...</p>
                                </div>
                            </div>
                        )}

                        {!hasMoreWords && allWords.length > 0 && (
                            <div className="py-6 text-center">
                                <p className="text-text-muted text-sm">All {displayedWords.length} words loaded!</p>
                            </div>
                        )}
                    </>
                )}

                {/* Show only saved words - Empty state */}
                {showOnlySaved && displayedWords.length === 0 && !isInitialLoad && (
                    <div className="mx-auto text-center py-12">
                        <p className="text-text-secondary mb-4 text-lg">No saved words yet</p>
                        <p className="text-text-muted text-sm max-w-sm mx-auto">
                            Use the search button above to add words you learn from books, speeches, or anywhere else.
                        </p>
                    </div>
                )}

                {/* Dictionary Feed - Infinite scroll with pre-classified words */}
                {showTypeSelector && displayedWords.length > 0 && (
                    <>
                        {displayedWords.map((word: any, idx: number) => (
                            <div key={`${word.word}-${idx}`}>
                                {/* Type header every 5 words */}
                                {idx % WORDS_PER_PAGE === 0 && (
                                    <div className="py-3 px-2 mb-2">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                                            {word.type || 'Word'}
                                        </h3>
                                        <div className="h-0.5 bg-gradient-to-r from-accent-teal to-transparent mt-1"></div>
                                    </div>
                                )}

                                <VocabCard
                                    item={convertToVocabItem(word)}
                                    onSave={() => handleToggleSave(word)}
                                    onPractice={() => onPractice(word.word)}
                                    onUseInDocument={() => onUseInDocument(word.word)}
                                    isLoading={false}
                                    isSaved={savedWordIds.has(`${word.word}-${word.type}`)}
                                    onOpenSingleWordView={onOpenSingleWordView}
                                />
                            </div>
                        ))}

                        {/* Infinite scroll loader */}
                        {hasMoreWords && (
                            <div ref={loaderRef} className="py-6 text-center">
                                <div className="inline-flex items-center gap-2">
                                    <div className="animate-spin h-4 w-4 border-2 border-accent-teal border-t-transparent rounded-full"></div>
                                    <p className="text-text-muted text-sm">Loading more words...</p>
                                </div>
                                <p className="text-xs text-text-muted mt-2">
                                    Showing {displayedWords.length} of {allWords.length} words
                                </p>
                            </div>
                        )}

                        {!hasMoreWords && allWords.length > 0 && (
                            <div className="py-6 text-center">
                                <p className="text-text-muted text-sm">All {displayedWords.length} words loaded!</p>
                            </div>
                        )}
                    </>
                )}

                {/* Saved tab - Show vocabulary list */}
                {!showTypeSelector && !showOnlySaved && (
                    <>
                        {items.length > 0 ? (
                            items.map((item: VocabItem) => (
                                <VocabCard
                                    key={item.id}
                                    item={item}
                                    onSave={() => {
                                        // Remove from saved
                                        const savedVocab = localStorageApi.getUserVocab();
                                        const itemToRemove = savedVocab.find((v: any) => v.vocab_item.id === item.id);
                                        if (itemToRemove) {
                                            localStorageApi.removeVocab(itemToRemove.id);
                                        }

                                        // Update saved IDs
                                        setSavedWordIds(prev => {
                                            const newSet = new Set(prev);
                                            newSet.delete(item.id);
                                            return newSet;
                                        });

                                        // Remove from Redux items (display)
                                        dispatch(addItems({ items: items.filter((i: VocabItem) => i.id !== item.id), nextCursor: null }));
                                    }}
                                    onPractice={onPractice}
                                    onUseInDocument={onUseInDocument}
                                    isLoading={loading}
                                    isSaved={true}
                                    onOpenSingleWordView={onOpenSingleWordView}
                                />
                            ))
                        ) : !loading ? (
                            <div className="mx-auto text-center py-12">
                                <p className="text-text-secondary mb-6 max-w-md mx-auto">
                                    No saved words yet. Scroll in the Explore tab to find and save words.
                                </p>
                            </div>
                        ) : null}
                    </>
                )}

                {/* Loading initial state */}
                {showTypeSelector && displayedWords.length === 0 && isInitialLoad && (
                    <div className="space-y-4 py-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-warm-gray border border-warm-gray-dark rounded-card p-6 animate-pulse">
                                <div className="h-6 bg-warm-gray-dark rounded w-1/3 mb-4"></div>
                                <div className="h-4 bg-warm-gray-dark rounded w-full mb-2"></div>
                                <div className="h-4 bg-warm-gray-dark rounded w-5/6"></div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {showTypeSelector && !isInitialLoad && displayedWords.length === 0 && (
                    <div className="mx-auto text-center py-12">
                        <p className="text-text-secondary">No words available</p>
                    </div>
                )}

                {/* Loading skeleton for saved tab */}
                {!showTypeSelector && loading && (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-warm-gray border border-warm-gray-dark rounded-card p-6 animate-pulse">
                                <div className="h-6 bg-warm-gray-dark rounded w-1/3 mb-4"></div>
                                <div className="h-4 bg-warm-gray-dark rounded w-full mb-2"></div>
                                <div className="h-4 bg-warm-gray-dark rounded w-5/6"></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VocabFeed;
