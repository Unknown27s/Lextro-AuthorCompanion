/**
 * VocabCard — Type Foundry
 *
 * Spec-sheet card: 1px hairline frame, zero shadows, mono uppercase labels,
 * square buttons, numbered specimen rows. All interactions preserved.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import * as Speech from 'expo-speech';
import { VocabItem } from '../types';
import { useResponsive } from '../services/responsiveService';
import { colors, fonts, typeScale, spacing, frame } from '../theme';
import WordDetailModal from './WordDetailModal';

interface VocabCardProps {
    item: VocabItem;
    entryNumber?: number;
    onSave: (id: string) => void;
    onPractice: (id: string) => void;
    onUseInDocument: (id: string) => void;
    onSynonymClick?: (word: string) => void;
    source?: 'offline' | 'cache' | 'online';
    isSaved?: boolean;
    isLoading?: boolean;
}

const difficultyDots: Record<VocabItem['difficulty'], number> = {
    easy: 1,
    medium: 3,
    hard: 5,
};

// Source badge config — hairline chips with mono text (no emoji)
const sourceBadgeConfig: Record<NonNullable<VocabCardProps['source']>, { label: string }> = {
    offline: { label: 'OFFLINE' },
    cache: { label: 'CACHE' },
    online: { label: 'ONLINE' },
};

function VocabCard({
    item,
    entryNumber,
    onSave,
    onPractice,
    onUseInDocument,
    onSynonymClick,
    source,
    isSaved = false,
    isLoading = false,
}: VocabCardProps) {
    const { isNarrow } = useResponsive();
    const [expanded, setExpanded] = useState(false);
    const [saved, setSaved] = useState(isSaved);
    const [showSaveToast, setShowSaveToast] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showSaveMenu, setShowSaveMenu] = useState(false);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(
        () => () => {
            if (toastTimer.current) clearTimeout(toastTimer.current);
        },
        [],
    );

    const handleSave = () => {
        setShowSaveMenu(true);
    };

    const handleSaveMenuConfirm = (category: string) => {
        setSaved(!saved);
        onSave(item.id);
        setShowSaveToast(true);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setShowSaveToast(false), 1500);
    };

    const handlePronounce = () => {
        Speech.speak(item.word, { rate: 0.9 });
    };

    const getFormattedDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (date.toDateString() === today.toDateString()) {
                return 'TODAY';
            } else if (date.toDateString() === yesterday.toDateString()) {
                return 'YESTERDAY';
            } else {
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
            }
        } catch {
            return 'UNKNOWN';
        }
    };

    const getSourceBadge = () => {
        if (saved || !source) return null;
        const config = sourceBadgeConfig[source || 'online'];
        return (
            <View style={[styles.sourceBadge, frame.chip]}>
                <Text style={styles.sourceBadgeText}>{config.label}</Text>
            </View>
        );
    };

    return (
        <View style={styles.card}>
            {/* Word header */}
            <View style={styles.wordHeader}>
                <View style={styles.wordRow}>
                    <Text style={[styles.wordTitle, isNarrow && styles.wordTitleNarrow]}>{item.word}</Text>
                    <TouchableOpacity
                        onPress={handlePronounce}
                        style={styles.pronounceBtn}
                        accessibilityLabel={`Pronounce ${item.word}`}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.pronounceIcon}>▶</Text>
                    </TouchableOpacity>
                </View>

                {/* POS + difficulty + source */}
                <View style={styles.tagRow}>
                    {item.pos && (
                        <View style={frame.chip}>
                            <Text style={styles.posTagText}>{item.pos.toUpperCase()}</Text>
                        </View>
                    )}
                    <View style={styles.difficultyRow}>
                        {[...Array(5)].map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.difficultyDot,
                                    i < difficultyDots[item.difficulty]
                                        ? styles.difficultyDotActive
                                        : styles.difficultyDotInactive,
                                ]}
                            />
                        ))}
                    </View>
                    {getSourceBadge()}
                </View>
            </View>

            {/* Definition */}
            <Text style={styles.definition}>
                {item.definition}
            </Text>

            {/* Synonyms row */}
            {item.synonyms && item.synonyms.length > 0 && (
                <View style={styles.synonymsSection}>
                    <Text style={styles.synonymsLabel}>RELATED:</Text>
                    <View style={styles.synonymsRow}>
                        {item.synonyms.slice(0, expanded ? undefined : 2).map((syn) => (
                            <TouchableOpacity
                                key={syn}
                                onPress={() => onSynonymClick?.(syn)}
                                style={[styles.synonymBtn, frame.chip]}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.synonymText}>{syn}</Text>
                            </TouchableOpacity>
                        ))}
                        {item.synonyms.length > 2 && !expanded && (
                            <TouchableOpacity
                                onPress={() => setExpanded(true)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.expandBtn}>+{item.synonyms.length - 2}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            {/* Examples (collapsible) */}
            {expanded && (item.example_corpus || item.ai_example) && (
                <View style={styles.examplesSection}>
                    <Text style={styles.examplesLabel}>EXAMPLES:</Text>
                    {item.example_corpus && (
                        <Text style={styles.exampleText}>"{item.example_corpus}"</Text>
                    )}
                    {item.ai_example && (
                        <View style={styles.aiExampleContainer}>
                            <Text style={styles.exampleText}>"{item.ai_example}"</Text>
                            <View style={[styles.aiBadge, frame.chip]}>
                                <Text style={styles.aiBadgeText}>IN YOUR VOICE</Text>
                            </View>
                        </View>
                    )}
                </View>
            )}

            {/* Action buttons */}
            <View style={styles.actionRow}>
                <TouchableOpacity
                    onPress={() => onPractice(item.id)}
                    style={[styles.actionBtn, styles.practiceBtn]}
                    accessibilityLabel="Practice this word"
                    activeOpacity={0.8}
                >
                    <Text style={styles.practiceBtnText}>▶ PRACTICE</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setShowDetailsModal(true)}
                    style={[styles.actionBtn, styles.outlineBtn]}
                    accessibilityLabel="View detailed information"
                    activeOpacity={0.8}
                >
                    <Text style={styles.outlineBtnText}>DETAILS</Text>
                </TouchableOpacity>

                {/* Save Button */}
                <TouchableOpacity
                    onPress={handleSave}
                    style={[
                        styles.actionBtn,
                        styles.outlineBtn,
                        saved && styles.saveBtnActive,
                    ]}
                    accessibilityLabel={saved ? 'Unsave word' : 'Save word'}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.outlineBtnText, saved && styles.saveTextActive]}>
                        {saved ? '★ SAVED' : '☆ SAVE'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => onUseInDocument(item.id)}
                    style={[styles.actionBtn, styles.outlineBtn]}
                    accessibilityLabel="Use in document"
                    activeOpacity={0.8}
                >
                    <Text style={styles.outlineBtnText}>USE</Text>
                </TouchableOpacity>

                {!expanded && (item.example_corpus || item.ai_example) && (
                    <TouchableOpacity
                        onPress={() => setExpanded(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.examplesExpandBtn}>EXAMPLES</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Date Added Footer */}
            {item.created_at && (
                <View style={styles.dateFooter}>
                    <Text style={styles.dateText}>ADDED: {getFormattedDate(item.created_at)}</Text>
                </View>
            )}

            {/* Save Feedback Toast */}
            {showSaveToast && (
                <View style={styles.toast}>
                    <Text style={styles.toastText}>{saved ? '✓ SAVED' : '✗ REMOVED'}</Text>
                </View>
            )}

            {/* Word Details — full-screen modal */}
            {showDetailsModal && (
                <WordDetailModal
                    item={item}
                    entryNumber={entryNumber}
                    isSaved={saved}
                    onClose={() => setShowDetailsModal(false)}
                    onSave={(id) => {
                        setSaved(!saved);
                        onSave(id);
                    }}
                    onPractice={(id) => {
                        setShowDetailsModal(false);
                        onPractice(id);
                    }}
                    onUseInDocument={(id) => {
                        setShowDetailsModal(false);
                        onUseInDocument(id);
                    }}
                />
            )}

            {/* Save Menu Modal */}
            <Modal
                visible={showSaveMenu}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSaveMenu(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>[SAVE. {item.word.toUpperCase()}]</Text>
                        <TouchableOpacity
                            onPress={() => {
                                handleSaveMenuConfirm('vocab');
                                setShowSaveMenu(false);
                            }}
                            style={styles.modalOption}
                        >
                            <Text style={styles.modalOptionText}>SAVE TO VOCABULARY</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                handleSaveMenuConfirm('practice');
                                setShowSaveMenu(false);
                            }}
                            style={styles.modalOption}
                        >
                            <Text style={styles.modalOptionText}>ADD TO PRACTICE</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setShowSaveMenu(false)}
                            style={styles.modalOption}
                        >
                            <Text style={styles.modalOptionTextCancel}>CANCEL</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

