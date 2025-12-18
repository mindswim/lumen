'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEditorStore } from '@/lib/editor/state';
import { useGalleryStore } from '@/lib/gallery/store';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Undo2,
  Redo2,
  RotateCcw,
  Copy,
  ClipboardPaste,
  Columns2,
  Trash2,
  Download,
  ArrowLeft,
  PlusCircle,
  Grid2x2,
  Square,
  Focus,
} from 'lucide-react';

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
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className={`
            w-10 h-10 flex items-center justify-center rounded-lg transition-colors
            ${active ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'}
            ${disabled ? 'opacity-30 cursor-not-allowed' : ''}
          `}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}


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
    <TooltipProvider delayDuration={300}>
      <aside className="w-14 bg-neutral-950 border-r border-neutral-800 flex flex-col items-center py-3">
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
              icon={<PlusCircle className="w-5 h-5" />}
              label="Add Photos"
              onClick={handleAddPhotos}
            />
          ) : (
            <ToolButton
              icon={<ArrowLeft className="w-5 h-5" />}
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
                icon={<Undo2 className="w-[18px] h-[18px]" />}
                label={`Undo (Cmd+Z)${history.length > 0 ? ` - ${historyIndex + 1}/${history.length}` : ''}`}
                onClick={undo}
                disabled={!canUndo()}
              />
              <ToolButton
                icon={<Redo2 className="w-[18px] h-[18px]" />}
                label="Redo (Cmd+Shift+Z)"
                onClick={redo}
                disabled={!canRedo()}
              />
              <ToolButton
                icon={<RotateCcw className="w-[18px] h-[18px]" />}
                label="Reset All"
                onClick={resetEditState}
              />
            </div>

            {/* Divider */}
            <div className="w-6 h-px bg-neutral-700 my-3" />

            {/* Tools - Editor only */}
            <div className="flex flex-col items-center gap-1">
              <ToolButton
                icon={<Copy className="w-[18px] h-[18px]" />}
                label="Copy Settings (Cmd+C)"
                onClick={copySettings}
                disabled={!editorImage}
              />
              <ToolButton
                icon={<ClipboardPaste className="w-[18px] h-[18px]" />}
                label="Paste Settings (Cmd+V)"
                onClick={pasteSettings}
                disabled={!editorImage || !hasCopiedSettings()}
              />
              <ToolButton
                icon={<Columns2 className="w-[18px] h-[18px]" />}
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
                icon={<Focus className="w-[18px] h-[18px]" />}
                label={isIsolated ? "Exit Isolate" : "Isolate Selected"}
                onClick={toggleIsolate}
                active={isIsolated}
                disabled={!isIsolated && selectedIds.length === 0}
              />
              <ToolButton
                icon={<Copy className="w-[18px] h-[18px]" />}
                label="Copy Settings"
                onClick={copySettings}
                disabled={selectedIds.length !== 1}
              />
              <ToolButton
                icon={<ClipboardPaste className="w-[18px] h-[18px]" />}
                label="Paste Settings"
                onClick={pasteSettings}
                disabled={selectedIds.length === 0 || !hasCopiedSettings()}
              />
              <ToolButton
                icon={<Trash2 className="w-[18px] h-[18px]" />}
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
              <Square className="w-3.5 h-3.5" />
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
              <Grid2x2 className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {/* Bottom section */}
        <div className="flex flex-col items-center gap-1">
          <ToolButton
            icon={<Download className="w-[18px] h-[18px]" />}
            label="Export (Cmd+E)"
            onClick={onExport}
            disabled={mode === 'editor' ? !editorImage : selectedIds.length === 0}
          />
        </div>
      </aside>
    </TooltipProvider>
  );
}
