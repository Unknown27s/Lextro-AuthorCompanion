/**
 * VocabFeed — Type Foundry
 *
 * Hairline-framed feed: mono saved-count header, hairline skeletons,
 * black spinners. All loading/pagination/dedupe logic preserved.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { localStorageApi } from '../api/client';
import { dictionaryService } from '../services/dictionaryService';
import { responsiveService } from '../services/responsiveService';
import { authService } from '../services/authService';
import { VocabItem } from '../types';
import VocabCard from './VocabCard';
import { colors, typeScale, spacing, frame } from '../theme';

interface VocabFeedProps {
    onPractice: (id: string) => void;
    onUseInDocument: (word: string) => void;
    onWordAdded?: () => void;
    showTypeSelector?: boolean;
    showOnlySaved?: boolean;
    listHeader?: React.ReactNode;
}

export default function VocabFeed({
    onPractice,
    onUseInDocument,
    onWordAdded,
    showTypeSelector = false,
    showOnlySaved = true,
    listHeader,
}: VocabFeedProps) {
    const [displayedWords, setDisplayedWords] = useState<VocabItem[]>([]);
    const [allWords, setAllWords] = useState<VocabItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [savedWordIds, setSavedWordIds] = useState<Set<string>>(new Set());
    const pageSize = responsiveService.getOptimalPageSize();
    const currentPageRef = useRef(1);

    useEffect(() => {
        loadInitialWords();
    }, [showOnlySaved, showTypeSelector, pageSize]);

    // Refresh saved words when storage changes
    useEffect(() => {
        if (showOnlySaved) {
            loadSavedWords();
        }
    }, [showOnlySaved, pageSize]);

    const loadSavedWords = useCallback(() => {
        try {
            const savedVocab = localStorageApi.getUserVocab();
            const seenWords = new Set<string>();
            const uniqueWords = savedVocab.filter((sv) => {
                const key = sv.vocab_item.word.toLowerCase();
                if (seenWords.has(key)) return false;
                seenWords.add(key);
                return true;
            });

            const savedWords: VocabItem[] = uniqueWords.map((sv) => ({
                ...sv.vocab_item,
                tags: sv.vocab_item.tags?.[0] ? [sv.vocab_item.tags[0]] : ['saved'],
            }));

            const wordMap = new Map<string, string>();
            savedWords.forEach((sw) => {
                const wordId = `${sw.word}-${sw.tags?.[0] || 'word'}`;
                wordMap.set(wordId, wordId);
            });
            setSavedWordIds(new Set(wordMap.values()));

            setAllWords(savedWords);
            const firstPage = savedWords.slice(0, pageSize);
            setDisplayedWords(firstPage);
            currentPageRef.current = 1;
            setHasMore(savedWords.length > pageSize);
            setIsLoading(false);

            console.log('Loaded ' + savedWords.length + ' unique saved words');
        } catch (error) {
            console.error('Failed to load saved words:', error);
            setIsLoading(false);
        }
    }, [showOnlySaved, pageSize]);

    const loadInitialWords = useCallback(() => {
        if (isLoading) return;

        if (showOnlySaved) {
            loadSavedWords();
        } else if (showTypeSelector) {
            setIsLoading(true);
            try {
                const user = authService.getCurrentUser();
                const purpose = user?.learningPurpose || 'writing';
                dictionaryService.getWordsByPurpose(purpose).then((purposeWords) => {
                    const allLoadedWords: VocabItem[] = purposeWords.map((word) => ({
                        word,
                        pos: 'noun',
                        definition: `${word} - vocabulary for ${purpose}`,
                        difficulty: 'medium',
                        example_corpus: '',
                        ai_example: '',
                        synonyms: [],
                        tags: [purpose],
                        created_at: new Date().toISOString(),
                        id: `${word}-${purpose}`,
                    }));

                    const shuffled = [...allLoadedWords].sort(() => Math.random() - 0.5);
                    setAllWords(shuffled);
                    const firstPage = shuffled.slice(0, pageSize);
                    setDisplayedWords(firstPage);
                    currentPageRef.current = 1;
                    setHasMore(shuffled.length > pageSize);
                    setIsLoading(false);
                });
            } catch (error) {
                console.error('Failed to initialize dictionary:', error);
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    }, [isLoading, showOnlySaved, showTypeSelector, pageSize, loadSavedWords]);

    const loadMore = useCallback(() => {
        if (loadingMore || !hasMore) return;

        setLoadingMore(true);
        try {
            const startIdx = (currentPageRef.current) * pageSize;
            const endIdx = startIdx + pageSize;
            const newWords = allWords.slice(startIdx, endIdx);

            if (newWords.length === 0) {
                setHasMore(false);
            } else {
                setDisplayedWords((prev) => [...prev, ...newWords]);
                currentPageRef.current += 1;
                if (endIdx >= allWords.length) {
                    setHasMore(false);
                }
            }
        } catch (error) {
            console.error('Failed to load more words:', error);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, allWords, pageSize]);

    const handleToggleSave = (word: VocabItem) => {
        const wordId = `${word.word}-${word.tags?.[0] || 'saved'}`;
        const isSaved = savedWordIds.has(wordId);

        if (isSaved) {
            const savedVocab = localStorageApi.getUserVocab();
            const itemToRemove = savedVocab.find((v) => v.vocab_item.word === word.word);
            if (itemToRemove) {
                localStorageApi.removeVocab(itemToRemove.id);
            }
            setSavedWordIds((prev) => {
                const newSet = new Set(prev);
                newSet.delete(wordId);
                return newSet;
            });
        } else {
            localStorageApi.saveVocab(wordId, word, 'saved');
            setSavedWordIds((prev) => new Set(prev).add(wordId));
        }

        if (onWordAdded) {
            onWordAdded();
        }
    };

    const handleSave = (id: string) => {
        const word = displayedWords.find((w) => w.id === id);
        if (word) {
            handleToggleSave(word);
        }
    };

    // Show saved words info header
    const renderHeader = () => {
        if (showOnlySaved && displayedWords.length > 0 && !isLoading) {
            return (
                <View style={styles.savedInfo}>
                    <Text style={styles.savedText}>
                        SAVED: {String(displayedWords.length).padStart(3, '0')} OF {String(allWords.length).padStart(3, '0')}
                    </Text>
                </View>
            );
        }
        return null;
    };

    // Show empty state
    const renderEmpty = () => {
        if (isLoading) return null;
        if (showOnlySaved && displayedWords.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyTitle}>NO SAVED WORDS</Text>
                    <Text style={styles.emptyText}>
                        Save words from reading, the editor, or the search above — they will appear here, indexed and numbered.
                    </Text>
                </View>
            );
        }
        return null;
    };

    // Show loading skeleton
    const renderLoadingSkeleton = () => {
        if (!isLoading) return null;
        return (
            <View style={styles.skeletonContainer}>
                {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.skeletonCard}>
                        <View style={[styles.skeletonLine, { width: '30%', alignSelf: 'center' }]} />
                        <View style={[styles.skeletonLine, { width: '100%', marginTop: 8 }]} />
                        <View style={[styles.skeletonLine, { width: '80%', marginTop: 4 }]} />
                    </View>
                ))}
            </View>
        );
    };

    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={styles.footer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.footerText}>LOADING MORE…</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {renderLoadingSkeleton()}
            <FlatList
                data={displayedWords}
                keyExtractor={(item) => item.id || `${item.word}-${item.tags?.[0] || 'word'}`}
                ListHeaderComponent={
                    <>
                        {listHeader}
                        {renderHeader()}
                    </>
                }
                renderItem={({ item, index }) => {
                    const entry = allWords.indexOf(item);
                    return (
                        <VocabCard
                            item={item}
                            entryNumber={entry === -1 ? index : entry}
                            onSave={handleSave}
                            onPractice={onPractice}
                            onUseInDocument={onUseInDocument}
                            isSaved={savedWordIds.has(item.id || `${item.word}-${item.tags?.[0] || 'word'}`)}
                            isLoading={false}
                        />
                    );
                }}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={renderEmpty}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 16,
    },
    savedInfo: {
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: spacing.hairline,
        borderBottomColor: colors.outlineVariant,
    },
    savedText: {
        ...typeScale.specimenIndex,
        color: colors.outline,
        letterSpacing: 1,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 48,
        paddingHorizontal: spacing.gutter,
    },
    emptyTitle: {
        ...typeScale.labelMono,
        color: colors.onSurfaceVariant,
        marginBottom: 8,
        letterSpacing: 1.5,
    },
    emptyText: {
        ...typeScale.bodySm,
        color: colors.outline,
        textAlign: 'center',
        lineHeight: 18,
    },
    skeletonContainer: {
        padding: 12,
    },
    skeletonCard: {
        backgroundColor: colors.surfaceLowest,
        borderWidth: spacing.hairline,
        borderColor: colors.outlineVariant,
        borderRadius: spacing.radius,
        padding: 16,
        marginBottom: 12,
    },
    skeletonLine: {
        height: 14,
        backgroundColor: colors.outlineFaint,
        borderRadius: 1,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    footerText: {
        ...typeScale.specimenIndex,
        color: colors.outline,
        letterSpacing: 1,
    },
});
