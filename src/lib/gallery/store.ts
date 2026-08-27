import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EditState, createDefaultEditState, ensureCompleteEditState } from '@/types/editor';
import {
  getAllImages,
  StoredImage,
} from '@/lib/storage/indexed-db';
import {
  deleteSharedImages,
  getSharedImages,
  saveSharedImage,
  saveSharedImages,
  uploadSharedImage,
} from '@/lib/storage/shared-workspace';
import { renderGalleryThumbnail } from '@/lib/editor/gallery-thumbnail';
import { getStoryboardImageIds, useStoryboardStore } from '@/lib/storyboard/store';

export interface GalleryImage {
  id: string;
  fileName: string;
  dataUrl: string; // Stable local workspace URL (legacy records may still be data URLs during migration)
  thumbnailUrl: string;
  width: number;
  height: number;
  editState: EditState;
  createdAt: number;
  updatedAt: number;
  sourceUrl?: string;
  sourceProvider?: string;
}

export interface RemoveImagesResult {
  removedIds: string[];
  protectedIds: string[];
}

interface GalleryStore {
  images: GalleryImage[];
  selectedIds: string[];
  activeImageId: string | null;
  gridColumns: number; // 1-8 columns
  isIsolated: boolean; // Isolate mode - show only isolated images
  isolatedIds: string[]; // IDs of images being isolated
  lastDeletedImages: GalleryImage[];
  isHydrated: boolean; // Whether shared workspace data has been loaded

  // Actions
  addImages: (files: File[]) => Promise<GalleryImage[]>;
  addImageFromUrl: (url: string, fileName: string, source?: { provider?: string; sourceUrl?: string }) => Promise<GalleryImage>;
  cloneImageVersion: (sourceImageId: string, editState: EditState, fileName?: string) => Promise<GalleryImage>;
  removeImages: (ids: string[]) => RemoveImagesResult;
  restoreLastDeleted: () => Promise<void>;
  selectImage: (id: string, multi?: boolean) => void;
  deselectAll: () => void;
  setActiveImage: (id: string | null) => void;
  updateImageEditState: (id: string, editState: EditState) => void;
  getImage: (id: string) => GalleryImage | undefined;
  setGridColumns: (columns: number) => void;
  toggleIsolate: () => void; // Enter/exit isolate mode
  exitIsolate: () => void; // Exit isolate mode
  hydrateFromIndexedDB: () => Promise<void>; // Load shared images; migrate IndexedDB once when needed

  // Computed
  getVisibleImages: () => GalleryImage[]; // Returns isolated images if in isolate mode
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// Create thumbnail from image
async function createThumbnail(
  img: HTMLImageElement,
  maxSize: number = 800
): Promise<string> {
  const canvas = document.createElement('canvas');
  let width = img.width;
  let height = img.height;

  if (width > height) {
    if (width > maxSize) {
      height = (height / width) * maxSize;
      width = maxSize;
    }
  } else {
    if (height > maxSize) {
      width = (width / height) * maxSize;
      height = maxSize;
    }
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.86);
}

// Load image from file
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };
    img.src = objectUrl;
  });
}

const thumbnailTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleThumbnailRefresh(id: string, get: () => GalleryStore, set: (partial: Partial<GalleryStore> | ((state: GalleryStore) => Partial<GalleryStore>)) => void) {
  const existingTimer = thumbnailTimers.get(id);
  if (existingTimer) clearTimeout(existingTimer);

  thumbnailTimers.set(id, setTimeout(async () => {
    thumbnailTimers.delete(id);
    const image = get().images.find((candidate) => candidate.id === id);
    if (!image) return;
    const editVersion = image.updatedAt;

    try {
      const thumbnailUrl = await renderGalleryThumbnail(image.dataUrl, image.editState);
      const latest = get().images.find((candidate) => candidate.id === id);
      if (!latest || latest.updatedAt !== editVersion) return;

      const updatedImage = { ...latest, thumbnailUrl };
      set((state) => ({
        images: state.images.map((candidate) => candidate.id === id ? updatedImage : candidate),
      }));
      await saveSharedImage(updatedImage as StoredImage);
    } catch (error) {
      console.error('Failed to refresh edited thumbnail:', error);
    }
  }, 450));
}

