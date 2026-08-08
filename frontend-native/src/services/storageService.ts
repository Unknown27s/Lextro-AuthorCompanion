/**
 * Unified Storage Service (React Native)
 *
 * Ported from the Dexie/IndexedDB version. Uses AsyncStorage as the primary
 * storage mechanism, which is the React Native standard for key-value persistence.
 * Retains the same async API surface so consumers (api/client.ts) need minimal changes.
 *
 * For large data like the compressed dictionary, expo-file-system is used
 * via wordLoadingService separately. This service is for app data (vocab items,
 * practice stats, settings, sync queue).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

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

const LOCAL_STORAGE_LIMIT = 5_242_880; // 5MB rough limit
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days default

class StorageService {
  private isSyncing = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Initialize storage service.
   * Sets up event listeners for online/offline sync.
   */
  async init(): Promise<void> {
    // AsyncStorage is ready by default in RN
    console.log('[storage] Storage service initialized');

    // Periodic sync every 30 seconds
    this.syncInterval = setInterval(() => {
      this.syncQueue();
    }, 30_000);
  }

  /**
   * Determine if data should use the "large data" path.
   * In RN, AsyncStorage handles both small and large data, but we keep
   * the threshold check for compatibility with the original logic.
   */
  private shouldUseLargeStorage(dataSize: number): boolean {
    return dataSize > 100_000;
  }

  /**
   * Store data — auto-selects the optimal path.
   * AsyncStorage handles the storage; we wrap for TTL support.
   */
  async setItem(key: string, data: any, ttlDays: number = 7): Promise<void> {
    const dataSize = JSON.stringify(data).length;

    const storedItem: StoredItem = {
      id: `${key}-${Date.now()}`,
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlDays * CACHE_TTL,
    };

    try {
      await AsyncStorage.setItem(`storage_${key}`, JSON.stringify(storedItem));
    } catch (error) {
      console.warn(`[storage] Failed to store "${key}":`, error);
    }
  }

  /**
   * Retrieve data with TTL check.
   */
  async getItem(key: string): Promise<any> {
    try {
      const raw = await AsyncStorage.getItem(`storage_${key}`);
      if (!raw) return null;

      const item: StoredItem = JSON.parse(raw);

      // Check expiry
      if (item.expiresAt && item.expiresAt < Date.now()) {
        await this.removeItem(key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn(`[storage] Failed to retrieve "${key}":`, error);
      return null;
    }
  }

  /**
   * Remove item from storage
   */
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`storage_${key}`);
    } catch (error) {
      console.warn(`[storage] Failed to remove "${key}":`, error);
    }
  }

  /**
   * Clear expired items
   */
  async clearExpired(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const storageKeys = keys.filter((k) => k.startsWith('storage_'));
      const now = Date.now();

      for (const key of storageKeys) {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) continue;
        const item: StoredItem = JSON.parse(raw);
        if (item.expiresAt && item.expiresAt < now) {
          await AsyncStorage.removeItem(key);
        }
      }

      console.log('[storage] Cleared expired items');
    } catch (error) {
      console.error('[storage] Failed to clear expired:', error);
    }
  }

  /**
   * Add an item to the sync queue (for offline-first support)
   */
  async addToSyncQueue(action: string, data: any): Promise<void> {
    const syncItem: SyncQueueItem = {
      id: `${action}-${Date.now()}`,
      action,
      data,
      timestamp: Date.now(),
      attempts: 0,
    };

    try {
      const existing = await AsyncStorage.getItem('syncQueue');
      const queue: SyncQueueItem[] = existing ? JSON.parse(existing) : [];
      queue.push(syncItem);
      await AsyncStorage.setItem('syncQueue', JSON.stringify(queue));

      // Try to sync immediately if online
      await this.syncQueue();
    } catch (error) {
      console.warn('[storage] Failed to add to sync queue:', error);
    }
  }

  /**
   * Process sync queue
   */
  async syncQueue(): Promise<void> {
    if (this.isSyncing) return;

    this.isSyncing = true;
    try {
      const raw = await AsyncStorage.getItem('syncQueue');
      if (!raw) {
        this.isSyncing = false;
        return;
      }

      const queue: SyncQueueItem[] = JSON.parse(raw);
      if (queue.length === 0) {
        this.isSyncing = false;
        return;
      }

      console.log(`[storage] Syncing ${queue.length} items...`);

      for (const item of queue) {
        try {
          await this.processQueueItem(item);
          // Remove synced item
          const updated = queue.filter((i) => i.id !== item.id);
          await AsyncStorage.setItem('syncQueue', JSON.stringify(updated));
          console.log(`[storage] Synced: ${item.action}`);
        } catch (error) {
          const updated = queue.map((i) => {
            if (i.id === item.id) {
              return { ...i, attempts: i.attempts + 1 };
            }
            return i;
          });

          // Remove after 3 attempts
          const filtered = updated.filter((i) => i.attempts < 3);
          await AsyncStorage.setItem('syncQueue', JSON.stringify(filtered));
        }
      }

      console.log('[storage] Sync completed');
    } catch (error) {
      console.error('[storage] Sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Process individual sync queue item.
   * In a full backend implementation, this would POST changes to a server.
   * For the offline-first mobile app, this is a no-op placeholder.
   */
  private async processQueueItem(item: SyncQueueItem): Promise<void> {
    switch (item.action) {
      case 'save_vocab':
        console.log('[storage] Processing vocab save:', item.data);
        break;
      case 'update_vocab':
        console.log('[storage] Processing vocab update:', item.data);
        break;
      case 'delete_vocab':
        console.log('[storage] Processing vocab delete:', item.data);
        break;
      default:
        console.warn(`[storage] Unknown action: ${item.action}`);
    }
  }

  /**
   * Get storage stats
   */
  async getStorageStats(): Promise<{ asyncStorage: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return { asyncStorage: keys.length };
    } catch {
      return { asyncStorage: 0 };
    }
  }

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    await AsyncStorage.clear();
    console.log('[storage] All storage cleared');
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
storageService.init().catch(console.error);
