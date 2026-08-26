// Legacy browser storage retained only for one-time migration into the shared local workspace.

const DB_NAME = 'lumen-editor';
const DB_VERSION = 2;
const IMAGES_STORE = 'images';
const WORKSPACE_STORE = 'workspace';
const STORYBOARD_STATE_KEY = 'storyboards';

export interface StoredImage {
  id: string;
  fileName: string;
  dataUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  editState: unknown; // EditState type
  createdAt: number;
  updatedAt: number;
  sourceUrl?: string;
  sourceProvider?: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create images store if it doesn't exist
      if (!db.objectStoreNames.contains(IMAGES_STORE)) {
        const store = db.createObjectStore(IMAGES_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(WORKSPACE_STORE)) {
        db.createObjectStore(WORKSPACE_STORE, { keyPath: 'key' });
      }
    };
  });

  return dbPromise;
}

interface StoredWorkspaceValue<T> {
  key: string;
  value: T;
  updatedAt: number;
}

export async function getStoryboardState<T>(): Promise<T | null> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(WORKSPACE_STORE, 'readonly');
    const request = transaction.objectStore(WORKSPACE_STORE).get(STORYBOARD_STATE_KEY);

    request.onsuccess = () => resolve((request.result as StoredWorkspaceValue<T> | undefined)?.value ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveStoryboardState<T>(value: T): Promise<number> {
  const db = await getDB();
  const updatedAt = Date.now();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(WORKSPACE_STORE, 'readwrite');
    transaction.objectStore(WORKSPACE_STORE).put({ key: STORYBOARD_STATE_KEY, value, updatedAt });
    transaction.oncomplete = () => resolve(updatedAt);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error('Storyboard save was aborted'));
  });
}

export async function saveImage(image: StoredImage): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGES_STORE, 'readwrite');
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.put(image);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Failed to save image:', request.error);
      reject(request.error);
    };
  });
}

export async function saveImages(images: StoredImage[]): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGES_STORE, 'readwrite');
    const store = transaction.objectStore(IMAGES_STORE);

    let completed = 0;
    let hasError = false;

    for (const image of images) {
      const request = store.put(image);

      request.onsuccess = () => {
        completed++;
        if (completed === images.length && !hasError) {
          resolve();
        }
      };

      request.onerror = () => {
        if (!hasError) {
          hasError = true;
          console.error('Failed to save image:', request.error);
          reject(request.error);
        }
      };
    }

    // Handle empty array
    if (images.length === 0) {
      resolve();
    }
  });
}

export async function getImage(id: string): Promise<StoredImage | undefined> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGES_STORE, 'readonly');
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.error('Failed to get image:', request.error);
      reject(request.error);
    };
  });
}

export async function getAllImages(): Promise<StoredImage[]> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGES_STORE, 'readonly');
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => {
      console.error('Failed to get all images:', request.error);
      reject(request.error);
    };
  });
}

export async function deleteImage(id: string): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGES_STORE, 'readwrite');
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Failed to delete image:', request.error);
      reject(request.error);
    };
  });
}

export async function deleteImages(ids: string[]): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGES_STORE, 'readwrite');
    const store = transaction.objectStore(IMAGES_STORE);

    let completed = 0;
    let hasError = false;

    for (const id of ids) {
      const request = store.delete(id);

      request.onsuccess = () => {
        completed++;
        if (completed === ids.length && !hasError) {
          resolve();
        }
      };

      request.onerror = () => {
        if (!hasError) {
          hasError = true;
          console.error('Failed to delete image:', request.error);
          reject(request.error);
        }
      };
    }

    // Handle empty array
    if (ids.length === 0) {
      resolve();
    }
  });
}

export async function clearAllImages(): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGES_STORE, 'readwrite');
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Failed to clear images:', request.error);
      reject(request.error);
    };
  });
}

// Get storage usage estimate
export async function getStorageEstimate(): Promise<{ used: number; quota: number } | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return null;
}

// Request persistent storage (won't be cleared by browser)
export async function requestPersistentStorage(): Promise<boolean> {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    return navigator.storage.persist();
  }
  return false;
}

export async function isPersistentStorageGranted(): Promise<boolean | null> {
  if ('storage' in navigator && 'persisted' in navigator.storage) {
    return navigator.storage.persisted();
  }
  return null;
}
