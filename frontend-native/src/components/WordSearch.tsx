import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, FlatList, Text } from 'react-native';
import { VocabItem } from '../types';
import { colors, fonts, typeScale, spacing, frame } from '../theme';

interface WordSearchProps {
    onSearch: (word: string) => void;
    onWordSelect?: (item: VocabItem) => void;
    placeholder?: string;
}

export default function WordSearch({
    onSearch,
    onWordSelect,
    placeholder = 'SEARCH WORDS',
}: WordSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<VocabItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = () => {
        if (query.trim()) {
            setIsSearching(true);
            onSearch(query.trim());
            setTimeout(() => setIsSearching(false), 500);
        }
    };

    const handleClear = () => {
        setQuery('');
        setResults([]);
    };

    return (
        <View style={styles.container}>
            <View style={styles.searchRow}>
                <Text style={styles.marker}>⌕</Text>
                <TextInput
                    style={styles.input}
                    value={query}
                    onChangeText={setQuery}
                    placeholder={placeholder}
                    placeholderTextColor={colors.outline}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
                        <Text style={styles.clearIcon}>×</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleSearch} style={styles.searchBtn} activeOpacity={0.8}>
                    <Text style={styles.searchIcon}>→</Text>
                </TouchableOpacity>
            </View>

            {isSearching && (
                <View style={styles.loadingRow}>
                    <Text style={styles.loadingText}>SEARCHING…</Text>
                </View>
            )}

            {results.length > 0 && (
                <View style={styles.resultsContainer}>
                    <FlatList
                        data={results}
                        keyExtractor={(item) => item.id}
                        keyboardShouldPersistTaps="always"
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.resultItem}
                                onPress={() => onWordSelect?.(item)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.resultWord}>{item.word}</Text>
                                <Text style={styles.resultPos}>{item.pos.toUpperCase()}</Text>
                                <Text style={styles.resultDef} numberOfLines={2}>
                                    {item.definition}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
        padding: spacing.gutter,
        borderBottomWidth: spacing.hairline,
        borderBottomColor: colors.outline,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: spacing.hairline,
        borderColor: colors.outline,
        borderRadius: spacing.radiusSharp,
        backgroundColor: colors.surfaceLowest,
        paddingHorizontal: 12,
        height: 44,
    },
    marker: {
        fontFamily: fonts.mono,
        fontSize: 18,
        color: colors.onSurfaceVariant,
    },
    input: {
        flex: 1,
        ...typeScale.labelMono,
        color: colors.onSurface,
        paddingVertical: 0,
    },
    clearBtn: {
        padding: 6,
    },
    clearIcon: {
        fontFamily: fonts.mono,
        fontSize: 18,
        color: colors.outline,
    },
    searchBtn: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: spacing.hairline,
        borderColor: colors.primary,
        borderRadius: spacing.radius,
        backgroundColor: colors.primary,
    },
    searchIcon: {
        fontFamily: fonts.mono,
        fontSize: 14,
        color: colors.onPrimary,
    },
    loadingRow: {
        marginTop: 8,
    },
    loadingText: {
        ...typeScale.specimenIndex,
        color: colors.outline,
        letterSpacing: 1,
    },
    resultsContainer: {
        maxHeight: 240,
        marginTop: 8,
        borderWidth: spacing.hairline,
        borderColor: colors.outline,
        borderRadius: spacing.radiusSharp,
        backgroundColor: colors.surfaceLowest,
    },
    resultItem: {
        padding: 12,
        borderBottomWidth: spacing.hairline,
        borderBottomColor: colors.outlineVariant,
    },
    resultWord: {
        ...typeScale.titleMd,
        color: colors.onSurface,
    },
    resultPos: {
        ...typeScale.specimenIndex,
        color: colors.outline,
        marginTop: 2,
        letterSpacing: 0.5,
    },
    resultDef: {
        ...typeScale.bodySm,
        color: colors.onSurfaceVariant,
        marginTop: 4,
        lineHeight: 18,
    },
});
