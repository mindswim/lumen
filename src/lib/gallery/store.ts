import { create } from 'zustand';
import { EditState, createDefaultEditState } from '@/types/editor';

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

  // Actions
  addImages: (files: File[]) => Promise<void>;
  removeImages: (ids: string[]) => void;
  selectImage: (id: string, multi?: boolean) => void;
  deselectAll: () => void;
  setActiveImage: (id: string | null) => void;
  updateImageEditState: (id: string, editState: EditState) => void;
  getImage: (id: string) => GalleryImage | undefined;
  setGridColumns: (columns: number) => void;
  toggleIsolate: () => void; // Enter/exit isolate mode
  exitIsolate: () => void; // Exit isolate mode

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

export const useGalleryStore = create<GalleryStore>()((set, get) => ({
  images: [],
  selectedIds: [],
  activeImageId: null,
  gridColumns: 5, // Default to 5 columns
  isIsolated: false,
  isolatedIds: [],

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

    set((state) => ({
      images: [...state.images, ...newImages],
    }));
  },

  removeImages: (ids: string[]) => {
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
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id
          ? { ...img, editState, updatedAt: Date.now() }
          : img
      ),
    }));
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
}));
