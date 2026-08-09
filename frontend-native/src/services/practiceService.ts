/**
 * Practice Service — question builders for the three practice activities
 * (Definition Match, Speed Round, Author Guess) plus rolling accuracy tracking.
 *
 * Definition Match & Speed Round draw words from the user's saved vocabulary
 * (falling back to the bundled offline dictionary when saved words run thin)
 * and build 4-option definition questions with shuffled distractors.
 * Author Guess pulls from the curated public-domain quote dataset.
 */

import { localStorageApi } from '../api/client';
import { wordLoadingService } from './wordLoadingService';
import { sqliteService } from './sqliteService';
import { authorQuotes, authorNames } from '../data/authorQuotes';

export interface PracticeQuestion {
  id: string;
  prompt: string; // word (Definition Match / Speed Round) or quote (Author Guess)
  promptType: 'word' | 'quote';
  options: string[]; // 4 options
  correctIndex: number;
}

const ACCURACY_KEY = 'practiceAccuracy';
const MAX_ACCURACY_SAMPLES = 50;

export const practiceService = {
  /**
   * Pool of { word, definition } pairs: saved vocab first, then random
   * offline dictionary entries to pad the pool up to `minCount`.
   */
  async buildWordPool(minCount: number): Promise<{ word: string; definition: string }[]> {
    const pool: { word: string; definition: string }[] = [];

    const saved = localStorageApi.getUserVocab();
    saved.forEach((uv) => {
      const vocab = uv?.vocab_item;
      const def = String(vocab?.definition ?? '').trim();
      if (vocab?.word && def) {
        pool.push({ word: vocab.word, definition: def });
      }
    });

    if (pool.length < minCount) {
      try {
        // SQLite first: instant random rows from the prebuilt DB (no
        // 60MB in-memory dictionary load). Falls back to the in-memory
        // dictionary when SQLite isn't populated yet (e.g. web first run).
        const sqliteExtras = await sqliteService.getRandomWords(minCount * 2);
        sqliteExtras.forEach((entry) => {
          const def = String(entry?.definition ?? '').trim();
          if (entry?.word && def && !pool.some((p) => p.word === entry.word)) {
            pool.push({ word: entry.word, definition: def });
          }
        });
      } catch {
        // SQLite unavailable — continue with saved vocab only
      }
    }

    if (pool.length < minCount) {
      try {
        const extras = await wordLoadingService.getRandomWords(minCount * 2);
        extras.forEach((entry) => {
          const def = String(entry?.definition ?? '').trim();
          if (entry?.word && def && !pool.some((p) => p.word === entry.word)) {
            pool.push({ word: entry.word, definition: def });
          }
        });
      } catch {
        // offline dictionary unavailable — continue with saved vocab only
      }
    }

    return pool.slice(0, minCount);
  },

  buildQuestions(pool: { word: string; definition: string }[]): PracticeQuestion[] {
    return pool.map((entry, index) => {
      const distractors = pool
        .filter((p) => p.word !== entry.word)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((p) => p.definition);

      const options = [entry.definition, ...distractors];
      const correctIndex = 0;
      // Fisher-Yates shuffle keeping track of the correct answer
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      const movedCorrect = options.indexOf(entry.definition);

      return {
        id: `pq_${Date.now()}_${index}`,
        prompt: entry.word,
        promptType: 'word' as const,
        options,
        correctIndex: movedCorrect === -1 ? correctIndex : movedCorrect,
      };
    });
  },

  async buildDefinitionMatch(count = 10): Promise<PracticeQuestion[]> {
    const pool = await this.buildWordPool(count);
    return this.buildQuestions(pool);
  },

  async buildSpeedRound(count = 10): Promise<PracticeQuestion[]> {
    const pool = await this.buildWordPool(count);
    return this.buildQuestions(pool);
  },

  async buildAuthorGuess(count = 8): Promise<PracticeQuestion[]> {
    const shuffled = [...authorQuotes].sort(() => Math.random() - 0.5).slice(0, count);
    return shuffled.map((quote, index) => {
      const distractors = authorNames
        .filter((name) => name !== quote.author)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      const options = [quote.author, ...distractors];
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }

      return {
        id: `aq_${Date.now()}_${index}`,
        prompt: quote.quote,
        promptType: 'quote' as const,
        options,
        correctIndex: options.indexOf(quote.author),
      };
    });
  },

  recordAnswer(correct: boolean): void {
    const raw = localStorage.getItem(ACCURACY_KEY);
    const samples: boolean[] = raw ? JSON.parse(raw) : [];
    samples.push(correct);
    const trimmed = samples.slice(-MAX_ACCURACY_SAMPLES);
    localStorage.setItem(ACCURACY_KEY, JSON.stringify(trimmed));
  },

  getRollingAccuracy(): number {
    const raw = localStorage.getItem(ACCURACY_KEY);
    const samples: boolean[] = raw ? JSON.parse(raw) : [];
    if (samples.length === 0) return 0;
    const correct = samples.filter((s) => s).length;
    return Math.round((correct / samples.length) * 100);
  },

  clearAllData(): void {
    localStorage.removeItem(ACCURACY_KEY);
  },
};
