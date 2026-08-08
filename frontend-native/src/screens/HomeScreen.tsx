/**
 * Home Screen — Type Foundry
 *
 * Specimen-poster home: hero display word (word of the day) with POS chip,
 * PRONOUNCE / SAVE actions, hairline-ruled telemetry strip, then the
 * saved-words feed below.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as Speech from 'expo-speech';
import { RootState } from '../store';
import { localStorageApi, dictionaryApi } from '../api/client';
import { VocabItem } from '../types';
import { spacedRepetitionService, Statistics } from '../services/spacedRepetitionService';
import type { TabParamList } from '../navigation/AppNavigator';
import ScreenShell from '../components/ScreenShell';
import StreakCard from '../components/StreakCard';
import VocabFeed from '../components/VocabFeed';
import WordDetailModal from '../components/WordDetailModal';
import { colors, typeScale, spacing, frame, buttons } from '../theme';

const toPosAbbr = (pos: string): string => {
    const map: Record<string, string> = {
        adjective: 'ADJ', noun: 'NOUN', verb: 'VERB', adverb: 'ADV',
        pronoun: 'PRON', preposition: 'PREP', conjunction: 'CONJ',
        interjection: 'INTERJ', determiner: 'DET', 'proper noun': 'NOUN',
    };
    return map[pos.toLowerCase()] || pos.slice(0, 4).toUpperCase() || 'WORD';
};

export default function HomeScreen() {
    const [savedCount, setSavedCount] = useState(0);
    const [stats, setStats] = useState<Statistics>(spacedRepetitionService.getStatistics());
    const [dailyWord, setDailyWord] = useState<VocabItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [detailWord, setDetailWord] = useState<VocabItem | null>(null);
    const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();

    const loadHomeData = useCallback(async () => {
        // Load saved words count from localStorage polyfill
        const vocab = localStorageApi.getUserVocab();
        setSavedCount(vocab.length);

        // Update stats
        setStats(spacedRepetitionService.getStatistics());

        // Get a daily word (random from dictionary or first saved word)
        if (vocab.length > 0) {
            const randomItem = vocab[Math.floor(Math.random() * vocab.length)];
            setDailyWord(randomItem.vocab_item);
        } else {
            // Try to get a word from the offline dictionary
            try {
                const word = await dictionaryApi.getWord('vocabulary');
                if (word) {
                    setDailyWord(dictionaryApi.transformToVocabItem(word, 'vocabulary'));
                }
            } catch {
                // dictionary not loaded yet, skip
            }
        }

        setLoading(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadHomeData();
        }, [loadHomeData]),
    );

    const handlePronounce = () => {
        if (dailyWord) Speech.speak(dailyWord.word, { rate: 0.9 });
    };

    const handleSave = () => {
        if (!dailyWord) return;
        const exists = localStorageApi.getUserVocab().some(
            (v) => v.vocab_item.word.toLowerCase() === dailyWord.word.toLowerCase(),
        );
        if (!exists) {
            localStorageApi.saveVocab(dailyWord.id, dailyWord, 'saved');
            setSavedCount(localStorageApi.getUserVocab().length);
        }
    };

    if (loading) {
        return (
            <ScreenShell>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>[ LOADING LEXTRO ]</Text>
                </View>
            </ScreenShell>
        );
    }

    return (
        <ScreenShell>
            {/* Single scrolling page: poster + stats flow into the feed */}
            <VocabFeed
                showOnlySaved={true}
                listHeader={
                    <>
                        {/* Specimen poster */}
                        {dailyWord && (
                            <View style={styles.poster}>
                                <Text style={styles.posterOverline}>[ SPECIMEN OF THE DAY ]</Text>
                                <TouchableOpacity
                                    onPress={() => setDetailWord(dailyWord)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.posterWord}>{dailyWord.word}</Text>
                                    <Text style={styles.posterDetailHint}>[ VIEW DETAILS ]</Text>
                                </TouchableOpacity>
                                <View style={styles.posterRow}>
                                    <View style={frame.chip}>
                                        <Text style={styles.posText}>{toPosAbbr(dailyWord.pos)}</Text>
                                    </View>
                                    {dailyWord.difficulty && (
                                        <Text style={styles.posterDifficulty}>
                                            DIFF: {dailyWord.difficulty.toUpperCase()}
                                        </Text>
                                    )}
                                </View>
                                <Text style={styles.posterDefinition}>{dailyWord.definition}</Text>
                                <View style={styles.posterActions}>
                                    <TouchableOpacity
                                        style={[buttons.primary, styles.posterBtn]}
                                        onPress={handlePronounce}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={buttons.primaryText}>▶ PRONOUNCE</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[buttons.outline, styles.posterBtn]}
                                        onPress={handleSave}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={buttons.outlineText}>☆ SAVE</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Telemetry strip */}
                        <View style={styles.statsGrid}>
                            <View style={styles.statCell}>
                                <Text style={styles.statLabel}>SAVED</Text>
                                <Text style={styles.statValue}>{String(savedCount).padStart(3, '0')}</Text>
                            </View>
                            <View style={styles.statCell}>
                                <Text style={styles.statLabel}>DUE</Text>
                                <Text style={[styles.statValue, styles.statValueAccent]}>
                                    {String(stats.dueToday).padStart(3, '0')}
                                </Text>
                            </View>
                            <View style={styles.statCell}>
                                <Text style={styles.statLabel}>ACCURACY</Text>
                                <Text style={styles.statValue}>{String(stats.accuracy).padStart(3, '0')}%</Text>
                            </View>
                        </View>

                        {/* Streak card — tappable, jumps to Practice */}
                        <TouchableOpacity
                            style={styles.streakCard}
                            onPress={() => navigation.navigate('Practice')}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.streakOverline}>[ DAILY STREAK ]</Text>
                            <StreakCard variant="large" />
                        </TouchableOpacity>
                    </>
                }
                onPractice={(id) => {
                    /* Navigate to practice */
                }}
                onUseInDocument={(word) => {
                    /* Use word in document */
                }}
                onWordAdded={loadHomeData}
            />

            {/* Word Detail — full-screen view */}
            {detailWord && (
                <WordDetailModal
                    item={detailWord}
                    isSaved={localStorageApi.getUserVocab().some(
                        (v) => v.vocab_item.word.toLowerCase() === detailWord.word.toLowerCase(),
                    )}
                    onClose={() => setDetailWord(null)}
                    onSave={(id, item) => {
                        const target = item ?? detailWord;
                        const exists = localStorageApi.getUserVocab().some(
                            (v) => v.vocab_item.word.toLowerCase() === target.word.toLowerCase(),
                        );
                        if (!exists) {
                            localStorageApi.saveVocab(id, target, 'saved');
                        } else {
                            const itemToRemove = localStorageApi.getUserVocab().find(
                                (v) => v.vocab_item.word.toLowerCase() === target.word.toLowerCase(),
                            );
                            if (itemToRemove) {
                                localStorageApi.removeVocab(itemToRemove.id);
                            }
                        }
                        setSavedCount(localStorageApi.getUserVocab().length);
                    }}
                    onPractice={() => setDetailWord(null)}
                    onUseInDocument={() => setDetailWord(null)}
                />
            )}
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        ...typeScale.labelMono,
        color: colors.onSurfaceVariant,
        letterSpacing: 2,
    },
    // ── Specimen poster ─────────────────────────────────────────────────
    poster: {
        paddingHorizontal: spacing.gutter,
        paddingTop: spacing.gutter,
        paddingBottom: spacing.gutter,
        borderBottomWidth: spacing.hairline,
        borderBottomColor: colors.outline,
    },
    posterOverline: {
        ...typeScale.specimenIndex,
        color: colors.secondary,
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    posterWord: {
        ...typeScale.displayLgMobile,
        color: colors.onSurface,
        marginBottom: 12,
    },
    posterDetailHint: {
        ...typeScale.specimenIndex,
        color: colors.secondary,
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    posterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    posText: {
        ...typeScale.specimenIndex,
        color: colors.onSurfaceVariant,
        letterSpacing: 0.5,
    },
    posterDifficulty: {
        ...typeScale.specimenIndex,
        color: colors.outline,
        letterSpacing: 0.5,
    },
    posterDefinition: {
        ...typeScale.bodyLg,
        color: colors.onSurface,
        marginBottom: 20,
    },
    posterActions: {
        flexDirection: 'row',
        gap: 12,
    },
    posterBtn: {
        minWidth: 140,
        alignItems: 'center',
    },
    // ── Telemetry strip ─────────────────────────────────────────────────
    statsGrid: {
        flexDirection: 'row',
        borderBottomWidth: spacing.hairline,
        borderBottomColor: colors.outline,
    },
    statCell: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: spacing.gutter,
        alignItems: 'center',
        borderRightWidth: spacing.hairline,
        borderRightColor: colors.outlineVariant,
    },
    statLabel: {
        ...typeScale.specimenIndex,
        color: colors.outline,
        letterSpacing: 1,
        marginBottom: 6,
    },
    statValue: {
        ...typeScale.headlineSm,
        color: colors.onSurface,
    },
    statValueAccent: {
        color: colors.secondary,
    },
    // ── Streak card ──────────────────────────────────────────────────────
    streakCard: {
        paddingHorizontal: spacing.gutter,
        paddingVertical: 20,
        borderBottomWidth: spacing.hairline,
        borderBottomColor: colors.outline,
    },
    streakOverline: {
        ...typeScale.specimenIndex,
        color: colors.outline,
        letterSpacing: 1.5,
        marginBottom: 10,
    },
});
