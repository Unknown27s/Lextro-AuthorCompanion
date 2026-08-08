/**
 * Wordnik API Service
 *
 * Ported from web version — uses fetch() which is polyfilled by Expo.
 * Minor change: imports types from centralized types module.
 *
 * NOTE: The embedded API key is carried over from the original project.
 * In production, this should be moved to a secure config or stripped out.
 */

import { dictionaryApi } from '../api/client';

const WORDNIK_API_KEY = 'g0npgoq8e7tiydyyolf6fclpfqkyhtaa8hi517xdfo16ojaa7';
const WORDNIK_BASE_URL = 'https://api.wordnik.com/v4';

export interface WordnikWord {
  word: string;
  definitions: WordnikDefinition[];
  examples: WordnikExample[];
  relatedWords: WordnikRelated[];
  pronunciations: WordnikPronunciation[];
  frequency: {
    frequency: number;
    normalizedFrequency: number;
  };
}

export interface WordnikDefinition {
  text: string;
  partOfSpeech: string;
  source?: string;
  note?: string;
}

export interface WordnikExample {
  text: string;
  title?: string;
  url?: string;
  rating?: number;
}

export interface WordnikRelated {
  relationshipType: string;
  words: string[];
}

export interface WordnikPronunciation {
  raw: string;
  rawType: string;
}

class WordnikService {
  private static instance: WordnikService;

  private constructor() {}

  static getInstance(): WordnikService {
    if (!WordnikService.instance) {
      WordnikService.instance = new WordnikService();
    }
    return WordnikService.instance;
  }

  async getWordOfDay(): Promise<WordnikWord | null> {
    try {
      const response = await fetch(
        `${WORDNIK_BASE_URL}/words.json/randomWord?hasDictionaryDef=true&api_key=${WORDNIK_API_KEY}`,
      );

      if (!response.ok) {
        console.error('[wordnik] API error:', response.statusText);
        return null;
      }

      const randomWord = await response.json();
      return await this.getWordDetails(randomWord.word);
    } catch (error) {
      console.error('[wordnik] Failed to fetch word of day:', error);
      return null;
    }
  }

  async getWordDetails(word: string): Promise<WordnikWord | null> {
    try {
      // Try local fallback first (faster, no CORS issues)
      const fallbackWord = await dictionaryApi.getWord(word);
      if (fallbackWord) {
        const fallbackDefinitions: WordnikDefinition[] = [
          {
            text: fallbackWord.definition,
            partOfSpeech: fallbackWord.pos || 'unknown',
            source: 'local-fallback',
          },
        ];

        const fallbackExamples: WordnikExample[] = [];
        if (fallbackWord.example_corpus) {
          fallbackExamples.push({
            text: fallbackWord.example_corpus,
            title: 'Corpus example',
          });
        }
        if (fallbackWord.ai_example) {
          fallbackExamples.push({
            text: fallbackWord.ai_example,
            title: 'Generated example',
          });
        }

        return {
          word,
          definitions: fallbackDefinitions,
          examples: fallbackExamples,
          relatedWords: fallbackWord.synonyms?.length
            ? [{ relationshipType: 'synonym', words: fallbackWord.synonyms }]
            : [],
          pronunciations: [],
          frequency: { frequency: 0, normalizedFrequency: 0 },
        };
      }

      const params = new URLSearchParams({
        api_key: WORDNIK_API_KEY,
        useCanonical: 'true',
        includeDictionaries: 'all',
      });

      const response = await fetch(
        `${WORDNIK_BASE_URL}/word/${encodeURIComponent(word)}/definitions?${params}`,
        { mode: 'cors' },
      );

      if (!response.ok) {
        console.error('[wordnik] Failed to fetch word details:', response.statusText);
        return null;
      }

      const definitions = await response.json();

      if (!definitions || definitions.length === 0) {
        return null;
      }

      const [examples, relatedWords, pronunciations, frequency] =
        await Promise.all([
          this.getExamples(word),
          this.getRelatedWords(word),
          this.getPronunciations(word),
          this.getFrequency(word),
        ]);

      return {
        word,
        definitions: definitions.slice(0, 5),
        examples: examples || [],
        relatedWords: relatedWords || [],
        pronunciations: pronunciations || [],
        frequency: frequency || { frequency: 0, normalizedFrequency: 0 },
      };
    } catch (error) {
      console.error('[wordnik] Failed to fetch word details:', error);
      return null;
    }
  }

