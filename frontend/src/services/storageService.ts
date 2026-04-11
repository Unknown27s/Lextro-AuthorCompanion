/**
 * Unified Storage Service
 * Manages both localStorage (small data) and IndexedDB (large data)
 * Auto-selects optimal storage method based on data size
 */

import Dexie, { Table } from 'dexie';

interface StoredItem {
    id: string;
    key: string;
    data: any;
    timestamp: number;
    expiresAt?: number;
}

interface SyncQueueItem {
    id: string;
    action: string;
    data: any;
    timestamp: number;
    attempts: number;
}

interface StorageDB extends Dexie {
    items: Table<StoredItem>;
    syncQueue: Table<SyncQueueItem>;
}

class StorageService {
    private db: StorageDB | null = null;
    private isSyncing = false;
    private syncInterval: NodeJS.Timeout | null = null;
    private readonly LOCAL_STORAGE_LIMIT = 5242880; // 5MB rough limit
    private readonly CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days default

    async init(): Promise<void> {
        try {
            const db = new Dexie('AuthorCompanion') as StorageDB;

            db.version(1).stores({
                items: 'id, timestamp, key',
                syncQueue: 'id, timestamp'
            });

            this.db = db;
            console.log('✅ Storage service initialized');

            // Setup sync on online event
            window.addEventListener('online', () => this.syncQueue());
            window.addEventListener('offline', () => console.log('📡 Offline mode'));

            // Periodic sync every 30 seconds
            this.syncInterval = setInterval(() => {
                if (navigator.onLine) this.syncQueue();
            }, 30000);
        } catch (error) {
            console.error('Failed to initialize storage:', error);
        }
    }

    /**
     * Gets current storage size used (localStorage)
     */
    private getLocalStorageSize(): number {
        return JSON.stringify(localStorage).length;
    }

    /**
     * Determines if data should use IndexedDB
     */
    private shouldUseIndexedDB(dataSize: number): boolean {
        return dataSize > 100000 || this.getLocalStorageSize() > this.LOCAL_STORAGE_LIMIT * 0.8;
    }

    /**
     * Store data - auto-selects localStorage vs IndexedDB
     */
    async setItem(key: string, data: any, ttlDays: number = 7): Promise<void> {
        const dataSize = JSON.stringify(data).length;
        const shouldUseIDB = this.shouldUseIndexedDB(dataSize);

        if (shouldUseIDB) {
            // Use IndexedDB for large data
            if (!this.db) await this.init();
            await this.db?.items.put({
                id: `${key}-${Date.now()}`,
                key,
                data,
                timestamp: Date.now(),
                expiresAt: Date.now() + ttlDays * this.CACHE_TTL
            });
            console.log(`💾 Stored ${key} in IndexedDB (${dataSize} bytes)`);
        } else {
            // Use localStorage for small data
            try {
                localStorage.setItem(key, JSON.stringify(data));
                console.log(`⚡ Stored ${key} in localStorage`);
            } catch (error) {
                // Fall back to IndexedDB if localStorage is full
                console.warn('localStorage full, using IndexedDB:', error);
                if (!this.db) await this.init();
                await this.db?.items.put({
                    id: `${key}-${Date.now()}`,
                    key,
                    data,
                    timestamp: Date.now(),
                    expiresAt: Date.now() + ttlDays * this.CACHE_TTL
                });
            }
        }
    }

    /**
     * Retrieve data from optimal storage
     */
    async getItem(key: string): Promise<any> {
        // Try localStorage first
        try {
            const item = localStorage.getItem(key);
            if (item) {
                console.log(`⚡ Retrieved ${key} from localStorage`);
                return JSON.parse(item);
            }
        } catch (error) {
            console.warn('Failed to get from localStorage:', error);
        }

        // Try IndexedDB
        if (this.db) {
            const items = await this.db.items.where('key').equals(key).toArray();
            if (items.length > 0) {
                const item = items[items.length - 1]; // Get latest
                if (!item.expiresAt || item.expiresAt > Date.now()) {
                    console.log(`💾 Retrieved ${key} from IndexedDB`);
                    return item.data;
                }
            }
        }

        return null;
    }

