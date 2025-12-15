'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGalleryStore, GalleryImage } from '@/lib/gallery/store';
import { useEditorStore } from '@/lib/editor/state';
import { ToolSidebar } from '@/components/editor/ToolSidebar';
import { Sidebar } from '@/components/editor/Sidebar';
import { Toast } from '@/components/ui/toast';
import { EditState } from '@/types/editor';

// Generate CSS filter approximation for edit state preview
function getEditPreviewFilter(editState: EditState): string {
  const filters: string[] = [];

  // Exposure -> brightness
  if (editState.exposure && editState.exposure !== 0) {
    filters.push(`brightness(${100 + editState.exposure * 50}%)`);
  }

  // Contrast
  if (editState.contrast && editState.contrast !== 0) {
    filters.push(`contrast(${100 + editState.contrast}%)`);
  }

  // Saturation
  if (editState.saturation && editState.saturation !== 0) {
    filters.push(`saturate(${100 + editState.saturation * 2}%)`);
  }

  // Temperature -> sepia approximation for warmth
  if (editState.temperature && editState.temperature > 0) {
    filters.push(`sepia(${editState.temperature * 2}%)`);
  }

  // B&W preset detection (lutId contains BW)
  if (editState.lutId && editState.lutId.toLowerCase().includes('bw')) {
    filters.push('grayscale(100%)');
  }

  return filters.length > 0 ? filters.join(' ') : 'none';
}

// Photo thumbnail component
interface PhotoThumbnailProps {
  image: GalleryImage;
  isSelected: boolean;
  onSelect: (multi: boolean) => void;
  onDoubleClick: () => void;
}

function PhotoThumbnail({ image, isSelected, onSelect, onDoubleClick }: PhotoThumbnailProps) {
  const filter = getEditPreviewFilter(image.editState);

  return (
    <div
      className={`
        relative cursor-pointer group
        ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-950' : ''}
      `}
      onClick={(e) => onSelect(e.metaKey || e.ctrlKey)}
      onDoubleClick={onDoubleClick}
    >
      <img
        src={image.thumbnailUrl}
        alt={image.fileName}
        className="w-full h-auto object-cover"
        style={{ filter }}
        draggable={false}
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 left-2 w-5 h-5 bg-white rounded-full flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
            <polyline points="20,6 9,17 4,12" />
          </svg>
        </div>
      )}
    </div>
  );
}

// Empty state component
function EmptyState() {
  return <div className="flex-1" />;
}

export function Gallery() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);

  const {
    images,
    selectedIds,
    addImages,
    selectImage,
    deselectAll,
    setActiveImage,
    gridColumns,
    getVisibleImages,
  } = useGalleryStore();

  // Get visible images (filtered if in isolate mode)
  const visibleImages = getVisibleImages();
  const setEditorImage = useEditorStore((state) => state.setImage);
  const setEditState = useEditorStore((state) => state.setEditState);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        await addImages(files);
      }
    },
    [addImages]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const getImage = useGalleryStore((state) => state.getImage);

  const handleDoubleClick = useCallback(
    async (imageId: string) => {
      // Get the latest image from the store (not the one captured at render time)
      const galleryImage = getImage(imageId);
      if (!galleryImage) return;

      // Load the full image and set it in the editor store
      const img = new Image();
      img.src = galleryImage.dataUrl;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
      });

      setEditorImage({
        original: img,
        preview: img,
        width: galleryImage.width,
        height: galleryImage.height,
        fileName: galleryImage.fileName,
      });

      setEditState(galleryImage.editState);
      setActiveImage(galleryImage.id);

      // Navigate to editor
      router.push('/editor');
    },
    [getImage, setEditorImage, setEditState, setActiveImage, router]
  );

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        deselectAll();
      }
    },
    [deselectAll]
  );

  return (
    <div
      className="h-screen flex bg-neutral-950 text-white overflow-hidden"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Left tool sidebar */}
      <ToolSidebar mode="gallery" />

      {/* Center: photo grid or empty state */}
      <div className="flex-1 relative overflow-hidden">
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-neutral-900/90 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl border-2 border-dashed border-white/50 flex items-center justify-center mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17,8 12,3 7,8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="text-white text-sm font-medium">Drop photos to upload</p>
            </div>
          </div>
        )}

        {/* Content */}
        {images.length === 0 ? (
          <EmptyState />
        ) : (
          <div
            className="h-full overflow-auto p-6"
            onClick={handleBackgroundClick}
          >
            {/* Masonry-style grid */}
            <div
              className="space-y-4"
              style={{ columnCount: gridColumns, columnGap: '1rem' }}
            >
              {visibleImages.map((image) => (
                <PhotoThumbnail
                  key={image.id}
                  image={image}
                  isSelected={selectedIds.includes(image.id)}
                  onSelect={(multi) => selectImage(image.id, multi)}
                  onDoubleClick={() => handleDoubleClick(image.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right panel */}
      <Sidebar />

      {/* Toast notifications */}
      <Toast />
    </div>
  );
}
