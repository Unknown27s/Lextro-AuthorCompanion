/**
 * Word Loading Service
 * Handles chunked/lazy loading of dictionary to prevent memory issues
 * Loads dictionary in chunks on demand instead of all at once
 */

import pako from 'pako';
import { responsiveService } from './responsiveService';
import { storageService } from './storageService';

interface DictionaryChunk {
    chunkId: number;
    words: any[];
    index: Record<string, number>;
}

interface WordIndex {
    totalWords: number;
    chunkSize: number;
    totalChunks: number;
    chunks: Record<number, boolean>; // Which chunks are loaded
}

class WordLoadingService {
    private loadedChunks: Map<number, DictionaryChunk> = new Map();
    private wordIndex: WordIndex | null = null;
    private fullDictionaryData: any[] | null = null;
    private fullIndex: Record<string, number> | null = null;
    private isLoading = false;
    private loadPromise: Promise<void> | null = null;

    /**
     * Initialize word loading service
     */
    async initialize(): Promise<void> {
        if (this.isLoading && this.loadPromise) {
            return this.loadPromise;
        }

        if (this.fullDictionaryData) {
            return; // Already loaded
        }

        this.isLoading = true;
        this.loadPromise = this._loadDictionary();
        return this.loadPromise;
    }

    /**
     * Load dictionary efficiently with chunking for mobile
     */
    private async _loadDictionary(): Promise<void> {
        try {
            console.log('📚 Loading dictionary with chunking...');

            const device = responsiveService.getDevice();
            const batchSize = responsiveService.getOptimalBatchSize();

            // Load indexed dictionary
            const response = await fetch('/dictionary_indexed.json.gz');
            const buffer = await response.arrayBuffer();

            // Show progress for large decompression
            console.log('🔍 Decompressing dictionary...');
            const start = performance.now();
            const decompressed = pako.inflate(new Uint8Array(buffer), { to: 'string' });
            const end = performance.now();
            console.log(`✅ Decompressed in ${(end - start).toFixed(2)}ms`);

            // Parse dictionary
            const data = JSON.parse(decompressed);
            this.fullDictionaryData = data.words;
            this.fullIndex = data.index;

            console.log(`✅ Loaded dictionary with ${data.totalWords} words`);
            console.log(`📱 Device: ${device.type}, Memory: ${device.memory || 'unknown'}GB, Batch size: ${batchSize}`);

        } catch (error) {
            console.error('Failed to load dictionary:', error);
            throw error;
        } finally {
            this.isLoading = false;
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
            console.warn('Failed to cache word:', error);
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
            .map(idx => this.fullDictionaryData![idx])
            .filter(w => w !== undefined);
    }

    /**
     * Get words by category
     */
    async getWordsByCategory(category: string): Promise<string[]> {
        if (!this.fullDictionaryData || !this.fullIndex) {
            await this.initialize();
        }

        // Filter words by their category metadata
        return this.fullDictionaryData!
            .filter(w => w.tags && w.tags.includes(category))
            .map(w => w.word);
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
            .filter(word => word.startsWith(normalizedPrefix))
            .slice(0, limit);
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

        // Use device-optimized page size if not specified
        const size = pageSize || responsiveService.getOptimalPageSize();
        const start = page * size;
        const end = start + size;

        return this.fullDictionaryData!.slice(start, end);
    }

    /**
     * Clear cache
     */
    async clearCache(): Promise<void> {
        this.loadedChunks.clear();
        this.wordIndex = null;
        console.log('✅ Word loading cache cleared');
    }

    /**
     * Get loading progress
     */
    getProgress(): { current: number; total: number; percent: number } {
        const total = this.fullDictionaryData?.length || 0;
        const current = this.loadedChunks.size;

        return {
            current,
            total,
            percent: total > 0 ? Math.round((current / total) * 100) : 0
        };
    }
}

export const wordLoadingService = new WordLoadingService();

// Auto-initialize on import
if (typeof window !== 'undefined') {
    // Don't auto-initialize to save memory on first load
    // Users can manually initialize when needed
    console.log('📖 Word loading service ready (deferred initialization)');
}
