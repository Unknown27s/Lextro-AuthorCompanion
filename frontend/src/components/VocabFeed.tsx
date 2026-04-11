import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { setLoading, addItems } from '../store/feedSlice';
import { localStorageApi, VocabItem } from '../api/client';
import { dictionaryService } from '../services/dictionaryService';
import { responsiveService } from '../services/responsiveService';
import { authService } from '../services/authService';
import VocabCard from './VocabCard';
import InlineWordSuggestion from './InlineWordSuggestion';

interface VocabFeedProps {
    onPractice: (id: string) => void;
    onUseInDocument: (id: string) => void;
    onWordAdded?: () => void;
    showTypeSelector?: boolean;
    showOnlySaved?: boolean;
}

const VocabFeed: React.FC<VocabFeedProps> = ({
    onPractice,
    onUseInDocument,
    onWordAdded,
    showTypeSelector = false,
    showOnlySaved = true,
}) => {
    const dispatch = useDispatch<AppDispatch>();
    const { items, loading } = useSelector((state: RootState) => state.feed);
    const loaderRef = useRef<HTMLDivElement>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [loadingSamples, setLoadingSamples] = useState(false);
    const [savedWordIds, setSavedWordIds] = useState<Set<string>>(new Set());
    const [displayedWords, setDisplayedWords] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMoreWords, setHasMoreWords] = useState(true);
    const [allWords, setAllWords] = useState<any[]>([]);
    const pageSize = responsiveService.getOptimalPageSize(); // Dynamic based on device

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
                // Show only saved words
                try {
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
                    setHasMoreWords(savedWords.length > pageSize);

                    const firstPage = savedWords.slice(0, pageSize);
                    setDisplayedWords(firstPage);
                    setCurrentPage(1);
                    setIsInitialLoad(false);

                    console.log('Loaded ' + savedWords.length + ' unique saved words');
                } catch (error) {
                    console.error('Failed to load saved words:', error);
                    setIsInitialLoad(false);
                }
            } else if (showTypeSelector) {
                // Load from dictionary
                try {
                    const user = authService.getCurrentUser();
                    const purpose = user?.learningPurpose || 'writing';
                    dictionaryService.getWordsByPurpose(purpose).then(purposeWords => {
                        const allLoadedWords: any[] = purposeWords.map(word => ({
                            word,
                            type: purpose,
                            pos: 'noun',
                            definition: `${word} - vocabulary for ${purpose}`,
                            difficulty: 'medium'
                        }));

                        const shuffled = allLoadedWords.sort(() => Math.random() - 0.5);
                        setAllWords(shuffled);
                        setHasMoreWords(shuffled.length > pageSize);

                        const firstPage = shuffled.slice(0, pageSize);
                        setDisplayedWords(firstPage);
                        setCurrentPage(1);
                        setIsInitialLoad(false);
                    });
                } catch (error) {
                    console.error('Failed to initialize dictionary:', error);
                    setIsInitialLoad(false);
                }
            } else {
                loadMore();
                setIsInitialLoad(false);
            }
        }
    }, [isInitialLoad, showTypeSelector, showOnlySaved, pageSize]);

    // Refresh saved words on changes
    useEffect(() => {
        if (showOnlySaved) {
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
            setHasMoreWords(savedWords.length > pageSize);
            const firstPage = savedWords.slice(0, Math.min(pageSize, savedWords.length));
            setDisplayedWords(firstPage);
            setCurrentPage(1);

            console.log('Refreshed saved words: ' + savedWords.length);
        }
    }, [showOnlySaved, pageSize]);

    // Infinite scroll with Intersection Observer
    useEffect(() => {
        if (!loaderRef.current) return;

        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMoreWords && !loadingSamples) {
                    loadMorePaginatedWords();
                }
            },
            { threshold: 0.3 } // Trigger when 30% visible
        );

        observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [hasMoreWords, loadingSamples, currentPage, allWords, pageSize]);

    const loadMorePaginatedWords = useCallback(() => {
        if (loadingSamples || currentPage <= 0) return;

        setLoadingSamples(true);
        try {
            const startIdx = currentPage * pageSize;
            const endIdx = startIdx + pageSize;
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
    }, [allWords, currentPage, pageSize, loadingSamples]);

    const handleToggleSave = (word: any) => {
        const wordId = `${word.word}-${word.type}`;
        const isSaved = savedWordIds.has(wordId);

        if (isSaved) {
            const savedVocab = localStorageApi.getUserVocab();
            const itemToRemove = savedVocab.find((v: any) => v.vocab_item.word === word.word);
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
            localStorageApi.saveVocab(wordId, vocabItem, 'saved');
            setSavedWordIds(prev => new Set(prev).add(wordId));
        }

        if (onWordAdded) {
            onWordAdded();
        }
    };

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

    return (
        <div className="w-full pb-8">
            <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
                {/* Show only saved words */}
                {showOnlySaved && displayedWords.length > 0 && (
                    <>
                        <div className="text-center py-3 space-y-2">
                            <p className="text-text-muted text-sm font-semibold">
                                Saved: {displayedWords.length} of {allWords.length} words
                            </p>
                        </div>
                        {displayedWords.map((word: any) => (
                            <VocabCard
                                key={word.id || `${word.word}-${word.type}`}
                                item={word}
                                onSave={() => {
                                    if (word.userVocabId) {
                                        localStorageApi.removeVocab(word.userVocabId);
                                    } else {
                                        const savedVocab = localStorageApi.getUserVocab();
                                        const itemToRemove = savedVocab.find((v: any) => v.vocab_item.word === word.word);
                                        if (itemToRemove) {
                                            localStorageApi.removeVocab(itemToRemove.id);
                                        }
                                    }
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

                {/* Empty state */}
                {showOnlySaved && displayedWords.length === 0 && !isInitialLoad && (
                    <div className="mx-auto text-center py-12">
                        <p className="text-text-secondary mb-4 text-lg">No saved words yet</p>
                        <p className="text-text-muted text-sm max-w-sm mx-auto">
                            Use the search above to add words you learn from books, speeches, or anywhere else.
                        </p>
                    </div>
                )}

                {/* Loading skeleton */}
                {showOnlySaved && displayedWords.length === 0 && isInitialLoad && (
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
            </div>
        </div>
    );
};

export default VocabFeed;
