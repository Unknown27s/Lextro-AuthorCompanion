/**
 * WordDetailModal — Type Foundry
 *
 * Full-screen Word Detail view: giant headword + [ENTRY. NNNN] index,
 * corner-ticked definition box, numbered spec-sheet rows
 * (01. PRONUNCIATION · 02. CLASSIFICATION · 03. DIFFICULTY · 04. SYNONYMS ·
 * 05. ANTONYMS · 06. RELATED · 07. FIRST SEEN · 08. EXAMPLES), and
 * SAVE / PRACTICE / USE actions. Opened full-screen (covers tab bar).
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
} from 'react-native';
import * as Speech from 'expo-speech';
import { VocabItem } from '../types';
import { useResponsive } from '../services/responsiveService';
import { dictionaryService } from '../services/dictionaryService';
import { sqliteService } from '../services/sqliteService';
import { colors, fonts, typeScale, spacing, frame, buttons } from '../theme';

interface WordDetailModalProps {
    item: VocabItem;
    entryNumber?: number;
    isSaved?: boolean;
    onClose: () => void;
    onSave: (id: string, item?: VocabItem) => void;
    onPractice?: (id: string) => void;
    onUseInDocument?: (id: string) => void;
}

const toPosAbbr = (pos: string): string => {
    const map: Record<string, string> = {
        adjective: 'ADJ', noun: 'NOUN', verb: 'VERB', adverb: 'ADV',
        pronoun: 'PRON', preposition: 'PREP', conjunction: 'CONJ',
        interjection: 'INTERJ', determiner: 'DET', 'proper noun': 'NOUN',
    };
    return map[pos.toLowerCase()] || pos.slice(0, 4).toUpperCase() || 'WORD';
};

const getFormattedDate = (dateStr: string): string => {
    try {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'TODAY';
        if (date.toDateString() === yesterday.toDateString()) return 'YESTERDAY';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
    } catch {
        return 'UNKNOWN';
    }
};

export default function WordDetailModal({
    item,
    entryNumber,
    isSaved = false,
    onClose,
    onSave,
    onPractice,
    onUseInDocument,
}: WordDetailModalProps) {
    const { isNarrow } = useResponsive();
    const [displayItem, setDisplayItem] = useState(item);
    const [saved, setSaved] = useState(isSaved);
    const [similarWords, setSimilarWords] = useState<string[]>([]);

    useEffect(() => {
        setDisplayItem(item);
        setSaved(isSaved);
        const headword = item.word;
        let cancelled = false;
        dictionaryService
            .searchByPrefix(headword, 12)
            .then((words) => {
                if (cancelled) return;
                setSimilarWords(
                    words
                        .filter((w) => w.toLowerCase() !== headword.toLowerCase())
                        .slice(0, 8),
                );
            })
            .catch(() => {
                if (!cancelled) setSimilarWords([]);
            });
        return () => {
            cancelled = true;
        };
    }, [item, isSaved]);

    const openWord = useCallback(async (word: string) => {
        const row = await sqliteService.getWord(word);
        if (row) {
            setDisplayItem({
                id: row.word.toLowerCase(),
                word: row.word,
                pos: row.pos || 'word',
                difficulty: (row.difficulty as VocabItem['difficulty']) || 'medium',
                definition: row.definition,
                example_corpus: row.example_corpus,
                ai_example: row.ai_example,
                synonyms: row.synonyms,
                antonyms: row.antonyms,
                tags: row.tags,
                created_at: row.created_at,
            });
        } else {
            setDisplayItem({
                id: word.toLowerCase(),
                word,
                pos: 'word',
                difficulty: 'medium',
                definition: '',
                example_corpus: '',
                ai_example: '',
                synonyms: [],
                tags: [],
                created_at: '',
            });
        }
        setSaved(false);
    }, []);

    const handlePronounce = useCallback(() => {
        Speech.speak(displayItem.word, { rate: 0.9 });
    }, [displayItem.word]);

    const handleSave = () => {
        setSaved((prev) => !prev);
        onSave(displayItem.id, displayItem);
    };

    const entryIndex = entryNumber !== undefined ? entryNumber : 0;
    const entryLabel = `[ENTRY. ${String(entryIndex + 1).padStart(4, '0')}]`;

    return (
        <Modal
            visible
            transparent={false}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Top bar */}
                <View style={styles.topBar}>
                    <Text style={styles.topBarTitle}>{entryLabel}</Text>
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.closeBtn}
                        accessibilityLabel="Close word details"
                        activeOpacity={0.8}
                    >
                        <Text style={styles.closeBtnText}>✕ CLOSE</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Giant headword */}
                    <Text
                        style={[styles.headword, isNarrow && styles.headwordNarrow]}
                        numberOfLines={2}
                        adjustsFontSizeToFit
                    >
                        {displayItem.word}
                    </Text>

                    {/* Meta chips row */}
                    <View style={styles.metaRow}>
                        <View style={frame.chip}>
                            <Text style={styles.metaChipText}>{toPosAbbr(displayItem.pos)}</Text>
                        </View>
                        <Text style={styles.difficultyText}>
                            DIFF: {displayItem.difficulty.toUpperCase()}
                        </Text>
                        {displayItem.created_at ? (
                            <Text style={styles.firstSeenText}>
                                FIRST SEEN: {getFormattedDate(displayItem.created_at)}
                            </Text>
                        ) : null}
                    </View>

                    {/* Corner-ticked definition box */}
                    <View style={styles.definitionBox}>
                        <View style={[styles.corner, styles.cornerTL]} />
                        <View style={[styles.corner, styles.cornerTR]} />
                        <View style={[styles.corner, styles.cornerBL]} />
                        <View style={[styles.corner, styles.cornerBR]} />
                        <Text style={styles.definitionLabel}>DEFINITION</Text>
                        <Text style={styles.definition}>{displayItem.definition}</Text>
                        {displayItem.example_corpus ? (
                            <Text style={styles.corpusQuote}>“{displayItem.example_corpus}”</Text>
                        ) : null}
                    </View>

                    {/* Spec-sheet rows */}
                    <View style={styles.specSheet}>
                        {/* 01. Pronunciation */}
                        <View style={styles.specRow}>
                            <Text style={styles.specIndex}>01.</Text>
                            <Text style={styles.specLabel}>PRONUNCIATION</Text>
                            <TouchableOpacity
                                onPress={handlePronounce}
                                style={styles.specActionBtn}
                                accessibilityLabel={`Pronounce ${displayItem.word}`}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.specActionText}>▶ SPEAK</Text>
                            </TouchableOpacity>
                        </View>

                        {/* 02. Classification */}
                        <View style={styles.specRow}>
                            <Text style={styles.specIndex}>02.</Text>
                            <Text style={styles.specLabel}>CLASSIFICATION</Text>
                            <Text style={styles.specValue}>{displayItem.pos.toUpperCase() || 'N/A'}</Text>
                        </View>

                        {/* 03. Difficulty */}
                        <View style={styles.specRow}>
                            <Text style={styles.specIndex}>03.</Text>
                            <Text style={styles.specLabel}>DIFFICULTY</Text>
                            <Text style={styles.specValue}>{displayItem.difficulty.toUpperCase()}</Text>
                        </View>

                        {/* 04. Synonyms */}
                        <View style={styles.specRow}>
                            <Text style={styles.specIndex}>04.</Text>
                            <Text style={styles.specLabel}>SYNONYMS</Text>
                            <Text style={styles.specValue}>
                                {displayItem.synonyms.length > 0 ? displayItem.synonyms.join(' · ') : '—'}
                            </Text>
                        </View>

                        {/* 05. Antonyms */}
                        <View style={styles.specRow}>
                            <Text style={styles.specIndex}>05.</Text>
                            <Text style={styles.specLabel}>ANTONYMS</Text>
                            <Text style={styles.specValue}>
                                {displayItem.antonyms && displayItem.antonyms.length > 0
                                    ? displayItem.antonyms.join(' · ')
                                    : '—'}
                            </Text>
                        </View>

                        {/* 06. Related words */}
                        <View style={styles.specRow}>
                            <Text style={styles.specIndex}>06.</Text>
                            <Text style={styles.specLabel}>RELATED</Text>
                            {similarWords.length > 0 ? (
                                <View style={styles.similarWrap}>
                                    {similarWords.map((w) => (
                                        <TouchableOpacity
                                            key={w}
                                            onPress={() => openWord(w)}
                                            style={styles.similarChip}
                                            accessibilityLabel={`Open ${w}`}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.similarChipText}>{w}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : (
                                <Text style={styles.specValue}>
                                    {displayItem.relatedWords && displayItem.relatedWords.length > 0
                                        ? displayItem.relatedWords.join(' · ')
                                        : '—'}
                                </Text>
                            )}
                        </View>

                        {/* 07. First seen */}
                        <View style={styles.specRow}>
                            <Text style={styles.specIndex}>07.</Text>
                            <Text style={styles.specLabel}>FIRST SEEN</Text>
                            <Text style={styles.specValue}>
                                {displayItem.created_at ? getFormattedDate(displayItem.created_at) : '—'}
                            </Text>
                        </View>
                    </View>

                    {/* 08. Examples */}
                    {(displayItem.example_corpus || displayItem.ai_example) ? (
                        <View style={styles.examplesSection}>
                            <Text style={styles.examplesLabel}>08. EXAMPLES</Text>
                            {displayItem.example_corpus ? (
                                <View style={styles.exampleBlock}>
                                    <Text style={styles.exampleQuote}>“{displayItem.example_corpus}”</Text>
                                </View>
                            ) : null}
                            {displayItem.ai_example ? (
                                <View style={styles.exampleBlock}>
                                    <Text style={styles.exampleQuote}>“{displayItem.ai_example}”</Text>
                                    <View style={[frame.chip, styles.voiceBadge]}>
                                        <Text style={styles.voiceBadgeText}>IN YOUR VOICE</Text>
                                    </View>
                                </View>
                            ) : null}
                        </View>
                    ) : null}
                </ScrollView>

                {/* Action bar */}
                <View style={styles.actionBar}>
                    <TouchableOpacity
                        onPress={() => onPractice?.(displayItem.id)}
                        style={[buttons.primary, styles.actionBtn]}
                        activeOpacity={0.8}
                    >
                        <Text style={buttons.primaryText}>▶ PRACTICE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleSave}
                        style={[
                            styles.actionBtn,
                            styles.outlineBtn,
                            saved && styles.saveBtnActive,
                        ]}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.outlineBtnText, saved && styles.saveTextActive]}>
                            {saved ? '★ SAVED' : '☆ SAVE'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => onUseInDocument?.(displayItem.id)}
                        style={[styles.actionBtn, styles.outlineBtn]}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.outlineBtnText}>USE</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
        paddingTop: 16,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.gutter,
        paddingBottom: 12,
        borderBottomWidth: spacing.hairline,
        borderBottomColor: colors.outline,
    },
    topBarTitle: {
        ...typeScale.specimenIndex,
        color: colors.secondary,
        letterSpacing: 1.5,
    },
    closeBtn: {
        borderWidth: spacing.hairline,
        borderColor: colors.outline,
        borderRadius: spacing.radius,
        backgroundColor: colors.surfaceLowest,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    closeBtnText: {
        ...typeScale.labelMono,
        color: colors.onSurface,
        letterSpacing: 0.5,
    },
    scrollContent: {
        paddingHorizontal: spacing.gutter,
        paddingBottom: 24,
    },
    headword: {
        ...typeScale.displayLg,
        color: colors.onSurface,
        marginTop: 20,
        marginBottom: 12,
    },
    headwordNarrow: {
        ...typeScale.displayLgMobile,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
        flexWrap: 'wrap',
    },
    metaChipText: {
        ...typeScale.specimenIndex,
        color: colors.onSurfaceVariant,
        letterSpacing: 0.5,
    },
    difficultyText: {
        ...typeScale.specimenIndex,
        color: colors.outline,
        letterSpacing: 0.5,
    },
    firstSeenText: {
        ...typeScale.specimenIndex,
        color: colors.outline,
        letterSpacing: 0.5,
    },
    definitionBox: {
        backgroundColor: colors.surfaceLowest,
        borderWidth: spacing.hairline,
        borderColor: colors.outline,
        padding: 20,
        marginBottom: 20,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderColor: colors.secondary,
        borderWidth: 2,
    },
    cornerTL: { top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0 },
    cornerTR: { top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0 },
    cornerBL: { bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0 },
    cornerBR: { bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0 },
    definitionLabel: {
        ...typeScale.specimenIndex,
        color: colors.secondary,
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    definition: {
        ...typeScale.bodyLg,
        color: colors.onSurface,
        lineHeight: 26,
        marginBottom: 12,
    },
    corpusQuote: {
        ...typeScale.bodySm,
        color: colors.onSurfaceVariant,
        fontStyle: 'italic',
        lineHeight: 20,
    },
    specSheet: {
        backgroundColor: colors.surfaceLowest,
        borderWidth: spacing.hairline,
        borderColor: colors.outline,
        marginBottom: 20,
    },
    specRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: spacing.hairline,
        borderBottomColor: colors.outlineVariant,
        gap: 12,
    },
    specIndex: {
        ...typeScale.specimenIndex,
        color: colors.secondary,
        letterSpacing: 1,
        width: 28,
    },
    specLabel: {
        ...typeScale.labelMonoRegular,
        color: colors.outline,
        letterSpacing: 0.5,
        flex: 1,
    },
    specValue: {
        ...typeScale.bodySmMedium,
        color: colors.onSurface,
        flex: 1.4,
        textAlign: 'right',
    },
    similarWrap: {
        flex: 1.4,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: 6,
    },
    similarChip: {
        borderWidth: spacing.hairline,
        borderColor: colors.outline,
        borderRadius: spacing.radius,
        backgroundColor: colors.surface,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    similarChipText: {
        ...typeScale.labelMono,
        color: colors.secondary,
        letterSpacing: 0.5,
    },
    specActionBtn: {
        borderWidth: spacing.hairline,
        borderColor: colors.outline,
        borderRadius: spacing.radius,
        backgroundColor: colors.surface,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    specActionText: {
        ...typeScale.labelMono,
        color: colors.secondary,
        letterSpacing: 0.5,
    },
    examplesSection: {
        backgroundColor: colors.surfaceLowest,
        borderWidth: spacing.hairline,
        borderColor: colors.outline,
        padding: 16,
        marginBottom: 20,
    },
    examplesLabel: {
        ...typeScale.specimenIndex,
        color: colors.secondary,
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    exampleBlock: {
        marginBottom: 12,
    },
    exampleQuote: {
        ...typeScale.bodySm,
        color: colors.onSurface,
        fontStyle: 'italic',
        lineHeight: 20,
    },
    voiceBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.surface,
        marginTop: 6,
    },
    voiceBadgeText: {
        ...typeScale.specimenIndex,
        color: colors.onSurfaceVariant,
        letterSpacing: 0.5,
    },
    actionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: spacing.gutter,
        backgroundColor: colors.surfaceLowest,
        borderTopWidth: spacing.hairline,
        borderTopColor: colors.outline,
        flexWrap: 'wrap',
    },
    actionBtn: {
        minWidth: 110,
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    outlineBtn: {
        borderWidth: spacing.hairline,
        borderColor: colors.outline,
        backgroundColor: colors.surfaceLowest,
        borderRadius: spacing.radius,
    },
    outlineBtnText: {
        ...typeScale.labelMono,
        color: colors.onSurface,
    },
    saveBtnActive: {
        borderColor: colors.secondary,
        backgroundColor: colors.selectedContainer,
    },
    saveTextActive: {
        color: colors.secondary,
    },
});
