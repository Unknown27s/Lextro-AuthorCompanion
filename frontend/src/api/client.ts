import axios from 'axios';
import { wordLoadingService } from '../services/wordLoadingService';
import { storageService } from '../services/storageService';

// ✅ FREE Dictionary API - https://dictionaryapi.dev/ (no auth required!)
const DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';

export const dictionaryClient = axios.create({
    baseURL: DICTIONARY_API,
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface VocabItem {
    id: string;
    word: string;
    pos: string;
    difficulty: 'easy' | 'medium' | 'hard';
    definition: string;
    example_corpus: string;
    ai_example: string;
    synonyms: string[];
    antonyms?: string[];
    relatedWords?: string[];
    tags: string[];
    created_at: string;
    // Word tracking metadata
    isTracked?: boolean;
    duplicateOf?: string; // References primary word if this is a duplicate
    similarMeanings?: string[]; // Other word IDs with same meaning
}

export interface FeedResponse {
    items: VocabItem[];
    nextCursor: string | null;
}

// ✅ Optimized API layer using new services
export const dictionaryApi = {
    // Fast O(1) word lookup using optimized services
    getWord: async (word: string): Promise<any> => {
        const normalizedWord = word.toLowerCase().trim();

        if (!normalizedWord) {
            throw new Error('Word cannot be empty');
        }

        // 1. Check Storage cache first (fastest)
        try {
            const cachedData = await storageService.getItem(`word_${normalizedWord}`);
            if (cachedData) {
                console.log('⚡ Found in cache:', normalizedWord);
                return cachedData;
            }
        } catch (error) {
            console.warn('Failed to access cache:', error);
        }

        // 2. Check local indexed dictionary (instant, no network)
        try {
            const wordData = await wordLoadingService.getWord(normalizedWord);
            if (wordData) {
                console.log('✅ Found in offline dictionary:', normalizedWord);
                // Cache for future use
                await storageService.setItem(`word_${normalizedWord}`, wordData, 30);
                return wordData;
            }
        } catch (error) {
            console.warn('Failed to load offline dictionary:', error);
        }

        // 3. Fallback to online API
        try {
            console.log('🌐 Fetching from API:', normalizedWord);
            const response = await dictionaryClient.get(`/${normalizedWord}`);
            if (!response.data || response.data.length === 0) {
                throw new Error('Word not found');
            }

            const apiData = response.data[0];
            await storageService.setItem(`word_${normalizedWord}`, apiData, 30);
            return apiData;
        } catch (error) {
            console.error('Dictionary lookup failed:', error);
            throw error;
        }
    },

    // Transform API data to VocabItem
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

    // Get dictionary source for a word
    getWordSource: async (word: string): Promise<'offline' | 'cache' | 'online' | 'unknown'> => {
        const normalizedWord = word.toLowerCase().trim();

        try {
            if (localStorage.getItem(`dict_cache_${normalizedWord}`)) {
                return 'cache';
            }
        } catch (error) {
            console.warn('Failed to check cache:', error);
        }

        try {
            const data = await loadApiFormatDictionary();
            if (data && data.index[normalizedWord] !== undefined) {
                return 'offline';
            }
        } catch (error) {
            console.warn('Failed to check offline dictionary:', error);
        }

        return 'unknown';
    },

    // Get words by category
    getWordsByCategory: async (category: string): Promise<string[]> => {
        return wordLoadingService.getWordsByCategory(category);
    },

    // Search within a category
    searchInCategory: async (searchTerm: string, category: string): Promise<any[]> => {
        const words = await wordLoadingService.getWordsByCategory(category);
        const normalizedTerm = searchTerm.toLowerCase().trim();

        return words
            .filter(word => word.includes(normalizedTerm))
            .slice(0, 10)
            .map(word => ({ word, definition: 'See word details for full definition' }));
    },

    // Get category for a word (simplified)
    getWordCategory: async (word: string): Promise<string | null> => {
        const wordData = await dictionaryApi.getWord(word);
        return wordData?.tags?.[0] || null;
    },

    // Clear dictionary cache
    clearCache: async (): Promise<void> => {
        await storageService.clear();
        await wordLoadingService.clearCache();
        console.log('✅ Dictionary cache cleared');
    },
};

// ✅ LOCAL STORAGE API - Now uses optimized storage service
export const localStorageApi = {
    // Get user's saved vocabulary
    getUserVocab: (): any[] => {
        const data = localStorage.getItem('userVocab');
        return data ? JSON.parse(data) : [];
    },

    // Save a word
    saveVocab: (vocabItemId: string, vocabItem: VocabItem, status = 'saved'): any => {
        const userVocab = localStorageApi.getUserVocab();
        const exists = userVocab.find((uv: any) => uv.vocab_item_id === vocabItemId);

        if (exists) {
            exists.status = status;
        } else {
            userVocab.push({
                id: `${vocabItemId}-${Date.now()}`,
                vocab_item_id: vocabItemId,
                vocab_item: vocabItem,
                status,
                practice_score: 0,
                added_at: new Date().toISOString(),
            });
        }

        localStorage.setItem('userVocab', JSON.stringify(userVocab));

        // Also sync to storage service in background
        storageService.addToSyncQueue('save_vocab', { vocab_item_id: vocabItemId, vocab_item: vocabItem, status }).catch(console.warn);

        return userVocab.find((uv: any) => uv.vocab_item_id === vocabItemId);
    },

    // Remove saved word
    removeVocab: (userVocabId: string): void => {
        let userVocab = localStorageApi.getUserVocab();
        userVocab = userVocab.filter((uv: any) => uv.id !== userVocabId);
        localStorage.setItem('userVocab', JSON.stringify(userVocab));

        // Sync removal
        storageService.addToSyncQueue('delete_vocab', { user_vocab_id: userVocabId }).catch(console.warn);
    },

    // Update practice score
    updatePracticeScore: (userVocabId: string, isCorrect: boolean): void => {
        const userVocab = localStorageApi.getUserVocab();
        const item = userVocab.find((uv: any) => uv.id === userVocabId);
        if (item) {
            item.practice_score = item.practice_score * 0.8 + (isCorrect ? 1 : 0) * 0.2;
            localStorage.setItem('userVocab', JSON.stringify(userVocab));
        }
    },

    // Get practice stats
    getPracticeStats: (vocabItemId: string): any => {
        const results = localStorage.getItem(`practice_${vocabItemId}`);
        const attempts = results ? JSON.parse(results) : [];
        const correctCount = attempts.filter((a: any) => a.correct).length;

        return {
            totalAttempts: attempts.length,
            correctAttempts: correctCount,
            successRate: attempts.length > 0 ? (correctCount / attempts.length) * 100 : 0,
        };
    },

    // Add practice attempt
    addPracticeAttempt: (vocabItemId: string, correct: boolean): void => {
        const key = `practice_${vocabItemId}`;
        const results = localStorage.getItem(key);
        const attempts = results ? JSON.parse(results) : [];
        attempts.push({ correct, timestamp: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(attempts.slice(-100))); // Keep last 100
    },
};
