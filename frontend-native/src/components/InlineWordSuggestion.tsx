import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { VocabItem } from '../types';
import { colors, typeScale, spacing, frame, buttons } from '../theme';

interface InlineWordSuggestionProps {
    word: VocabItem;
    onSave: () => void;
    onDismiss: () => void;
}

export default function InlineWordSuggestion({ word, onSave, onDismiss }: InlineWordSuggestionProps) {
    return (
        <View style={styles.container}>
            <View style={styles.wordInfo}>
                <Text style={styles.word}>{word.word}</Text>
                {word.pos && <Text style={styles.pos}>{word.pos.toUpperCase()}</Text>}
                {word.definition ? (
                    <Text style={styles.definition} numberOfLines={2}>
                        {word.definition}
                    </Text>
                ) : null}
            </View>

            <View style={styles.actions}>
                <TouchableOpacity onPress={onSave} style={[buttons.primary, styles.saveBtn]} activeOpacity={0.7}>
                    <Text style={buttons.primaryText}>SAVE</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn} activeOpacity={0.7}>
                    <Text style={styles.dismissText}>×</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceLowest,
        borderWidth: spacing.hairline,
        borderColor: colors.outline,
        borderRadius: spacing.radius,
        padding: 12,
        marginVertical: 4,
    },
    wordInfo: {
        flex: 1,
        marginRight: 8,
    },
    word: {
        ...typeScale.titleMd,
        color: colors.onSurface,
    },
    pos: {
        ...typeScale.specimenIndex,
        color: colors.outline,
        marginTop: 2,
        letterSpacing: 0.5,
    },
    definition: {
        ...typeScale.bodySm,
        color: colors.onSurfaceVariant,
        marginTop: 4,
        lineHeight: 16,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    saveBtn: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    dismissBtn: {
        padding: 4,
    },
    dismissText: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 18,
        color: colors.outline,
    },
});
