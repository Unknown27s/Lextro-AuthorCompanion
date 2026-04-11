/**
 * Unified Dictionary Service
 * Manages word loading, categories, and classification
 * Uses WordLoadingService for efficient chunked loading
 */

import { wordLoadingService } from './wordLoadingService';

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

    /**
     * Initialize dictionary service
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            console.log('📚 Dictionary Service: Initializing...');
            await wordLoadingService.initialize();
            this.isInitialized = true;
            console.log('✅ Dictionary service ready');
        } catch (error) {
            console.error('Failed to initialize dictionary:', error);
        }
    }

    /**
     * Get all words available
     */
    async getAllWords(): Promise<string[]> {
        if (!this.isInitialized) await this.initialize();
        return this.allWords;
    }

    /**
     * Get words from a specific category
     */
    async getWordsByCategory(category: string, limit: number = 50): Promise<string[]> {
        if (!this.isInitialized) await this.initialize();
        return wordLoadingService.getWordsByCategory(category);
    }

    /**
     * Get a random word from a category
     */
    async getRandomWord(category: string = 'random'): Promise<string> {
        const words = await this.getWordsByCategory(category, 100);
        return words[Math.floor(Math.random() * words.length)] || 'vocabulary';
    }

    /**
     * Get random words
     */
    async getRandomWords(count: number = 5): Promise<any[]> {
        if (!this.isInitialized) await this.initialize();
        return wordLoadingService.getRandomWords(count);
    }

    /**
     * Get words by learning purpose
     */
    async getWordsByPurpose(purpose: 'writing' | 'interviews' | 'exams' | 'presentation' | 'creative' = 'writing'): Promise<string[]> {
        if (!this.isInitialized) await this.initialize();

        // For now, return all words (can be filtered based on purpose in future)
        console.log(`📖 Loading words for purpose: ${purpose}`);
        const words = await wordLoadingService.getPaginatedWords(0, 1000);
        return words.map(w => w.word);
    }

    /**
     * Search by prefix
     */
    async searchByPrefix(prefix: string, limit: number = 10): Promise<string[]> {
        if (!this.isInitialized) await this.initialize();
        return wordLoadingService.searchByPrefix(prefix, limit);
    }

    /**
     * Get paginated words
     */
    async getPaginatedWords(page: number = 0, pageSize?: number): Promise<any[]> {
        if (!this.isInitialized) await this.initialize();
        return wordLoadingService.getPaginatedWords(page, pageSize);
    }

    /**
     * Get total words count
     */
    async getTotalWordCount(): Promise<number> {
        if (!this.isInitialized) await this.initialize();
        return wordLoadingService.getTotalWordsCount();
    }
}

// Export singleton instance
export const dictionaryService = new DictionaryService();

// Auto-initialize on import
if (typeof window !== 'undefined') {
    dictionaryService.initialize().catch(console.error);
}

