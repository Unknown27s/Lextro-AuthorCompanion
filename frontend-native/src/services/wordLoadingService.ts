/**
 * Word Loading Service (React Native)
 *
 * Ported from the web version. Key changes:
 * - `fetch('/dictionary_*.json.gz')` → `expo-asset` + `pako`; on web it fetches
 *   the asset URL directly (expo-file-system has no web implementation), on
 *   native it reads the cached asset via expo-file-system (legacy, base64).
 * - `responsiveService` ported to use RN Dimensions
 *
 * The compressed dictionary file (dictionary_indexed.json.gz) should be placed
 * in the `assets/` directory of the Expo project and declared in app.json.
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { inflate } from 'pako';
import { responsiveService } from './responsiveService';
import { storageService } from './storageService';

interface DictionaryData {
  words: any[];
  index: Record<string, number>;
  totalWords: number;
}

class WordLoadingService {
  private fullDictionaryData: any[] | null = null;
  private fullIndex: Record<string, number> | null = null;
  private dictionaryAssetUri: string | null = null;

  /**
   * Initialize word loading service.
   * Loads and decompresses the bundled dictionary asset.
   */
  async initialize(): Promise<void> {
    if (this.fullDictionaryData) {
      return; // Already loaded
    }

    try {
      console.log('[wordLoading] Loading dictionary...');

      // Load the compressed dictionary from bundled assets
      await this.loadDictionaryFromAsset();

      console.log(
        `[wordLoading] Loaded dictionary with ${this.fullDictionaryData!.length} words`,
      );
    } catch (error) {
      console.error('[wordLoading] Failed to load dictionary:', error);
      throw error;
    }
  }

  /**
   * Load and decompress the dictionary from bundled Expo asset.
   * The file `dictionary_indexed.json.gz` must be in the `assets/` directory.
   */
  private async loadDictionaryFromAsset(): Promise<void> {
    try {
      // Try to load from the bundled asset
      const asset = Asset.fromModule(
        require('../../assets/dictionary_indexed.json.gz'),
      );

      // Wait for asset to be downloaded/cached by Expo
      await asset.downloadAsync();

      let decompressed: string;

      if (Platform.OS === 'web') {
        // expo-file-system is unavailable on web; fetch the asset URL directly.
        const uri = asset.uri ?? asset.localUri;
        if (!uri) {
          throw new Error('Dictionary asset URI not available on web');
        }
        const res = await fetch(uri);
        if (!res.ok) {
          throw new Error(`Dictionary asset fetch failed: ${res.status}`);
        }
        const buf = new Uint8Array(await res.arrayBuffer());
        const start = Date.now();
        decompressed = inflate(buf, { toText: true }) as string;
        const end = Date.now();
        console.log(`[wordLoading] Decompressed in ${end - start}ms`);
      } else {
        if (!asset.localUri) {
          throw new Error('Dictionary asset URI not available');
        }

        this.dictionaryAssetUri = asset.localUri;

        // Read the file content as a binary buffer
        const fileInfo = await FileSystem.getInfoAsync(asset.localUri);
        if (!fileInfo.exists) {
          throw new Error('Dictionary asset file not found');
        }

        const content = await FileSystem.readAsStringAsync(asset.localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Decode base64 to Uint8Array
        const binaryString = atob(content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Decompress with pako
        const start = Date.now();
        decompressed = inflate(bytes, { toText: true }) as string;
        const end = Date.now();
        console.log(`[wordLoading] Decompressed in ${end - start}ms`);
      }

      // Parse
      const data: DictionaryData = JSON.parse(decompressed);
      this.fullDictionaryData = data.words;
      this.fullIndex = data.index;

      console.log(
        `[wordLoading] Dictionary ready: ${data.totalWords} words`,
      );
    } catch (error) {
      console.error('[wordLoading] Asset loading failed:', error);

      // Fallback: try loading from a previously cached copy
      const cached = await storageService.getItem('dictionary_cached');
      if (cached) {
        console.log('[wordLoading] Using cached dictionary');
        this.fullDictionaryData = cached.words;
        this.fullIndex = cached.index;
      } else {
        throw error;
      }
    }
  }

  /**
   * Get a single word with caching
   */
  async getWord(word: string): Promise<any> {
    const normalizedWord = word.toLowerCase().trim();

    if (!normalizedWord) {
      throw new Error('Word cannot be empty');
    }

    // Load dictionary if not already loaded
    if (!this.fullDictionaryData || !this.fullIndex) {
      await this.initialize();
    }

    // Look up index
    const wordIndex = this.fullIndex![normalizedWord];
    if (wordIndex === undefined) {
      return null;
    }

    // Returns the word data
    const wordData = this.fullDictionaryData![wordIndex];

    // Cache to storage
    try {
      await storageService.setItem(`word_${normalizedWord}`, wordData, 30);
    } catch (error) {
      console.warn('[wordLoading] Failed to cache word:', error);
    }

    return wordData;
  }

  /**
   * Get words in batch (optimized for pagination)
   */
  async getWordsBatch(indices: number[]): Promise<any[]> {
    if (!this.fullDictionaryData) {
      await this.initialize();
    }

    return indices
      .map((idx) => this.fullDictionaryData![idx])
      .filter((w) => w !== undefined);
  }

  /**
   * Get words by category
   */
  async getWordsByCategory(category: string): Promise<string[]> {
    if (!this.fullDictionaryData || !this.fullIndex) {
      await this.initialize();
    }

    return this.fullDictionaryData!
      .filter((w) => w.tags && w.tags.includes(category))
      .map((w) => w.word);
  }

  /**
   * Search words by prefix (for autocomplete)
   */
  async searchByPrefix(prefix: string, limit: number = 10): Promise<string[]> {
    if (!this.fullIndex) {
      await this.initialize();
    }

    const normalizedPrefix = prefix.toLowerCase();
    return Object.keys(this.fullIndex!)
      .filter((word) => word.startsWith(normalizedPrefix))
      .slice(0, limit);
  }

  /**
   * Search words by query across word text, definitions, tags, and synonyms
   */
  async searchByQuery(query: string, limit: number = 15): Promise<string[]> {
    if (!this.fullDictionaryData) {
      await this.initialize();
    }

    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return [];

    const rankedResults = this.fullDictionaryData!
      .map((item) => {
        const word = String(item.word || '').toLowerCase();
        const definition = String(item.definition || '').toLowerCase();
        const tags = Array.isArray(item.tags)
          ? item.tags.map((tag: string) => String(tag).toLowerCase())
          : [];
        const synonyms = Array.isArray(item.synonyms)
          ? item.synonyms.map((syn: string) => String(syn).toLowerCase())
          : [];
        const antonyms = Array.isArray(item.antonyms)
          ? item.antonyms.map((ant: string) => String(ant).toLowerCase())
          : [];

        let score = 0;

        if (word === normalizedQuery) score += 100;
        if (word.startsWith(normalizedQuery)) score += 70;
        if (word.includes(normalizedQuery)) score += 45;
        if (definition.includes(normalizedQuery)) score += 30;
        if (tags.some((tag: string) => tag.includes(normalizedQuery))) score += 25;
        if (synonyms.some((syn: string) => syn.includes(normalizedQuery))) score += 35;
        if (antonyms.some((ant: string) => ant.includes(normalizedQuery))) score += 20;

        return { word: item.word, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))
      .slice(0, limit)
      .map((entry) => entry.word);

    return rankedResults;
  }

  /**
   * Get all words count
   */
  async getTotalWordsCount(): Promise<number> {
    if (!this.fullDictionaryData) {
      await this.initialize();
    }

    return this.fullDictionaryData!.length;
  }

  /**
   * Get the full dictionary array (used by the SQLite import layer).
   */
  async getAllWords(): Promise<any[]> {
    if (!this.fullDictionaryData) {
      await this.initialize();
    }
    return this.fullDictionaryData!;
  }

  /**
   * Get random words (useful for daily vocab)
   */
  async getRandomWords(count: number = 5): Promise<any[]> {
    if (!this.fullDictionaryData) {
      await this.initialize();
    }

    const result = [];
    const data = this.fullDictionaryData!;

    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * data.length);
      result.push(data[randomIndex]);
    }

    return result;
  }

  /**
   * Get paginated words (most common use case)
   */
  async getPaginatedWords(page: number = 0, pageSize?: number): Promise<any[]> {
    if (!this.fullDictionaryData) {
      await this.initialize();
    }

    const size = pageSize || responsiveService.getOptimalPageSize();
    const start = page * size;
    const end = start + size;

    return this.fullDictionaryData!.slice(start, end);
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    this.fullDictionaryData = null;
    this.fullIndex = null;
    this.dictionaryAssetUri = null;
    console.log('[wordLoading] Cache cleared');
  }

  /**
   * Get loading progress
   */
  getProgress(): { current: number; total: number; percent: number } {
    const total = this.fullDictionaryData?.length || 0;
    const current = total; // All-or-nothing load for now

    return {
      current,
      total,
      percent: total > 0 ? 100 : 0,
    };
  }
}

export const wordLoadingService = new WordLoadingService();
