import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EditState, createDefaultEditState, ensureCompleteEditState } from '@/types/editor';
import {
  saveImage,
  saveImages,
  deleteImages,
  getAllImages,
  StoredImage,
} from '@/lib/storage/indexed-db';

export interface GalleryImage {
  id: string;
  fileName: string;
  dataUrl: string; // Base64 data URL for persistence
  thumbnailUrl: string;
  width: number;
  height: number;
  editState: EditState;
  createdAt: number;
  updatedAt: number;
}

interface GalleryStore {
  images: GalleryImage[];
  selectedIds: string[];
  activeImageId: string | null;
  gridColumns: number; // 1-8 columns
  isIsolated: boolean; // Isolate mode - show only isolated images
  isolatedIds: string[]; // IDs of images being isolated
  isHydrated: boolean; // Whether IndexedDB data has been loaded

  // Actions
  addImages: (files: File[]) => Promise<void>;
  addImageFromUrl: (url: string, fileName: string) => Promise<GalleryImage>;
  removeImages: (ids: string[]) => void;
  selectImage: (id: string, multi?: boolean) => void;
  deselectAll: () => void;
  setActiveImage: (id: string | null) => void;
  updateImageEditState: (id: string, editState: EditState) => void;
  getImage: (id: string) => GalleryImage | undefined;
  setGridColumns: (columns: number) => void;
  toggleIsolate: () => void; // Enter/exit isolate mode
  exitIsolate: () => void; // Exit isolate mode
  hydrateFromIndexedDB: () => Promise<void>; // Load images from IndexedDB

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
  maxSize: number = 400
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
  return canvas.toDataURL('image/jpeg', 0.8);
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

export const useGalleryStore = create<GalleryStore>()(
  persist(
    (set, get) => ({
      images: [],
      selectedIds: [],
      activeImageId: null,
      gridColumns: 5, // Default to 5 columns
      isIsolated: false,
      isolatedIds: [],
      isHydrated: false,

      hydrateFromIndexedDB: async () => {
        try {
          const storedImages = await getAllImages();
          const images: GalleryImage[] = storedImages.map((img: StoredImage) => ({
            ...img,
            // Ensure edit state has all required properties (for older stored images)
            editState: ensureCompleteEditState(img.editState as Partial<EditState>),
          }));
          // Sort by createdAt descending (newest first)
          images.sort((a, b) => b.createdAt - a.createdAt);
          set({ images, isHydrated: true });
        } catch (error) {
          console.error('Failed to hydrate from IndexedDB:', error);
          set({ isHydrated: true }); // Mark as hydrated even on error
        }
      },

      addImages: async (files: File[]) => {
        const newImages: GalleryImage[] = [];

        for (const file of files) {
          if (!file.type.startsWith('image/')) continue;

          try {
            const img = await loadImageFromFile(file);
            const reader = new FileReader();
            const dataUrl = await new Promise<string>((resolve) => {
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.readAsDataURL(file);
            });

            const thumbnailUrl = await createThumbnail(img);

            newImages.push({
              id: generateId(),
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

        // Save to IndexedDB
        try {
          await saveImages(newImages as StoredImage[]);
        } catch (err) {
          console.error('Failed to save images to IndexedDB:', err);
        }

        set((state) => ({
          images: [...newImages, ...state.images], // Add new images at the beginning
        }));
      },

      addImageFromUrl: async (url: string, fileName: string) => {
        // Load image from URL
        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = url;
        });

        // Create canvas to get dataUrl
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');

        // Create thumbnail
        const thumbnailUrl = await createThumbnail(img);

        const newImage: GalleryImage = {
          id: generateId(),
          fileName,
          dataUrl,
          thumbnailUrl,
          width: img.width,
          height: img.height,
          editState: createDefaultEditState(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        // Save to IndexedDB
        try {
          await saveImage(newImage as StoredImage);
        } catch (err) {
          console.error('Failed to save generated image to IndexedDB:', err);
        }

        set((state) => ({
          images: [newImage, ...state.images],
        }));

        return newImage;
      },

      removeImages: (ids: string[]) => {
        // Delete from IndexedDB (fire and forget, don't block UI)
        deleteImages(ids).catch((err) => {
          console.error('Failed to delete images from IndexedDB:', err);
        });

        set((state) => ({
          images: state.images.filter((img) => !ids.includes(img.id)),
          selectedIds: state.selectedIds.filter((id) => !ids.includes(id)),
          activeImageId: ids.includes(state.activeImageId || '')
            ? null
            : state.activeImageId,
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

          // Save to IndexedDB (fire and forget)
          const updatedImage = updatedImages.find((img) => img.id === id);
          if (updatedImage) {
            saveImage(updatedImage as StoredImage).catch((err) => {
              console.error('Failed to save image edit state to IndexedDB:', err);
            });
          }

          return { images: updatedImages };
        });
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
      // Only persist UI preferences, not images (those go to IndexedDB)
      partialize: (state) => ({
        gridColumns: state.gridColumns,
      }),
    }
  )
);