  private async getExamples(word: string): Promise<WordnikExample[]> {
    try {
      const params = new URLSearchParams({
        api_key: WORDNIK_API_KEY,
        limit: '5',
      });

      const response = await fetch(
        `${WORDNIK_BASE_URL}/word/${encodeURIComponent(word)}/examples?${params}`,
      );

      if (!response.ok) return [];
      const data = await response.json();
      return data.examples || [];
    } catch (error) {
      console.error('[wordnik] Failed to fetch examples:', error);
      return [];
    }
  }

  private async getRelatedWords(word: string): Promise<WordnikRelated[]> {
    try {
      const params = new URLSearchParams({
        api_key: WORDNIK_API_KEY,
        useCanonical: 'true',
      });

      const response = await fetch(
        `${WORDNIK_BASE_URL}/word/${encodeURIComponent(word)}/relatedWords?${params}`,
      );

      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('[wordnik] Failed to fetch related words:', error);
      return [];
    }
  }

  private async getPronunciations(word: string): Promise<WordnikPronunciation[]> {
    try {
      const params = new URLSearchParams({
        api_key: WORDNIK_API_KEY,
        typeFormat: 'IPA',
        limit: '3',
      });

      const response = await fetch(
        `${WORDNIK_BASE_URL}/word/${encodeURIComponent(word)}/pronunciations?${params}`,
      );

      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('[wordnik] Failed to fetch pronunciations:', error);
      return [];
    }
  }

  private async getFrequency(word: string): Promise<any> {
    try {
      const params = new URLSearchParams({
        api_key: WORDNIK_API_KEY,
        useCanonical: 'true',
        startYear: '2010',
        endYear: '2023',
      });

      const response = await fetch(
        `${WORDNIK_BASE_URL}/word/${encodeURIComponent(word)}/frequency?${params}`,
      );

      if (!response.ok) return null;
      const data = await response.json();
      return data.frequency || null;
    } catch (error) {
      console.error('[wordnik] Failed to fetch frequency:', error);
      return null;
    }
  }

  async searchWords(query: string, limit: number = 10): Promise<string[]> {
    try {
      const params = new URLSearchParams({
        api_key: WORDNIK_API_KEY,
        limit: limit.toString(),
        includePartOfSpeech: 'adjective,verb,noun',
      });

      const response = await fetch(
        `${WORDNIK_BASE_URL}/words?q=${encodeURIComponent(query)}&${params}`,
      );

      if (!response.ok) return [];
      const data = await response.json();
      return data.searchResults?.map((result: any) => result.word) || [];
    } catch (error) {
      console.error('[wordnik] Failed to search words:', error);
      return [];
    }
  }

  async getSynonyms(word: string, limit: number = 10): Promise<string[]> {
    try {
      const relatedWords = await this.getRelatedWords(word);
      const synonyms = relatedWords.find(
        (r) => r.relationshipType === 'synonym',
      );
      return synonyms?.words.slice(0, limit) || [];
    } catch (error) {
      console.error('[wordnik] Failed to get synonyms:', error);
      return [];
    }
  }

  async getAntonyms(word: string, limit: number = 10): Promise<string[]> {
    try {
      const relatedWords = await this.getRelatedWords(word);
      const antonyms = relatedWords.find(
        (r) => r.relationshipType === 'antonym',
      );
      return antonyms?.words.slice(0, limit) || [];
    } catch (error) {
      console.error('[wordnik] Failed to get antonyms:', error);
      return [];
    }
  }
}

export const wordnikService = WordnikService.getInstance();
