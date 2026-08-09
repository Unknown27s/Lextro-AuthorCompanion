/**
 * API Client & Local Storage API (React Native)
 *
 * Ported from web version. Key changes:
 * - VocabItem re-exported from centralized types (no local duplicate)
 * - localStorage replaced with polyfill from utils/storage
 * - storageService (RN version) handles async caching
 * - wordLoadingService (RN version) handles dictionary lookups
 * - All business logic preserved exactly
 */

import axios from 'axios';
import { wordLoadingService } from '../services/wordLoadingService';
import { sqliteService } from '../services/sqliteService';
import { storageService } from '../services/storageService';
import { localStorage as localStoragePolyfill } from '../utils/storage';
import { VocabItem, FeedResponse, UserVocabItem } from '../types';

// Re-export for backward compatibility with code that imports from api/client
export type { VocabItem, FeedResponse };

// ✅ FREE Dictionary API - https://dictionaryapi.dev/ (no auth required!)
const DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';

export const dictionaryClient = axios.create({
  baseURL: DICTIONARY_API,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Dictionary API — 3-tier lookup: cache → offline dictionary → online API
 */
export const dictionaryApi = {
  getWord: async (word: string): Promise<any> => {
    const normalizedWord = word.toLowerCase().trim();

    if (!normalizedWord) {
      throw new Error('Word cannot be empty');
    }

    // 1. Check Storage cache first (fastest)
    try {
      const cachedData = await storageService.getItem(
        `word_${normalizedWord}`,
      );
      if (cachedData) {
        console.log('[api] Found in cache:', normalizedWord);
        return cachedData;
      }
    } catch (error) {
      console.warn('[api] Failed to access cache:', error);
    }

    // 2. Prebuilt SQLite dictionary (instant on native — seeded once from the
    //    bundled lextro.db.gz; does not require the in-memory dictionary load).
    try {
      const sqliteWord = await sqliteService.getWord(normalizedWord);
      if (sqliteWord) {
        // Rebuild the dual shape transformToVocabItem expects.
        const shaped = {
          ...sqliteWord,
          meanings: [
            {
              partOfSpeech: sqliteWord.pos,
              definitions: [
                {
                  definition: sqliteWord.definition,
                  synonyms: sqliteWord.synonyms,
                  antonyms: sqliteWord.antonyms,
                },
              ],
            },
          ],
        };
        await storageService.setItem(`word_${normalizedWord}`, shaped, 30);
        return shaped;
      }
    } catch (error) {
      console.warn('[api] SQLite dictionary lookup failed:', error);
    }

    // 3. Check local indexed dictionary (instant, no network)
    try {
      const wordData = await wordLoadingService.getWord(normalizedWord);
      if (wordData) {
        console.log(
          '[api] Found in offline dictionary:',
          normalizedWord,
        );
        await storageService.setItem(
          `word_${normalizedWord}`,
          wordData,
          30,
        );
        return wordData;
      }
    } catch (error) {
      console.warn(
        '[api] Failed to load offline dictionary:',
        error,
      );
    }

    // 4. Fallback to online API
    try {
      console.log('[api] Fetching from API:', normalizedWord);
      const response = await dictionaryClient.get(
        `/${encodeURIComponent(normalizedWord)}`,
      );
      if (!response.data || response.data.length === 0) {
        throw new Error('Word not found');
      }

      const apiData = response.data[0];
      await storageService.setItem(
        `word_${normalizedWord}`,
        apiData,
        30,
      );
      return apiData;
    } catch (error) {
      console.error('[api] Dictionary lookup failed:', error);
      throw error;
    }
  },

  transformToVocabItem: (data: any, word: string): VocabItem => {
    const meaning = data.meanings?.[0];
    const definition = meaning?.definitions?.[0];
    const source = data.source || data.category || 'offline';

    return {
      id: word.toLowerCase(),
      word: word.toLowerCase(),
      pos: meaning?.partOfSpeech || 'unknown',
      difficulty: 'medium',
      definition: definition?.definition || 'No definition available',
      example_corpus: definition?.example || '',
      ai_example: `"${word}" is widely used in professional contexts.`,
      synonyms: meaning?.synonyms || [],
      antonyms: [],
      relatedWords: [],
      tags: source ? [source] : ['offline'],
      created_at: new Date().toISOString(),
      isTracked: false,
    };
  },

  getWordSource: async (
    word: string,
  ): Promise<'offline' | 'cache' | 'online' | 'unknown'> => {
    const normalizedWord = word.toLowerCase().trim();

    try {
      const cachedData = await storageService.getItem(
        `word_${normalizedWord}`,
      );
      if (cachedData) {
        return 'cache';
      }
    } catch (error) {
      console.warn('[api] Failed to check cache:', error);
    }

    try {
      const offlineWord = await wordLoadingService.getWord(normalizedWord);
      if (offlineWord) {
        return 'offline';
      }
    } catch (error) {
      console.warn(
        '[api] Failed to check offline dictionary:',
        error,
      );
    }

    return 'unknown';
  },

  getWordsByCategory: async (category: string): Promise<string[]> => {
    return wordLoadingService.getWordsByCategory(category);
  },

  searchInCategory: async (
    searchTerm: string,
    category: string,
  ): Promise<any[]> => {
    const words = await wordLoadingService.getWordsByCategory(category);
    const normalizedTerm = searchTerm.toLowerCase().trim();

    return words
      .filter((word) => word.includes(normalizedTerm))
      .slice(0, 10)
      .map((word) => ({
        word,
        definition: 'See word details for full definition',
      }));
  },

  getWordCategory: async (word: string): Promise<string | null> => {
    const wordData = await dictionaryApi.getWord(word);
    return wordData?.tags?.[0] || null;
  },

  clearCache: async (): Promise<void> => {
    await storageService.clear();
    await wordLoadingService.clearCache();
    console.log('[api] Dictionary cache cleared');
  },
};

/**
 * Local Storage API — now uses the localStorage polyfill for RN compatibility.
 * Preserves the exact same synchronous API surface as the web version.
 */
export const localStorageApi = {
  getUserVocab: (): UserVocabItem[] => {
    const data = localStoragePolyfill.getItem('userVocab');
    if (!data) return [];

    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed)
        ? parsed
            .map((item: any) => ({
              id: item.id,
              vocab_item_id: item.vocab_item_id,
              vocab_item: item.vocab_item,
              status: item.status as 'saved' | 'learning' | 'mastered',
              practice_score: item.practice_score,
              added_at: item.added_at,
            }))
            .filter(
              (item: UserVocabItem) =>
                item?.vocab_item?.word && item?.vocab_item_id,
            )
        : [];
    } catch {
      return [];
    }
  },

  saveVocab: (
    vocabItemId: string,
    vocabItem: VocabItem,
    status: 'saved' | 'learning' | 'mastered' = 'saved',
  ): UserVocabItem => {
    const userVocab = localStorageApi.getUserVocab();
    const exists = userVocab.find(
      (uv) => uv.vocab_item_id === vocabItemId,
    );

    if (exists) {
      exists.status = status;
    } else {
      const newItem: UserVocabItem = {
        id: `${vocabItemId}-${Date.now()}`,
        vocab_item_id: vocabItemId,
        vocab_item: vocabItem,
        status,
        practice_score: 0,
        added_at: new Date().toISOString(),
      };
      userVocab.push(newItem);
    }

    localStoragePolyfill.setItem('userVocab', JSON.stringify(userVocab));

    // Also sync to storage service in background
    storageService
      .addToSyncQueue('save_vocab', {
        vocab_item_id: vocabItemId,
        vocab_item: vocabItem,
        status,
      })
      .catch(console.warn);

    return userVocab.find(
      (uv) => uv.vocab_item_id === vocabItemId,
    ) as UserVocabItem;
  },

  removeVocab: (userVocabId: string): void => {
    let userVocab = localStorageApi.getUserVocab();
    userVocab = userVocab.filter((uv) => uv.id !== userVocabId);
    localStoragePolyfill.setItem('userVocab', JSON.stringify(userVocab));

    storageService
      .addToSyncQueue('delete_vocab', { user_vocab_id: userVocabId })
      .catch(console.warn);
  },

  updatePracticeScore: (
    userVocabId: string,
    isCorrect: boolean,
  ): void => {
    const userVocab = localStorageApi.getUserVocab();
    const item = userVocab.find((uv) => uv.id === userVocabId);
    if (item) {
      item.practice_score =
        item.practice_score * 0.8 + (isCorrect ? 1 : 0) * 0.2;
      localStoragePolyfill.setItem('userVocab', JSON.stringify(userVocab));
    }
  },

  getPracticeStats: (vocabItemId: string): any => {
    const results = localStoragePolyfill.getItem(
      `practice_${vocabItemId}`,
    );
    const attempts = results ? JSON.parse(results) : [];
    const correctCount = attempts.filter((a: any) => a.correct).length;

    return {
      totalAttempts: attempts.length,
      correctAttempts: correctCount,
      successRate:
        attempts.length > 0
          ? (correctCount / attempts.length) * 100
          : 0,
    };
  },

  addPracticeAttempt: (
    vocabItemId: string,
    correct: boolean,
  ): void => {
    const key = `practice_${vocabItemId}`;
    const results = localStoragePolyfill.getItem(key);
    const attempts = results ? JSON.parse(results) : [];
    attempts.push({
      correct,
      timestamp: new Date().toISOString(),
    });
    localStoragePolyfill.setItem(
      key,
      JSON.stringify(attempts.slice(-100)),
    );
  },
};
