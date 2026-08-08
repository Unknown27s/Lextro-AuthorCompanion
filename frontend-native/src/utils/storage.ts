/**
 * Storage Utility for React Native
 * 
 * Provides a localStorage-compatible synchronous API backed by AsyncStorage.
 * Services that previously used the browser's global `localStorage` can import
 * this module's `localStorage` export with zero logic changes.
 *
 * Pattern: in-memory cache hydrated from AsyncStorage on startup,
 * writes go to both cache (sync) and AsyncStorage (async).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory cache — mimics window.localStorage behavior
const cache = new Map<string, string>();
let isHydrated = false;

/**
 * Hydrate the in-memory cache from persistent storage.
 * Call this once at app startup before any service reads localStorage.
 */
export const hydrateStorage = async (): Promise<void> => {
  if (isHydrated) return;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const pairs = await AsyncStorage.multiGet([...keys]);
    for (const [key, value] of pairs) {
      if (value !== null) cache.set(key, value);
    }
    isHydrated = true;
  } catch (e) {
    console.warn('[storage] Failed to hydrate cache:', e);
    isHydrated = true; // mark as hydrated so we don't retry on every access
  }
};

/**
 * Synchronous localStorage-compatible API.
 * All methods match the Web Storage interface exactly.
 */
export const localStorage = {
  getItem: (key: string): string | null => {
    return cache.get(key) ?? null;
  },

  setItem: (key: string, value: string): void => {
    cache.set(key, value);
    // Persist asynchronously — fire-and-forget
    AsyncStorage.setItem(key, value).catch((e) => {
      console.warn(`[storage] Failed to persist key "${key}":`, e);
    });
  },

  removeItem: (key: string): void => {
    cache.delete(key);
    AsyncStorage.removeItem(key).catch((e) => {
      console.warn(`[storage] Failed to remove key "${key}":`, e);
    });
  },

  clear: (): void => {
    cache.clear();
    AsyncStorage.clear().catch((e) => {
      console.warn('[storage] Failed to clear storage:', e);
    });
  },

  get length(): number {
    return cache.size;
  },

  key: (index: number): string | null => {
    const keys = Array.from(cache.keys());
    return keys[index] ?? null;
  },
};

/**
 * Async storage helpers for larger data (dictionary cache, etc.)
 * Wraps AsyncStorage directly for operations that need async/await.
 */
export const AsyncStorageDB = {
  async getKeys(pattern: string = ''): Promise<string[]> {
    const keys = await AsyncStorage.getAllKeys();
    return pattern ? keys.filter((k) => k.includes(pattern)) : [...keys];
  },

  async get<T>(key: string): Promise<T | null> {
    const value = await AsyncStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  },

  async set<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    cache.set(key, JSON.stringify(value));
  },

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    cache.delete(key);
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.clear();
    cache.clear();
  },
};
