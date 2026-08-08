import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { VocabItem } from '../types';

interface WordClassifierProps {
    item: VocabItem;
}

export default function WordClassifier({ item }: WordClassifierProps) {
    // Simple word classification - can be expanded later
    const getClassification = () => {
        const word = item.word?.toLowerCase() || '';
        const category = item.tags?.[0] || '';

        if (category === 'emotion' || ['despairing', 'hopeful', 'blustery', 'placid', 'volatile', 'serene', 'jubilant'].includes(word)) {
            return { label: 'Emotion', color: '#ec4899' };
        }
        if (category === 'movement' || ['meander', 'lurk', 'trudge', 'scurry', 'cavort', 'traverse', 'amble', 'hasten', 'skulk', 'saunter'].includes(word)) {
            return { label: 'Movement', color: '#8b5cf6' };
        }
        if (category === 'action' || ['lurk', 'hasten'].includes(word)) {
            return { label: 'Action', color: '#f59e0b' };
        }
        if (category === 'place' || ['vale', 'precipice', 'knoll', 'cove', 'chasm', 'plateau'].includes(word)) {
            return { label: 'Place', color: '#22c55e' };
        }
        if (['leer', 'constrain', 'glare', 'smirk', 'grimace', 'scowl', 'sneer', 'bemoan', 'articulate'].includes(word)) {
            return { label: 'Expression', color: '#3b82f6' };
        }
        return { label: 'General', color: '#6b728b' };
    };

    const classification = getClassification();
    if (!classification) return null;

    return (
        <View style={[styles.classifier, { backgroundColor: classification.color + '20' }]}>
            <Text style={[styles.classifierText, { color: classification.color }]}>
                {classification.label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    classifier: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 4,
    },
    classifierText: {
        fontSize: 11,
        fontWeight: '600',
    },
});
