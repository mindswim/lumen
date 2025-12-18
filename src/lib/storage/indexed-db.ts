// IndexedDB storage for persisting gallery images locally
// This provides localStorage-like persistence but with much larger capacity (50MB+)

const DB_NAME = 'lumen-editor';
const DB_VERSION = 1;
const IMAGES_STORE = 'images';

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
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create images store if it doesn't exist
      if (!db.objectStoreNames.contains(IMAGES_STORE)) {
        const store = db.createObjectStore(IMAGES_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
  });

  return dbPromise;
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
