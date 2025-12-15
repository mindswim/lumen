'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Canvas } from './Canvas';
import { ToolSidebar } from './ToolSidebar';
import { Sidebar } from './Sidebar';
import { ExportDialog } from './ExportDialog';
import { Toast } from '@/components/ui/toast';
import { useEditorStore } from '@/lib/editor/state';
import { ImageData, createDefaultEditState } from '@/types/editor';

const MAX_PREVIEW_SIZE = 2000;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function createPreview(original: HTMLImageElement): HTMLImageElement {
  if (original.width <= MAX_PREVIEW_SIZE && original.height <= MAX_PREVIEW_SIZE) {
    return original;
  }

  const canvas = document.createElement('canvas');
  let width = original.width;
  let height = original.height;

  if (width > height) {
    if (width > MAX_PREVIEW_SIZE) {
      height = (height / width) * MAX_PREVIEW_SIZE;
      width = MAX_PREVIEW_SIZE;
    }
  } else {
    if (height > MAX_PREVIEW_SIZE) {
      width = (width / height) * MAX_PREVIEW_SIZE;
      height = MAX_PREVIEW_SIZE;
    }
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.drawImage(original, 0, 0, width, height);

  const preview = new Image();
  preview.src = canvas.toDataURL('image/jpeg', 0.9);

  return preview;
}

function UploadScreen() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setImage = useEditorStore((state) => state.setImage);
  const setEditState = useEditorStore((state) => state.setEditState);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const original = await loadImage(file);
        const preview = createPreview(original);

        if (preview !== original) {
          await new Promise<void>((resolve) => {
            if (preview.complete) {
              resolve();
            } else {
              preview.onload = () => resolve();
            }
          });
        }

        const imageData: ImageData = {
          original,
          preview,
          width: original.width,
          height: original.height,
          fileName: file.name,
        };

        setImage(imageData);
        setEditState(createDefaultEditState());
      } catch (err) {
        console.error('Failed to load image:', err);
        setError('Failed to load image. Please try another file.');
      } finally {
        setIsLoading(false);
      }
    },
    [setImage, setEditState]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  return (
    <div
      className={`
        flex-1 flex items-center justify-center cursor-pointer transition-colors
        ${isDragging ? 'bg-neutral-800' : 'bg-neutral-950'}
      `}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="text-center space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-neutral-400">Loading image...</p>
          </div>
        ) : (
          <>
            <div
              className={`
                w-24 h-24 mx-auto rounded-2xl border-2 border-dashed flex items-center justify-center transition-colors
                ${isDragging ? 'border-white bg-white/5' : 'border-neutral-700'}
              `}
            >
              <svg
                className={`w-10 h-10 transition-colors ${isDragging ? 'text-white' : 'text-neutral-600'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium text-lg">
                Drop an image here or click to browse
              </p>
              <p className="text-neutral-500 text-sm mt-2">
                Supports JPEG, PNG, WebP
              </p>
            </div>
          </>
        )}

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}
      </div>
    </div>
  );
}

export function Editor() {
  const { undo, redo, resetEditState, copySettings, pasteSettings, hasCopiedSettings } = useEditorStore();
  const image = useEditorStore((state) => state.image);
  const [exportOpen, setExportOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Show shortcuts overlay
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts((s) => !s);
        return;
      }

      // Escape to close shortcuts
      if (e.key === 'Escape' && showShortcuts) {
        setShowShortcuts(false);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }

      // Cmd/Ctrl + E for export
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        setExportOpen(true);
      }

      // Cmd/Ctrl + C for copy settings
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && image) {
        e.preventDefault();
        copySettings();
      }

      // Cmd/Ctrl + V for paste settings
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && image && hasCopiedSettings()) {
        e.preventDefault();
        pasteSettings();
      }

      // Cmd/Ctrl + R for reset (prevent browser refresh)
      if ((e.metaKey || e.ctrlKey) && e.key === 'r' && e.shiftKey) {
        e.preventDefault();
        resetEditState();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, resetEditState, copySettings, pasteSettings, hasCopiedSettings, image, showShortcuts]);

  return (
    <div className="h-screen flex bg-neutral-950 text-white overflow-hidden">
      {/* Left tool sidebar */}
      <ToolSidebar onExport={() => setExportOpen(true)} />

      {/* Center: canvas or upload screen */}
      {image ? (
        <Canvas className="flex-1" />
      ) : (
        <UploadScreen />
      )}

      {/* Right panel */}
      <Sidebar />

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />

      {/* Toast notifications */}
      <Toast />

      {/* Keyboard shortcuts overlay */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-neutral-900 rounded-xl p-6 max-w-md w-full mx-4 border border-neutral-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-white">Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-neutral-400 hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-400">Undo</span>
                <kbd className="px-2 py-1 bg-neutral-800 rounded text-neutral-300">Cmd + Z</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Redo</span>
                <kbd className="px-2 py-1 bg-neutral-800 rounded text-neutral-300">Cmd + Shift + Z</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Reset All</span>
                <kbd className="px-2 py-1 bg-neutral-800 rounded text-neutral-300">Cmd + Shift + R</kbd>
              </div>
              <div className="h-px bg-neutral-700 my-2" />
              <div className="flex justify-between">
                <span className="text-neutral-400">Copy Settings</span>
                <kbd className="px-2 py-1 bg-neutral-800 rounded text-neutral-300">Cmd + C</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Paste Settings</span>
                <kbd className="px-2 py-1 bg-neutral-800 rounded text-neutral-300">Cmd + V</kbd>
              </div>
              <div className="h-px bg-neutral-700 my-2" />
              <div className="flex justify-between">
                <span className="text-neutral-400">Export</span>
                <kbd className="px-2 py-1 bg-neutral-800 rounded text-neutral-300">Cmd + E</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Compare (Hold)</span>
                <kbd className="px-2 py-1 bg-neutral-800 rounded text-neutral-300">Space</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Show Shortcuts</span>
                <kbd className="px-2 py-1 bg-neutral-800 rounded text-neutral-300">?</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
