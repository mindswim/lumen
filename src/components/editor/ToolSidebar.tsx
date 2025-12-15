'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEditorStore } from '@/lib/editor/state';
import { useGalleryStore } from '@/lib/gallery/store';

const ZOOM_PRESETS = [
  { label: 'Fit', value: 'fit' },
  { label: '10%', value: 0.1 },
  { label: '30%', value: 0.3 },
  { label: '50%', value: 0.5 },
  { label: '100%', value: 1 },
  { label: '200%', value: 2 },
  { label: '300%', value: 3 },
  { label: '500%', value: 5 },
  { label: '1000%', value: 10 },
  { label: '1500%', value: 15 },
] as const;

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}

function ToolButton({ icon, label, onClick, disabled, active }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`
        w-10 h-10 flex items-center justify-center rounded-lg transition-colors
        ${active ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : ''}
      `}
    >
      {icon}
    </button>
  );
}

// SVG Icons
const AddIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const UndoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7v6h6" />
    <path d="M3 13a9 9 0 1 0 3-7.7L3 7" />
  </svg>
);

const RedoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 7v6h-6" />
    <path d="M21 13a9 9 0 1 1-3-7.7L21 7" />
  </svg>
);

const ResetIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const CropIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 2v4h12v12h4" />
    <path d="M6 18H2" />
    <path d="M18 6V2" />
    <rect x="6" y="6" width="12" height="12" />
  </svg>
);

const CopyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const PasteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" />
  </svg>
);

const CompareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="12" y1="3" x2="12" y2="21" />
  </svg>
);

const DeleteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3,6 5,6 21,6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const ExportIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17,8 12,3 7,8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const SingleColumnIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
);

const MultiColumnIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const IsolateIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <rect x="7" y="7" width="10" height="10" rx="1" />
  </svg>
);

interface ToolSidebarProps {
  mode: 'gallery' | 'editor';
  onExport?: () => void;
  onAddPhotos?: () => void;
}

