/**
 * Word Deduplication and Relationship Utilities
 * Helps identify and manage words with identical meanings
 */

import { VocabItem } from '../api/client';

/**
 * Calculate similarity score between two definitions
 * Returns 0-1 where 1 is identical
 */
export const calculateDefinitionSimilarity = (def1: string, def2: string): number => {
    const normalize = (s: string) => s.toLowerCase().trim();
    const n1 = normalize(def1);
    const n2 = normalize(def2);

    // Exact match
    if (n1 === n2) return 1.0;

    // Check if one is substring of other
    if (n1.includes(n2) || n2.includes(n1)) return 0.8;

    // Word overlap - Jaccard similarity
    const words1 = new Set(n1.split(/\s+/));
    const words2 = new Set(n2.split(/\s+/));
    const intersection = [...words1].filter(w => words2.has(w)).length;
    const union = new Set([...words1, ...words2]).size;

    return union > 0 ? intersection / union : 0;
};

/**
 * Find words that have identical or very similar meanings
 * Returns a Map where key is primary word ID and value is array of duplicate IDs
 */
export const findDuplicateMeanings = (
    vocab: VocabItem[],
    similarityThreshold: number = 0.7
): Map<string, string[]> => {
    const duplicateGroups = new Map<string, string[]>();
    const processed = new Set<string>();

    for (let i = 0; i < vocab.length; i++) {
        const word1 = vocab[i];
        if (processed.has(word1.id)) continue;

        const group: string[] = [word1.id];
        processed.add(word1.id);

        for (let j = i + 1; j < vocab.length; j++) {
            const word2 = vocab[j];
            if (processed.has(word2.id)) continue;

            const similarity = calculateDefinitionSimilarity(
                word1.definition,
                word2.definition
            );

            if (similarity > similarityThreshold) {
                group.push(word2.id);
                processed.add(word2.id);
            }
        }

        if (group.length > 1) {
            duplicateGroups.set(word1.id, group);
        }
    }

    return duplicateGroups;
};

/**
 * Merge duplicate words by keeping primary and linking others
 * Modifies vocab items in place
 */
export const mergeDuplicateWords = (
    vocab: VocabItem[],
    duplicateGroups: Map<string, string[]>
): VocabItem[] => {
    const merged = [...vocab];
    const vocabMap = new Map(merged.map(w => [w.id, w]));

    duplicateGroups.forEach((group, primaryId) => {
        const primaryWord = vocabMap.get(primaryId);
        if (!primaryWord) return;

        // Add other words as similar meanings
        const otherIds = group.filter(id => id !== primaryId);
        primaryWord.similarMeanings = otherIds;

        // Mark others as duplicates
        otherIds.forEach(otherId => {
            const otherWord = vocabMap.get(otherId);
            if (otherWord) {
                otherWord.duplicateOf = primaryId;
                otherWord.tags = [...(otherWord.tags || []), 'duplicate'];
            }
        });
    });

    return merged;
};

/**
 * Get unique words (excluding those marked as duplicates)
 */
export const getUniqueWords = (vocab: VocabItem[]): VocabItem[] => {
    return vocab.filter(w => !w.duplicateOf);
};

/**
 * Sort words alphabetically by word
 */
export const sortAlphabetically = (vocab: VocabItem[]): VocabItem[] => {
    return [...vocab].sort((a, b) => {
        const wordA = a.word.toLowerCase();
        const wordB = b.word.toLowerCase();
        return wordA.localeCompare(wordB);
    });
};

/**
 * Get all alphabets that have words
 */
export const getAlphabets = (vocab: VocabItem[]): string[] => {
    const alphabets = new Set<string>();
    vocab.forEach(word => {
        const letter = word.word.charAt(0).toUpperCase();
        if (/[A-Z]/.test(letter)) {
            alphabets.add(letter);
        }
    });
    return Array.from(alphabets).sort();
};

/**
 * Group words by their first letter
 */
export const groupByAlphabet = (vocab: VocabItem[]): Record<string, VocabItem[]> => {
    const groups: Record<string, VocabItem[]> = {};
    vocab.forEach(word => {
        const letter = word.word.charAt(0).toUpperCase();
        if (!groups[letter]) {
            groups[letter] = [];
        }
        groups[letter].push(word);
    });
    return groups;
};

/**
 * Get words grouped by meaning (primary + duplicates)
 */
export const getWordsByMeaning = (vocab: VocabItem[]): Map<string, VocabItem[]> => {
    const groups = new Map<string, VocabItem[]>();

    vocab.forEach(word => {
        const key = word.duplicateOf || word.id;

        if (!groups.has(key)) {
            groups.set(key, []);
        }

        groups.get(key)!.push(word);
    });

    return groups;
};

/**
 * Get similar meaning words for a given word
 */
export const getSimilarMeaningWords = (
    vocabId: string,
    allVocab: VocabItem[]
): VocabItem[] => {
    const word = allVocab.find(w => w.id === vocabId);
    if (!word || !word.similarMeanings) return [];

    return allVocab.filter(w => word.similarMeanings?.includes(w.id));
};

/**
 * Format synonyms/antonyms for display
 * Removes duplicates and limits count
 */
export const formatRelatedWords = (
    words: string[] | undefined,
    limit: number = 10
): string[] => {
    if (!words) return [];
    const unique = [...new Set(words)];
    return unique.slice(0, limit);
};
