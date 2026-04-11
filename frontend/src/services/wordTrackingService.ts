/**
 * Word Tracking Service
 * Handles deduplication, alphabetical sorting, and word relationship tracking
 */

import { VocabItem, localStorageApi } from '../api/client';
import { wordnikService } from './wordnikService';

export interface WordTrackingData {
    wordId: string;
    trackedSynonyms: string[];
    trackedAntonyms: string[];
    meaningGroups: string[]; // IDs of words with same meaning
    lastUpdated: string;
}

class WordTrackingService {
    private static instance: WordTrackingService;
    private trackingCache: Map<string, WordTrackingData> = new Map();

    private constructor() {
        this.loadTrackingCache();
    }

    static getInstance(): WordTrackingService {
        if (!WordTrackingService.instance) {
            WordTrackingService.instance = new WordTrackingService();
        }
        return WordTrackingService.instance;
    }

    /**
     * Load tracking data from localStorage
     */
    private loadTrackingCache(): void {
        try {
            const data = localStorage.getItem('wordTrackingData');
            if (data) {
                const parsed = JSON.parse(data);
                Object.entries(parsed).forEach(([key, value]: [string, any]) => {
                    this.trackingCache.set(key, value);
                });
            }
        } catch (error) {
            console.error('Failed to load tracking cache:', error);
        }
    }

    /**
     * Save tracking data to localStorage
     */
    private saveTrackingCache(): void {
        try {
            const data: Record<string, WordTrackingData> = {};
            this.trackingCache.forEach((value, key) => {
                data[key] = value;
            });
            localStorage.setItem('wordTrackingData', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save tracking cache:', error);
        }
    }

    /**
     * Calculate similarity between two definitions (simple string matching)
     * Returns 0-1 score
     */
    private calculateDefinitionSimilarity(def1: string, def2: string): number {
        const normalize = (s: string) => s.toLowerCase().trim();
        const n1 = normalize(def1);
        const n2 = normalize(def2);

        // Exact match
        if (n1 === n2) return 1.0;

        // Check if one is substring of other
        if (n1.includes(n2) || n2.includes(n1)) return 0.8;

        // Word overlap
        const words1 = new Set(n1.split(/\s+/));
        const words2 = new Set(n2.split(/\s+/));
        const intersection = [...words1].filter(w => words2.has(w)).length;
        const union = new Set([...words1, ...words2]).size;

        return intersection / union;
    }

    /**
     * Find words with identical or very similar meanings
     */
    async findDuplicateMeanings(vocab: VocabItem[]): Promise<Map<string, string[]>> {
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

                const similarity = this.calculateDefinitionSimilarity(
                    word1.definition,
                    word2.definition
                );

                // Group if similarity is high (>0.7)
                if (similarity > 0.7) {
                    group.push(word2.id);
                    processed.add(word2.id);
                }
            }

            if (group.length > 1) {
                duplicateGroups.set(word1.id, group);
            }
        }

        return duplicateGroups;
    }

    /**
     * Merge duplicate words by keeping primary and linking others
     */
    mergeDuplicates(vocab: VocabItem[], duplicateGroups: Map<string, string[]>): VocabItem[] {
        const merged = [...vocab];

        duplicateGroups.forEach((group, primaryId) => {
            const primaryWord = merged.find(w => w.id === primaryId);
            if (!primaryWord) return;

            // Add other words as similar meanings
            const otherIds = group.filter(id => id !== primaryId);
            primaryWord.similarMeanings = otherIds;

            // Mark others as duplicates
            otherIds.forEach(otherId => {
                const otherWord = merged.find(w => w.id === otherId);
                if (otherWord) {
                    otherWord.duplicateOf = primaryId;
                    otherWord.tags = [...(otherWord.tags || []), 'duplicate'];
                }
            });
        });

        return merged;
    }

    /**
     * Get words sorted alphabetically
     */
    sortAlphabetically(vocab: VocabItem[]): VocabItem[] {
        return [...vocab].sort((a, b) => {
            const wordA = a.word.toLowerCase();
            const wordB = b.word.toLowerCase();
            return wordA.localeCompare(wordB);
        });
    }

    /**
     * Get unique words (excluding duplicates)
     */
    getUniqueWords(vocab: VocabItem[]): VocabItem[] {
        return vocab.filter(w => !w.duplicateOf);
    }

    /**
     * Fetch and cache antonyms for a word
     */
    async fetchAndCacheAntonyms(vocabItem: VocabItem): Promise<string[]> {
        try {
            // Check cache first
            const cached = this.trackingCache.get(vocabItem.id);
            if (cached && cached.trackedAntonyms.length > 0) {
                return cached.trackedAntonyms;
            }

            // Fetch from Wordnik
            const antonyms = await wordnikService.getAntonyms(vocabItem.word, 10);

            // Update tracking data
            const tracking = cached || {
                wordId: vocabItem.id,
                trackedSynonyms: vocabItem.synonyms || [],
                trackedAntonyms: antonyms,
                meaningGroups: [],
                lastUpdated: new Date().toISOString(),
            };

            tracking.trackedAntonyms = antonyms;
            tracking.lastUpdated = new Date().toISOString();

            this.trackingCache.set(vocabItem.id, tracking);
            this.saveTrackingCache();

            // Also update the VocabItem
            vocabItem.antonyms = antonyms;

            return antonyms;
        } catch (error) {
            console.error('Failed to fetch antonyms for', vocabItem.word, error);
            return vocabItem.antonyms || [];
        }
    }

    /**
     * Get all words with same meaning as given word
     */
    getSimilarMeaningWords(
        vocabId: string,
        allVocab: VocabItem[]
    ): VocabItem[] {
        const word = allVocab.find(w => w.id === vocabId);
        if (!word || !word.similarMeanings) return [];

        return allVocab.filter(w => word.similarMeanings?.includes(w.id));
    }

    /**
     * Get tracking info for a word
     */
    getWordTrackingInfo(vocabId: string): WordTrackingData | null {
        return this.trackingCache.get(vocabId) || null;
    }

    /**
     * Update synonyms for a word
     */
    updateTrackedSynonyms(vocabId: string, synonyms: string[]): void {
        const tracking = this.trackingCache.get(vocabId) || {
            wordId: vocabId,
            trackedSynonyms: [],
            trackedAntonyms: [],
            meaningGroups: [],
            lastUpdated: new Date().toISOString(),
        };

        tracking.trackedSynonyms = synonyms;
        tracking.lastUpdated = new Date().toISOString();

        this.trackingCache.set(vocabId, tracking);
        this.saveTrackingCache();
    }

    /**
     * Get all words grouped by meaning
     */
    getWordsByMeaning(vocab: VocabItem[]): Map<string, VocabItem[]> {
        const groups = new Map<string, VocabItem[]>();

        vocab.forEach(word => {
            const key = word.duplicateOf || word.id;

            if (!groups.has(key)) {
                groups.set(key, []);
            }

            groups.get(key)!.push(word);
        });

        return groups;
    }

    /**
     * Clear tracking data
     */
    clearTrackingData(): void {
        this.trackingCache.clear();
        localStorage.removeItem('wordTrackingData');
        console.log('✅ Word tracking data cleared');
    }
}

export const wordTrackingService = WordTrackingService.getInstance();
