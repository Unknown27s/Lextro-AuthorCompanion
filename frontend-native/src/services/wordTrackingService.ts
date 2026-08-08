/**
 * Word Tracking Service
 *
 * Ported from web version — imports localStorage polyfill instead of global.
 * Also imports VocabItem from the centralized types module.
 */

import { VocabItem } from '../types';
import { localStorage as localStoragePolyfill } from '../utils/storage';
import { wordnikService } from './wordnikService';

export interface WordTrackingData {
  wordId: string;
  trackedSynonyms: string[];
  trackedAntonyms: string[];
  meaningGroups: string[];
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

  private loadTrackingCache(): void {
    try {
      const data = localStoragePolyfill.getItem('wordTrackingData');
      if (data) {
        const parsed = JSON.parse(data);
        Object.entries(parsed).forEach(([key, value]: [string, any]) => {
          this.trackingCache.set(key, value);
        });
      }
    } catch (error) {
      console.error('[wordTracking] Failed to load tracking cache:', error);
    }
  }

  private saveTrackingCache(): void {
    try {
      const data: Record<string, WordTrackingData> = {};
      this.trackingCache.forEach((value, key) => {
        data[key] = value;
      });
      localStoragePolyfill.setItem('wordTrackingData', JSON.stringify(data));
    } catch (error) {
      console.error('[wordTracking] Failed to save tracking cache:', error);
    }
  }

  private calculateDefinitionSimilarity(def1: string, def2: string): number {
    const normalize = (s: string) => s.toLowerCase().trim();
    const n1 = normalize(def1);
    const n2 = normalize(def2);

    if (n1 === n2) return 1.0;
    if (n1.includes(n2) || n2.includes(n1)) return 0.8;

    const words1 = new Set(n1.split(/\s+/));
    const words2 = new Set(n2.split(/\s+/));
    const intersection = [...words1].filter((w) => words2.has(w)).length;
    const union = new Set([...words1, ...words2]).size;

    return intersection / union;
  }

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
          word2.definition,
        );

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

  mergeDuplicates(
    vocab: VocabItem[],
    duplicateGroups: Map<string, string[]>,
  ): VocabItem[] {
    const merged = [...vocab];

    duplicateGroups.forEach((group, primaryId) => {
      const primaryWord = merged.find((w) => w.id === primaryId);
      if (!primaryWord) return;

      const otherIds = group.filter((id) => id !== primaryId);
      primaryWord.similarMeanings = otherIds;

      otherIds.forEach((otherId) => {
        const otherWord = merged.find((w) => w.id === otherId);
        if (otherWord) {
          otherWord.duplicateOf = primaryId;
          otherWord.tags = [...(otherWord.tags || []), 'duplicate'];
        }
      });
    });

    return merged;
  }

  sortAlphabetically(vocab: VocabItem[]): VocabItem[] {
    return [...vocab].sort((a, b) => {
      const wordA = a.word.toLowerCase();
      const wordB = b.word.toLowerCase();
      return wordA.localeCompare(wordB);
    });
  }

  getUniqueWords(vocab: VocabItem[]): VocabItem[] {
    return vocab.filter((w) => !w.duplicateOf);
  }

  async fetchAndCacheAntonyms(vocabItem: VocabItem): Promise<string[]> {
    try {
      const cached = this.trackingCache.get(vocabItem.id);
      if (cached && cached.trackedAntonyms.length > 0) {
        return cached.trackedAntonyms;
      }

      const antonyms = await wordnikService.getAntonyms(vocabItem.word, 10);

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

      vocabItem.antonyms = antonyms;
      return antonyms;
    } catch (error) {
      console.error('[wordTracking] Failed to fetch antonyms for', vocabItem.word, error);
      return vocabItem.antonyms || [];
    }
  }

  getSimilarMeaningWords(
    vocabId: string,
    allVocab: VocabItem[],
  ): VocabItem[] {
    const word = allVocab.find((w) => w.id === vocabId);
    if (!word || !word.similarMeanings) return [];

    return allVocab.filter((w) =>
      word.similarMeanings?.includes(w.id),
    );
  }

  getWordTrackingInfo(vocabId: string): WordTrackingData | null {
    return this.trackingCache.get(vocabId) || null;
  }

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

  getWordsByMeaning(vocab: VocabItem[]): Map<string, VocabItem[]> {
    const groups = new Map<string, VocabItem[]>();

    vocab.forEach((word) => {
      const key = word.duplicateOf || word.id;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(word);
    });

    return groups;
  }

  clearTrackingData(): void {
    this.trackingCache.clear();
    localStoragePolyfill.removeItem('wordTrackingData');
    console.log('[wordTracking] Tracking data cleared');
  }
}

export const wordTrackingService = WordTrackingService.getInstance();
