/**
 * Dictionary Service
 *
 * Ported from web version — imports localStorage polyfill from utils/storage
 * instead of relying on browser global. All dictionary logic is identical.
 */

import { Platform } from 'react-native';
import { wordLoadingService } from './wordLoadingService';
import { responsiveService } from './responsiveService';

interface WordEntry {
  word: string;
  type: string;
  pos: string;
  definition?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

class DictionaryService {
  private isInitialized = false;
  private allWords: string[] = [];

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('[dictionary] Initializing...');
      await wordLoadingService.initialize();
      this.isInitialized = true;
      console.log('[dictionary] Ready');
    } catch (error) {
      console.error('[dictionary] Failed to initialize:', error);
    }
  }

  async getAllWords(): Promise<string[]> {
    if (!this.isInitialized) await this.initialize();
    return this.allWords;
  }

  async getWordsByCategory(category: string, limit: number = 50): Promise<string[]> {
    if (!this.isInitialized) await this.initialize();
    return wordLoadingService.getWordsByCategory(category);
  }

  async getRandomWord(category: string = 'random'): Promise<string> {
    const words = await this.getWordsByCategory(category, 100);
    return words[Math.floor(Math.random() * words.length)] || 'vocabulary';
  }

  async getRandomWords(count: number = 5): Promise<any[]> {
    if (!this.isInitialized) await this.initialize();
    return wordLoadingService.getRandomWords(count);
  }

  async getWordsByPurpose(
    purpose: 'writing' | 'interviews' | 'exams' | 'presentation' | 'creative' = 'writing',
  ): Promise<string[]> {
    if (!this.isInitialized) await this.initialize();

    console.log(`[dictionary] Loading words for purpose: ${purpose}`);
    const words = await wordLoadingService.getPaginatedWords(0, 1000);
    return words.map((w) => w.word);
  }

  async searchByPrefix(prefix: string, limit: number = 10): Promise<string[]> {
    if (!this.isInitialized) await this.initialize();
    return wordLoadingService.searchByPrefix(prefix, limit);
  }

  async getPaginatedWords(page: number = 0, pageSize?: number): Promise<any[]> {
    if (!this.isInitialized) await this.initialize();
    return wordLoadingService.getPaginatedWords(page, pageSize);
  }

  async getTotalWordCount(): Promise<number> {
    if (!this.isInitialized) await this.initialize();
    return wordLoadingService.getTotalWordsCount();
  }
}

export const dictionaryService = new DictionaryService();

// Web only: warm the in-memory dictionary ahead of time. On native it is a lazy
// fallback behind the prebuilt SQLite backend, so eager-loading it here would
// parse ~110k entries during startup and stall the JS thread.
if (Platform.OS === 'web') {
  dictionaryService.initialize().catch(console.error);
}