export const useGalleryStore = create<GalleryStore>()(
  persist(
    (set, get) => ({
      images: [],
      selectedIds: [],
      activeImageId: null,
      gridColumns: 5, // Default to 5 columns
      isIsolated: false,
      isolatedIds: [],
      lastDeletedImages: [],
      isHydrated: false,

      hydrateFromIndexedDB: async () => {
        try {
          const shared = await getSharedImages();
          let storedImages = shared.images;

          if (!shared.initialized) {
            const browserImages = await getAllImages();
            if (browserImages.length > 0) {
              storedImages = [];
              for (const image of browserImages) {
                const response = await fetch(image.dataUrl);
                if (!response.ok) throw new Error(`Could not migrate ${image.fileName}.`);
                const blob = await response.blob();
                const dataUrl = await uploadSharedImage(blob, image.id, image.fileName);
                storedImages.push({ ...image, dataUrl });
              }
            }
            await saveSharedImages(storedImages);
          }

          const images: GalleryImage[] = storedImages.map((img: StoredImage) => ({
            ...img,
            // Ensure edit state has all required properties (for older stored images)
            editState: ensureCompleteEditState(img.editState as Partial<EditState>),
          }));
          // Sort by createdAt descending (newest first)
          images.sort((a, b) => b.createdAt - a.createdAt);
          set({ images, isHydrated: true });
        } catch (error) {
          console.error('Failed to hydrate the shared local workspace:', error);
          set({ isHydrated: true }); // Mark as hydrated even on error
        }
      },

      addImages: async (files: File[]) => {
        const newImages: GalleryImage[] = [];

        for (const file of files) {
          if (!file.type.startsWith('image/')) continue;

          try {
            const img = await loadImageFromFile(file);
            const thumbnailUrl = await createThumbnail(img);
            const imageId = generateId();
            const dataUrl = await uploadSharedImage(file, imageId, file.name);

            newImages.push({
              id: imageId,
              fileName: file.name,
              dataUrl,
              thumbnailUrl,
              width: img.width,
              height: img.height,
              editState: createDefaultEditState(),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          } catch (err) {
            console.error('Failed to load image:', file.name, err);
          }
        }

        // Save metadata to the shared local workspace.
        try {
          await saveSharedImages(newImages as StoredImage[]);
        } catch (err) {
          console.error('Failed to save images to the shared workspace:', err);
        }

        set((state) => ({
          images: [...newImages, ...state.images], // Add new images at the beginning
        }));

        return newImages;
      },

      addImageFromUrl: async (url: string, fileName: string, source) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Could not download ${fileName}.`);
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) throw new Error(`${fileName} is not a supported image.`);
        const img = await loadImageFromBlob(blob);

        // Create thumbnail
        const thumbnailUrl = await createThumbnail(img);

        const imageId = generateId();
        const dataUrl = await uploadSharedImage(blob, imageId, fileName);
        const newImage: GalleryImage = {
          id: imageId,
          fileName,
          dataUrl,
          thumbnailUrl,
          width: img.width,
          height: img.height,
          editState: createDefaultEditState(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          sourceUrl: source?.sourceUrl ?? url,
          sourceProvider: source?.provider,
        };

        // Save metadata to the shared local workspace.
        try {
          await saveSharedImage(newImage as StoredImage);
        } catch (err) {
          console.error('Failed to save generated image to the shared workspace:', err);
        }

        set((state) => ({
          images: [newImage, ...state.images],
        }));

        return newImage;
      },

      cloneImageVersion: async (sourceImageId, editState, requestedFileName) => {
        const source = get().images.find((image) => image.id === sourceImageId);
        if (!source) throw new Error('The source image is no longer available.');

        const imageId = generateId();
        const extensionIndex = source.fileName.lastIndexOf('.');
        const baseName = extensionIndex > 0 ? source.fileName.slice(0, extensionIndex) : source.fileName;
        const extension = extensionIndex > 0 ? source.fileName.slice(extensionIndex) : '';
        const now = Date.now();
        const newImage: GalleryImage = {
          ...source,
          id: imageId,
          fileName: requestedFileName ?? `${baseName}-edit${extension}`,
          thumbnailUrl: await renderGalleryThumbnail(source.dataUrl, editState),
          editState: ensureCompleteEditState(editState),
          createdAt: now,
          updatedAt: now,
          sourceUrl: source.sourceUrl ?? source.dataUrl,
          sourceProvider: 'Lumen editor',
        };

        await saveSharedImage(newImage as StoredImage);
        set((state) => ({ images: [newImage, ...state.images] }));
        return newImage;
      },

      removeImages: (ids: string[]) => {
        const storyboardImageIds = getStoryboardImageIds(useStoryboardStore.getState().projects);
        const protectedIds = ids.filter((imageId) => storyboardImageIds.has(imageId));
        const removableIds = ids.filter((imageId) => !storyboardImageIds.has(imageId));
        const deletedImages = get().images.filter((img) => removableIds.includes(img.id));
        if (deletedImages.length === 0) return { removedIds: [], protectedIds };

        // Remove shared metadata but retain the local asset so undo remains recoverable.
        deleteSharedImages(removableIds).catch((err) => {
          console.error('Failed to delete images from the shared workspace:', err);
        });

        set((state) => ({
          images: state.images.filter((img) => !removableIds.includes(img.id)),
          selectedIds: state.selectedIds.filter((id) => !removableIds.includes(id)),
          lastDeletedImages: deletedImages,
          activeImageId: removableIds.includes(state.activeImageId || '')
            ? null
            : state.activeImageId,
        }));

        return { removedIds: removableIds, protectedIds };
      },

      restoreLastDeleted: async () => {
        const deletedImages = get().lastDeletedImages;
        if (deletedImages.length === 0) return;

        await saveSharedImages(deletedImages as StoredImage[]);
        set((state) => ({
          images: [...deletedImages, ...state.images].sort((a, b) => b.createdAt - a.createdAt),
          selectedIds: deletedImages.map((image) => image.id),
          lastDeletedImages: [],
        }));
      },

      selectImage: (id: string, multi = false) => {
        set((state) => {
          if (multi) {
            // Toggle selection
            const isSelected = state.selectedIds.includes(id);
            return {
              selectedIds: isSelected
                ? state.selectedIds.filter((sid) => sid !== id)
                : [...state.selectedIds, id],
            };
          } else {
            // Single selection
            return { selectedIds: [id] };
          }
        });
      },

      deselectAll: () => {
        set({ selectedIds: [] });
      },

      setActiveImage: (id: string | null) => {
        set({ activeImageId: id });
      },

      updateImageEditState: (id: string, editState: EditState) => {
        const updatedAt = Date.now();

        set((state) => {
          const updatedImages = state.images.map((img) =>
            img.id === id ? { ...img, editState, updatedAt } : img
          );

          // Save to the shared local workspace (fire and forget).
          const updatedImage = updatedImages.find((img) => img.id === id);
          if (updatedImage) {
            saveSharedImage(updatedImage as StoredImage).catch((err) => {
              console.error('Failed to save image edit state to the shared workspace:', err);
            });
          }

          return { images: updatedImages };
        });

        scheduleThumbnailRefresh(id, get, set);
      },

      getImage: (id: string) => {
        return get().images.find((img) => img.id === id);
      },

      setGridColumns: (columns: number) => {
        set({ gridColumns: Math.max(1, Math.min(8, columns)) });
      },

      toggleIsolate: () => {
        const { isIsolated, selectedIds } = get();
        if (isIsolated) {
          // Exit isolate mode
          set({ isIsolated: false, isolatedIds: [] });
        } else {
          // Enter isolate mode with currently selected images
          if (selectedIds.length > 0) {
            set({ isIsolated: true, isolatedIds: [...selectedIds] });
          }
        }
      },

      exitIsolate: () => {
        set({ isIsolated: false, isolatedIds: [] });
      },

      getVisibleImages: () => {
        const { images, isIsolated, isolatedIds } = get();
        if (isIsolated && isolatedIds.length > 0) {
          return images.filter((img) => isolatedIds.includes(img.id));
        }
        return images;
      },
    }),
    {
      name: 'lumen-ui-preferences',
      // Only persist UI preferences here; image metadata and files use the shared local workspace.
      partialize: (state) => ({
        gridColumns: state.gridColumns,
      }),
    }
  )
);
