/**
 * Wordnik API Service
 * Provides access to Wordnik's comprehensive word database
 */

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

    private constructor() { }

    static getInstance(): WordnikService {
        if (!WordnikService.instance) {
            WordnikService.instance = new WordnikService();
        }
        return WordnikService.instance;
    }

    /**
     * Get word of the day from Wordnik
     */
    async getWordOfDay(): Promise<WordnikWord | null> {
        try {
            const response = await fetch(
                `${WORDNIK_BASE_URL}/words.json/randomWord?hasDictionaryDef=true&api_key=${WORDNIK_API_KEY}`
            );

            if (!response.ok) {
                console.error('Wordnik API error:', response.statusText);
                return null;
            }

            const randomWord = await response.json();
            return await this.getWordDetails(randomWord.word);
        } catch (error) {
            console.error('Failed to fetch word of day:', error);
            return null;
        }
    }

    /**
     * Get detailed information about a specific word
     */
    async getWordDetails(word: string): Promise<WordnikWord | null> {
        try {
            const params = new URLSearchParams({
                api_key: WORDNIK_API_KEY,
                useCanonical: 'true',
                includeDictionaries: 'all',
            });

            const url = `${WORDNIK_BASE_URL}/word/${encodeURIComponent(word)}/definitions?${params}`;

            const response = await fetch(url);

            if (!response.ok) {
                console.error('Failed to fetch word details:', response.statusText);
                return null;
            }

            const definitions = await response.json();

            if (!definitions || definitions.length === 0) {
                return null;
            }

            // Fetch additional data in parallel
            const [examples, relatedWords, pronunciations, frequency] = await Promise.all([
                this.getExamples(word),
                this.getRelatedWords(word),
                this.getPronunciations(word),
                this.getFrequency(word),
            ]);

            return {
                word,
                definitions: definitions.slice(0, 5), // Limit to 5 definitions
                examples: examples || [],
                relatedWords: relatedWords || [],
                pronunciations: pronunciations || [],
                frequency: frequency || { frequency: 0, normalizedFrequency: 0 },
            };
        } catch (error) {
            console.error('Failed to fetch word details:', error);
            return null;
        }
    }

    /**
     * Get example sentences for a word
     */
    private async getExamples(word: string): Promise<WordnikExample[]> {
        try {
            const params = new URLSearchParams({
                api_key: WORDNIK_API_KEY,
                limit: '5',
            });

            const response = await fetch(
                `${WORDNIK_BASE_URL}/word/${encodeURIComponent(word)}/examples?${params}`
            );

            if (!response.ok) return [];

            const data = await response.json();
            return data.examples || [];
        } catch (error) {
            console.error('Failed to fetch examples:', error);
            return [];
        }
    }

    /**
     * Get related words (synonyms, antonyms, etc.)
     */
    private async getRelatedWords(word: string): Promise<WordnikRelated[]> {
        try {
            const params = new URLSearchParams({
                api_key: WORDNIK_API_KEY,
                useCanonical: 'true',
            });

            const response = await fetch(
                `${WORDNIK_BASE_URL}/word/${encodeURIComponent(word)}/relatedWords?${params}`
            );

            if (!response.ok) return [];

            return await response.json();
        } catch (error) {
            console.error('Failed to fetch related words:', error);
            return [];
        }
    }

    /**
     * Get pronunciations for a word
     */
    private async getPronunciations(word: string): Promise<WordnikPronunciation[]> {
        try {
            const params = new URLSearchParams({
                api_key: WORDNIK_API_KEY,
                typeFormat: 'IPA',
                limit: '3',
            });

            const response = await fetch(
                `${WORDNIK_BASE_URL}/word/${encodeURIComponent(word)}/pronunciations?${params}`
            );

            if (!response.ok) return [];

            return await response.json();
        } catch (error) {
            console.error('Failed to fetch pronunciations:', error);
            return [];
        }
    }

    /**
     * Get word frequency data
     */
    private async getFrequency(word: string): Promise<any> {
        try {
            const params = new URLSearchParams({
                api_key: WORDNIK_API_KEY,
                useCanonical: 'true',
                startYear: '2010',
                endYear: '2023',
            });

            const response = await fetch(
                `${WORDNIK_BASE_URL}/word/${encodeURIComponent(word)}/frequency?${params}`
            );

            if (!response.ok) return null;

            const data = await response.json();
            return data.frequency || null;
        } catch (error) {
            console.error('Failed to fetch frequency:', error);
            return null;
        }
    }

    /**
     * Search for words by pattern (expression, synonym, etc.)
     */
    async searchWords(query: string, limit: number = 10): Promise<string[]> {
        try {
            const params = new URLSearchParams({
                api_key: WORDNIK_API_KEY,
                limit: limit.toString(),
                includePartOfSpeech: 'adjective,verb,noun',
            });

            const response = await fetch(
                `${WORDNIK_BASE_URL}/words?q=${encodeURIComponent(query)}&${params}`
            );

            if (!response.ok) return [];

            const data = await response.json();
            return data.searchResults?.map((result: any) => result.word) || [];
        } catch (error) {
            console.error('Failed to search words:', error);
            return [];
        }
    }

    /**
     * Get synonyms for a word
     */
    async getSynonyms(word: string, limit: number = 10): Promise<string[]> {
        try {
            const relatedWords = await this.getRelatedWords(word);
            const synonyms = relatedWords.find((r) => r.relationshipType === 'synonym');
            return synonyms?.words.slice(0, limit) || [];
        } catch (error) {
            console.error('Failed to get synonyms:', error);
            return [];
        }
    }

    /**
     * Get antonyms for a word
     */
    async getAntonyms(word: string, limit: number = 10): Promise<string[]> {
        try {
            const relatedWords = await this.getRelatedWords(word);
            const antonyms = relatedWords.find((r) => r.relationshipType === 'antonym');
            return antonyms?.words.slice(0, limit) || [];
        } catch (error) {
            console.error('Failed to get antonyms:', error);
            return [];
        }
    }
}

export const wordnikService = WordnikService.getInstance();
