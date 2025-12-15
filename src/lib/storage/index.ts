/**
 * Storage abstraction layer
 *
 * Currently uses localStorage, but can be swapped for API/database storage
 * by implementing the StorageAdapter interface and changing the export.
 */

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

// LocalStorage implementation
const localStorageAdapter: StorageAdapter = {
  async get<T>(key: string): Promise<T | null> {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or other error - silently fail for now
    }
  },

  async remove(key: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },
};

// Export current adapter (swap this for API storage later)
export const storage = localStorageAdapter;

// Storage keys
export const STORAGE_KEYS = {
  USER_PRESETS: 'lumen-user-presets',
  UI_PREFERENCES: 'lumen-ui-preferences',
  RECENT_PRESETS: 'lumen-recent-presets',
} as const;