export default React.memo(VocabCard);

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surfaceLowest,
        borderWidth: spacing.hairline,
        borderColor: colors.outline,
        borderRadius: spacing.radius,
        padding: 16,
        marginHorizontal: spacing.gutter,
        marginBottom: 12,
    },
    wordHeader: {
        alignItems: 'center',
        marginBottom: 12,
        gap: 4,
    },
    wordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    wordTitle: {
        ...typeScale.headlineSm,
        color: colors.onSurface,
        textAlign: 'center',
        flexShrink: 1,
    },
    wordTitleNarrow: {
        fontSize: 20,
    },
    pronounceBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: spacing.hairline,
        borderColor: colors.outline,
        borderRadius: spacing.radius,
        backgroundColor: colors.surfaceLowest,
    },
    pronounceIcon: {
        fontFamily: fonts.mono,
        fontSize: 14,
        color: colors.onSurface,
    },
    tagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    posTagText: {
        ...typeScale.specimenIndex,
        color: colors.onSurfaceVariant,
        letterSpacing: 0.5,
    },
    difficultyRow: {
        flexDirection: 'row',
        gap: 2,
    },
    difficultyDot: {
        width: 4,
        height: 4,
        borderRadius: 1,
    },
    difficultyDotActive: {
        backgroundColor: colors.primary,
    },
    difficultyDotInactive: {
        backgroundColor: colors.outlineVariant,
    },
    sourceBadge: {
        backgroundColor: colors.surfaceLowest,
    },
    sourceBadgeText: {
        ...typeScale.specimenIndex,
        color: colors.onSurfaceVariant,
        letterSpacing: 0.5,
    },
    definition: {
        ...typeScale.bodySm,
        color: colors.onSurface,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    synonymsSection: {
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    synonymsLabel: {
        ...typeScale.specimenIndex,
        color: colors.outline,
        marginBottom: 6,
        letterSpacing: 1,
    },
    synonymsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        alignItems: 'center',
    },
    synonymBtn: {
        backgroundColor: colors.surface,
    },
    synonymText: {
        ...typeScale.labelMonoRegular,
        color: colors.onSurface,
    },
    expandBtn: {
        ...typeScale.labelMono,
        color: colors.secondary,
    },
    examplesSection: {
        marginBottom: 12,
        paddingHorizontal: 8,
        borderLeftWidth: 2,
        borderLeftColor: colors.secondary,
    },
    examplesLabel: {
        ...typeScale.specimenIndex,
        color: colors.outline,
        marginBottom: 4,
        letterSpacing: 1,
    },
    exampleText: {
        ...typeScale.bodySm,
        color: colors.onSurface,
        fontStyle: 'italic',
        lineHeight: 18,
        marginBottom: 4,
    },
    aiExampleContainer: {
        marginTop: 4,
    },
    aiBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.surface,
        marginTop: 2,
    },
    aiBadgeText: {
        ...typeScale.specimenIndex,
        color: colors.onSurfaceVariant,
        letterSpacing: 0.5,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingTop: 12,
        borderTopWidth: spacing.hairline,
        borderTopColor: colors.outlineVariant,
        flexWrap: 'wrap',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: spacing.radius,
    },
    practiceBtn: {
        backgroundColor: colors.primary,
        borderWidth: spacing.hairline,
        borderColor: colors.primary,
    },
    practiceBtnText: {
        ...typeScale.labelMono,
        color: colors.onPrimary,
    },
    outlineBtn: {
        borderWidth: spacing.hairline,
        borderColor: colors.outline,
        backgroundColor: colors.surfaceLowest,
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
    examplesExpandBtn: {
        ...typeScale.labelMono,
        color: colors.secondary,
        marginLeft: 'auto',
    },
    dateFooter: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: spacing.hairline,
        borderTopColor: colors.outlineVariant,
    },
    dateText: {
        ...typeScale.specimenIndex,
        color: colors.outline,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    toast: {
        position: 'absolute',
        bottom: 60,
        left: '50%',
        transform: [{ translateX: -50 }],
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: spacing.radius,
    },
    toastText: {
        ...typeScale.labelMono,
        color: colors.onPrimary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalContent: {
        backgroundColor: colors.surfaceLowest,
        borderRadius: spacing.radius,
        borderWidth: spacing.hairline,
        borderColor: colors.outline,
        padding: 24,
        marginHorizontal: 24,
        maxWidth: 320,
        width: '85%',
    },
    modalTitle: {
        ...typeScale.labelMono,
        color: colors.onSurface,
        marginBottom: 16,
        textAlign: 'center',
        letterSpacing: 1,
    },
    modalOption: {
        paddingVertical: 12,
        borderBottomWidth: spacing.hairline,
        borderBottomColor: colors.outlineVariant,
    },
    modalOptionText: {
        ...typeScale.labelMono,
        color: colors.secondary,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    modalOptionTextCancel: {
        ...typeScale.labelMono,
        color: colors.outline,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
});
