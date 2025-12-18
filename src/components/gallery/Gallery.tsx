'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGalleryStore, GalleryImage } from '@/lib/gallery/store';
import { useEditorStore } from '@/lib/editor/state';
import { ToolSidebar } from '@/components/editor/ToolSidebar';
import { Sidebar } from '@/components/editor/Sidebar';
import { MobileToolbar } from '@/components/editor/MobileToolbar';
import { Toast } from '@/components/ui/toast';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { ExportDialog } from '@/components/editor/ExportDialog';
import { useIsMobile } from '@/hooks/useIsMobile';
import { EditState } from '@/types/editor';
import { AdjustPanel } from '@/components/editor/AdjustPanel';
import { CurvePanel } from '@/components/editor/CurvePanel';
import { HSLPanel } from '@/components/editor/HSLPanel';
import { EffectsPanel } from '@/components/editor/EffectsPanel';
import { DetailPanel } from '@/components/editor/DetailPanel';
import { PresetPanel } from '@/components/editor/PresetPanel';
import { MaskPanel } from '@/components/editor/MaskPanel';
import { TransformPanel } from '@/components/editor/TransformPanel';
import { PlusCircle } from 'lucide-react';

type PanelType = 'presets' | 'tools' | 'hsl' | 'effects';

const PANEL_TITLES: Record<PanelType, string> = {
  presets: 'Presets',
  tools: 'Tools',
  hsl: 'HSL',
  effects: 'Effects',
};

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
  isMobile: boolean;
}

function PhotoThumbnail({ image, isSelected, onSelect, onDoubleClick, isMobile }: PhotoThumbnailProps) {
  const filter = getEditPreviewFilter(image.editState);

  return (
    <div
      className={`
        relative cursor-pointer group break-inside-avoid mb-3 md:mb-4
        ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-950' : ''}
      `}
      onClick={(e) => {
        if (isMobile) {
          // On mobile, single tap opens editor
          onDoubleClick();
        } else {
          onSelect(e.metaKey || e.ctrlKey);
        }
      }}
      onDoubleClick={() => !isMobile && onDoubleClick()}
    >
      <img
        src={image.thumbnailUrl}
        alt={image.fileName}
        className="w-full h-auto object-cover rounded-sm"
        style={{ filter }}
        draggable={false}
      />
      {/* Hover overlay - desktop only */}
      {!isMobile && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-sm" />
      )}
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
function EmptyState({ onAddPhotos }: { onAddPhotos: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <button
        onClick={onAddPhotos}
        className="flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-dashed border-neutral-700 hover:border-neutral-500 transition-colors"
      >
        <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center">
          <PlusCircle className="w-8 h-8 text-neutral-400" />
        </div>
        <div className="text-center">
          <p className="text-white font-medium">Add Photos</p>
          <p className="text-neutral-500 text-sm mt-1">Tap to browse or drag and drop</p>
        </div>
      </button>
    </div>
  );
}

export function Gallery() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<PanelType | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const {
    images,
    selectedIds,
    addImages,
    selectImage,
    deselectAll,
    setActiveImage,
    gridColumns,
    getVisibleImages,
    isHydrated,
    hydrateFromIndexedDB,
  } = useGalleryStore();

  // Hydrate from IndexedDB on mount
  useEffect(() => {
    if (!isHydrated) {
      hydrateFromIndexedDB();
    }
  }, [isHydrated, hydrateFromIndexedDB]);

  // Get visible images (filtered if in isolate mode)
  const visibleImages = getVisibleImages();
  const setEditorImage = useEditorStore((state) => state.setImage);
  const setEditState = useEditorStore((state) => state.setEditState);

  // Calculate columns for mobile (2-3 based on orientation)
  const effectiveColumns = isMobile ? 2 : gridColumns;

  const handleAddPhotos = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await addImages(files);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

  const handleOpenImage = useCallback(
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

  const handleOpenPanel = (panel: PanelType) => {
    setMobilePanel(mobilePanel === panel ? null : panel);
  };

  return (
    <div
      className="h-screen flex flex-col bg-neutral-900 text-white overflow-hidden"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left tool sidebar - hidden on mobile */}
        {!isMobile && <ToolSidebar mode="gallery" onExport={() => setExportOpen(true)} />}

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
          {!isHydrated ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-neutral-500">Loading...</div>
            </div>
          ) : images.length === 0 ? (
            <EmptyState onAddPhotos={handleAddPhotos} />
          ) : (
            <div
              className={`h-full overflow-auto p-3 md:p-6 ${isMobile ? 'pb-20' : ''}`}
              onClick={handleBackgroundClick}
            >
              {/* Masonry-style grid */}
              <div
                className="space-y-3 md:space-y-4"
                style={{ columnCount: effectiveColumns, columnGap: isMobile ? '0.75rem' : '1rem' }}
              >
                {visibleImages.map((image) => (
                  <PhotoThumbnail
                    key={image.id}
                    image={image}
                    isSelected={selectedIds.includes(image.id)}
                    onSelect={(multi) => selectImage(image.id, multi)}
                    onDoubleClick={() => handleOpenImage(image.id)}
                    isMobile={isMobile}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel - hidden on mobile */}
        {!isMobile && <Sidebar />}
      </div>

      {/* Mobile bottom toolbar */}
      {isMobile && (
        <MobileToolbar
          mode="gallery"
          onOpenPanel={handleOpenPanel}
          activePanel={mobilePanel}
          onExport={() => setExportOpen(true)}
          onAddPhotos={handleAddPhotos}
        />
      )}

      {/* Mobile panel sheet */}
      <Sheet open={mobilePanel !== null} onOpenChange={(open) => !open && setMobilePanel(null)}>
        <SheetContent
          side="bottom"
          className="h-[70vh] bg-neutral-900 border-neutral-800 p-0 rounded-t-2xl"
        >
          {/* Sheet header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
            <SheetTitle className="text-sm font-medium text-white">
              {mobilePanel ? PANEL_TITLES[mobilePanel] : 'Panel'}
            </SheetTitle>
          </div>

          {/* Sheet content */}
          <div className="flex-1 overflow-y-auto pb-safe">
            {mobilePanel === 'presets' && <PresetPanel />}
            {mobilePanel === 'tools' && (
              <div className="space-y-0">
                <AdjustPanel />
                <DetailPanel />
                <CurvePanel />
                <TransformPanel />
              </div>
            )}
            {mobilePanel === 'hsl' && <HSLPanel />}
            {mobilePanel === 'effects' && (
              <div className="space-y-0">
                <EffectsPanel />
                <MaskPanel />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Export Dialog */}
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />

      {/* Toast notifications */}
      <Toast />
    </div>
  );
}