export function ToolSidebar({ mode, onExport, onAddPhotos }: ToolSidebarProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [zoomMenuOpen, setZoomMenuOpen] = useState(false);

  // Editor store
  const { undo, redo, canUndo, canRedo, resetEditState, copySettings, pasteSettings, hasCopiedSettings, historyIndex, history } = useEditorStore();
  const zoomLevel = useEditorStore((state) => state.zoomLevel);
  const setZoomLevel = useEditorStore((state) => state.setZoomLevel);
  const zoomToFit = useEditorStore((state) => state.zoomToFit);
  const setZoomToFit = useEditorStore((state) => state.setZoomToFit);
  const isCropping = useEditorStore((state) => state.isCropping);
  const setIsCropping = useEditorStore((state) => state.setIsCropping);
  const comparisonMode = useEditorStore((state) => state.comparisonMode);
  const setComparisonMode = useEditorStore((state) => state.setComparisonMode);
  const editorImage = useEditorStore((state) => state.image);
  const editState = useEditorStore((state) => state.editState);
  const setEditorImage = useEditorStore((state) => state.setImage);

  // Gallery store
  const {
    selectedIds,
    removeImages,
    addImages,
    activeImageId,
    updateImageEditState,
    gridColumns,
    setGridColumns,
    isIsolated,
    toggleIsolate,
  } = useGalleryStore();

  const toggleComparison = () => {
    if (comparisonMode === 'off') {
      setComparisonMode('hold');
    } else {
      setComparisonMode('off');
    }
  };

  const handleAddPhotos = async () => {
    if (onAddPhotos) {
      onAddPhotos();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await addImages(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBack = () => {
    // Save current edit state to gallery before going back
    if (activeImageId && editState) {
      updateImageEditState(activeImageId, editState);
    }
    // Clear editor image
    setEditorImage(null);
    router.push('/');
  };

  const handleDelete = () => {
    if (selectedIds.length > 0) {
      removeImages(selectedIds);
    }
  };

  return (
    <aside className="w-14 bg-neutral-900 border-r border-neutral-800 flex flex-col items-center py-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top section */}
      <div className="flex flex-col items-center gap-1">
        {mode === 'gallery' ? (
          <ToolButton
            icon={<AddIcon />}
            label="Add Photos"
            onClick={handleAddPhotos}
          />
        ) : (
          <ToolButton
            icon={<BackIcon />}
            label="Back to Library"
            onClick={handleBack}
          />
        )}
      </div>

      {/* Divider */}
      <div className="w-6 h-px bg-neutral-700 my-3" />

      {mode === 'editor' ? (
        <>
          {/* History - Editor only */}
          <div className="flex flex-col items-center gap-1">
            <ToolButton
              icon={<UndoIcon />}
              label={`Undo (Cmd+Z)${history.length > 0 ? ` - ${historyIndex + 1}/${history.length}` : ''}`}
              onClick={undo}
              disabled={!canUndo()}
            />
            <ToolButton
              icon={<RedoIcon />}
              label="Redo (Cmd+Shift+Z)"
              onClick={redo}
              disabled={!canRedo()}
            />
            <ToolButton
              icon={<ResetIcon />}
              label="Reset All"
              onClick={resetEditState}
            />
          </div>

          {/* Divider */}
          <div className="w-6 h-px bg-neutral-700 my-3" />

          {/* Tools - Editor only */}
          <div className="flex flex-col items-center gap-1">
            <ToolButton
              icon={<CropIcon />}
              label="Crop & Transform"
              onClick={() => setIsCropping(!isCropping)}
              active={isCropping}
            />
            <ToolButton
              icon={<CopyIcon />}
              label="Copy Settings (Cmd+C)"
              onClick={copySettings}
              disabled={!editorImage}
            />
            <ToolButton
              icon={<PasteIcon />}
              label="Paste Settings (Cmd+V)"
              onClick={pasteSettings}
              disabled={!editorImage || !hasCopiedSettings()}
            />
            <ToolButton
              icon={<CompareIcon />}
              label="Compare (Hold Space)"
              onClick={toggleComparison}
              active={comparisonMode !== 'off'}
              disabled={!editorImage}
            />
          </div>
        </>
      ) : (
        <>
          {/* Gallery tools */}
          <div className="flex flex-col items-center gap-1">
            <ToolButton
              icon={<IsolateIcon />}
              label={isIsolated ? "Exit Isolate" : "Isolate Selected"}
              onClick={toggleIsolate}
              active={isIsolated}
              disabled={!isIsolated && selectedIds.length === 0}
            />
            <ToolButton
              icon={<CopyIcon />}
              label="Copy Settings"
              onClick={copySettings}
              disabled={selectedIds.length !== 1}
            />
            <ToolButton
              icon={<PasteIcon />}
              label="Paste Settings"
              onClick={pasteSettings}
              disabled={selectedIds.length === 0 || !hasCopiedSettings()}
            />
            <ToolButton
              icon={<DeleteIcon />}
              label="Delete Selected"
              onClick={handleDelete}
              disabled={selectedIds.length === 0}
            />
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Zoom controls - Editor only */}
      {mode === 'editor' && editorImage && (
        <div className="flex flex-col items-center gap-2 mb-3">
          {/* Vertical zoom slider */}
          <div className="h-32 flex flex-col items-center justify-center">
            <input
              type="range"
              min="0.1"
              max="15"
              step="0.1"
              value={zoomToFit ? 1 : zoomLevel}
              onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
              className="w-24 -rotate-90 accent-white"
              style={{ width: '100px' }}
            />
          </div>

          {/* Zoom dropdown */}
          <div className="relative">
            <button
              onClick={() => setZoomMenuOpen(!zoomMenuOpen)}
              className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 px-2 py-1"
            >
              <span className="underline">
                {zoomToFit ? 'Fit' : `${Math.round(zoomLevel * 100)}%`}
              </span>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={zoomMenuOpen ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
              </svg>
            </button>

            {/* Dropdown menu */}
            {zoomMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setZoomMenuOpen(false)}
                />
                <div className="absolute bottom-full left-0 mb-1 bg-neutral-800 border border-neutral-700 rounded-lg py-1 z-50 min-w-[80px]">
                  {ZOOM_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        if (preset.value === 'fit') {
                          setZoomToFit(true);
                        } else {
                          setZoomLevel(preset.value);
                        }
                        setZoomMenuOpen(false);
                      }}
                      className={`
                        w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-700
                        ${(preset.value === 'fit' && zoomToFit) || (!zoomToFit && preset.value === zoomLevel)
                          ? 'text-white'
                          : 'text-neutral-400'
                        }
                      `}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Grid size controls - Gallery only */}
      {mode === 'gallery' && (
        <div className="flex flex-col items-center gap-2 mb-3" title="Grid size">
          {/* Grid icons */}
          <div className="flex flex-col items-center gap-1 text-neutral-400">
            <SingleColumnIcon />
          </div>

          {/* Vertical grid slider */}
          <div className="h-32 flex flex-col items-center justify-center">
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={9 - gridColumns}
              onChange={(e) => setGridColumns(9 - parseInt(e.target.value))}
              className="w-24 -rotate-90 accent-white"
              style={{ width: '100px' }}
            />
          </div>

          {/* Grid icons */}
          <div className="flex flex-col items-center gap-1 text-neutral-400">
            <MultiColumnIcon />
          </div>
        </div>
      )}

      {/* Bottom section */}
      <div className="flex flex-col items-center gap-1">
        <ToolButton
          icon={<ExportIcon />}
          label="Export (Cmd+E)"
          onClick={onExport}
          disabled={mode === 'editor' ? !editorImage : selectedIds.length === 0}
        />
      </div>
    </aside>
  );
}