    /**
     * Remove item from storage
     */
    async removeItem(key: string): Promise<void> {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn('Failed to remove from localStorage:', error);
        }

        if (this.db) {
            const items = await this.db.items.where('key').equals(key).toArray();
            for (const item of items) {
                await this.db.items.delete(item.id);
            }
        }
    }

    /**
     * Clear all expired items
     */
    async clearExpired(): Promise<void> {
        if (!this.db) return;

        const items = await this.db.items.toArray();
        const now = Date.now();

        for (const item of items) {
            if (item.expiresAt && item.expiresAt < now) {
                await this.db.items.delete(item.id);
            }
        }

        console.log('✅ Cleared expired items');
    }

    /**
     * Sync queue operations
     */
    async addToSyncQueue(action: string, data: any): Promise<void> {
        if (!this.db) await this.init();

        await this.db?.syncQueue.add({
            id: `${action}-${Date.now()}`,
            action,
            data,
            timestamp: Date.now(),
            attempts: 0
        });

        if (navigator.onLine) {
            await this.syncQueue();
        }
    }

    /**
     * Sync queue
     */
    async syncQueue(): Promise<void> {
        if (this.isSyncing || !this.db) return;

        this.isSyncing = true;
        try {
            const items = await this.db.syncQueue.toArray();
            if (items.length === 0) {
                this.isSyncing = false;
                return;
            }

            console.log(`🔄 Syncing ${items.length} items...`);

            for (const item of items) {
                try {
                    // Process sync item (typically word saves, updates, removals)
                    await this.processQueueItem(item);
                    await this.db.syncQueue.delete(item.id);
                    console.log(`✅ Synced: ${item.action}`);
                } catch (error) {
                    const updated = { ...item, attempts: item.attempts + 1 };
                    if (item.attempts >= 3) {
                        // Remove after 3 attempts
                        await this.db.syncQueue.delete(item.id);
                        console.error(`❌ Gave up syncing: ${item.id}`);
                    } else {
                        // Retry later
                        await this.db.syncQueue.put(updated);
                    }
                }
            }

            console.log('✅ Sync completed');
        } catch (error) {
            console.error('❌ Sync error:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Process individual sync queue item
     */
    private async processQueueItem(item: SyncQueueItem): Promise<void> {
        switch (item.action) {
            case 'save_vocab':
                console.log('Processing vocab save:', item.data);
                break;
            case 'update_vocab':
                console.log('Processing vocab update:', item.data);
                break;
            case 'delete_vocab':
                console.log('Processing vocab delete:', item.data);
                break;
            default:
                console.warn(`Unknown action: ${item.action}`);
        }
    }

    /**
     * Get storage stats
     */
    async getStorageStats(): Promise<{ localStorage: number; indexedDB: number }> {
        const lsSize = this.getLocalStorageSize();
        let idbSize = 0;

        if (this.db) {
            const items = await this.db.items.toArray();
            idbSize = JSON.stringify(items).length;
        }

        return { localStorage: lsSize, indexedDB: idbSize };
    }

    /**
     * Clear all storage
     */
    async clear(): Promise<void> {
        // Clear localStorage
        const keys = Object.keys(localStorage);
        keys.forEach(key => localStorage.removeItem(key));

        // Clear IndexedDB
        if (this.db) {
            await this.db.items.clear();
            await this.db.syncQueue.clear();
        }

        console.log('✅ All storage cleared');
    }

    /**
     * Cleanup on app exit
     */
    destroy(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
    }
}

export const storageService = new StorageService();

// Auto-initialize
if (typeof window !== 'undefined') {
    storageService.init().catch(console.error);
}
