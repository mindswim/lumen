'use client';

import { useEffect, useState } from 'react';
import { Canvas } from './Canvas';
import { ToolSidebar } from './ToolSidebar';
import { Sidebar } from './Sidebar';
import { ExportDialog } from './ExportDialog';
import { Toast } from '@/components/ui/toast';
import { useEditorStore } from '@/lib/editor/state';

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
      <ToolSidebar mode="editor" onExport={() => setExportOpen(true)} />

      {/* Center: canvas */}
      <Canvas className="flex-1" />

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
