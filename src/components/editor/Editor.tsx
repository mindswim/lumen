'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas } from './Canvas';
import { ToolSidebar } from './ToolSidebar';
import { Sidebar } from './Sidebar';
import { MobileToolbar } from './MobileToolbar';
import { ExportDialog } from './ExportDialog';
import { Toast } from '@/components/ui/toast';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useEditorStore } from '@/lib/editor/state';
import { useGalleryStore } from '@/lib/gallery/store';
import { useIsMobile } from '@/hooks/useIsMobile';
import { AdjustPanel } from './AdjustPanel';
import { CurvePanel } from './CurvePanel';
import { HSLPanel } from './HSLPanel';
import { EffectsPanel } from './EffectsPanel';
import { DetailPanel } from './DetailPanel';
import { PresetPanel } from './PresetPanel';
import { MaskPanel } from './MaskPanel';
import { TransformPanel } from './TransformPanel';
import { ExportProvider } from '@/contexts/export-context';

type PanelType = 'presets' | 'tools' | 'hsl' | 'effects';

const PANEL_TITLES: Record<PanelType, string> = {
  presets: 'Presets',
  tools: 'Tools',
  hsl: 'HSL',
  effects: 'Effects',
};

export function Editor() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { undo, redo, resetEditState, copySettings, pasteSettings, hasCopiedSettings } = useEditorStore();
  const image = useEditorStore((state) => state.image);
  const editState = useEditorStore((state) => state.editState);
  const { activeImageId, updateImageEditState, setActiveImage } = useGalleryStore();
  const setEditorImage = useEditorStore((state) => state.setImage);

  const [exportOpen, setExportOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<PanelType | null>(null);

  const handleBack = () => {
    // Save current edit state to gallery before going back
    if (activeImageId && editState) {
      updateImageEditState(activeImageId, editState);
    }
    setActiveImage(null);
    setEditorImage(null);
    router.push('/');
  };

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

  const handleOpenPanel = (panel: PanelType) => {
    setMobilePanel(mobilePanel === panel ? null : panel);
  };

  return (
    <ExportProvider>
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--editor-canvas-bg)', color: 'var(--editor-text-primary)' }}
    >
      <div className="flex-1 flex overflow-hidden">
        {/* Left tool sidebar - hidden on mobile */}
        {!isMobile && (
          <ToolSidebar mode="editor" onExport={() => setExportOpen(true)} />
        )}

        {/* Center: canvas */}
        <Canvas className="flex-1" />

        {/* Right panel - hidden on mobile */}
        {!isMobile && <Sidebar />}
      </div>

      {/* Mobile bottom toolbar */}
      {isMobile && (
        <MobileToolbar
          mode="editor"
          onOpenPanel={handleOpenPanel}
          activePanel={mobilePanel}
          onExport={() => setExportOpen(true)}
          onBack={handleBack}
        />
      )}

      {/* Mobile panel sheet */}
      <Sheet open={mobilePanel !== null} onOpenChange={(open) => !open && setMobilePanel(null)}>
        <SheetContent
          side="bottom"
          className="h-[70vh] p-0 rounded-t-2xl"
          style={{
            backgroundColor: 'var(--editor-bg-primary)',
            borderColor: 'var(--editor-border)'
          }}
        >
          {/* Sheet header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--editor-border)' }}
          >
            <SheetTitle className="text-sm font-medium" style={{ color: 'var(--editor-text-primary)' }}>
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

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />

      {/* Toast notifications */}
      <Toast />

      {/* Keyboard shortcuts overlay - desktop only */}
      {showShortcuts && !isMobile && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="rounded-xl p-6 max-w-md w-full mx-4"
            style={{
              backgroundColor: 'var(--editor-bg-secondary)',
              border: '1px solid var(--editor-border)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium" style={{ color: 'var(--editor-text-primary)' }}>Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowShortcuts(false)}
                style={{ color: 'var(--editor-text-tertiary)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--editor-text-tertiary)' }}>Undo</span>
                <kbd className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--editor-bg-tertiary)', color: 'var(--editor-text-secondary)' }}>Cmd + Z</kbd>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--editor-text-tertiary)' }}>Redo</span>
                <kbd className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--editor-bg-tertiary)', color: 'var(--editor-text-secondary)' }}>Cmd + Shift + Z</kbd>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--editor-text-tertiary)' }}>Reset All</span>
                <kbd className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--editor-bg-tertiary)', color: 'var(--editor-text-secondary)' }}>Cmd + Shift + R</kbd>
              </div>
              <div className="h-px my-2" style={{ backgroundColor: 'var(--editor-border)' }} />
              <div className="flex justify-between">
                <span style={{ color: 'var(--editor-text-tertiary)' }}>Copy Settings</span>
                <kbd className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--editor-bg-tertiary)', color: 'var(--editor-text-secondary)' }}>Cmd + C</kbd>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--editor-text-tertiary)' }}>Paste Settings</span>
                <kbd className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--editor-bg-tertiary)', color: 'var(--editor-text-secondary)' }}>Cmd + V</kbd>
              </div>
              <div className="h-px my-2" style={{ backgroundColor: 'var(--editor-border)' }} />
              <div className="flex justify-between">
                <span style={{ color: 'var(--editor-text-tertiary)' }}>Export</span>
                <kbd className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--editor-bg-tertiary)', color: 'var(--editor-text-secondary)' }}>Cmd + E</kbd>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--editor-text-tertiary)' }}>Compare (Hold)</span>
                <kbd className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--editor-bg-tertiary)', color: 'var(--editor-text-secondary)' }}>Space</kbd>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--editor-text-tertiary)' }}>Show Shortcuts</span>
                <kbd className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--editor-bg-tertiary)', color: 'var(--editor-text-secondary)' }}>?</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </ExportProvider>
  );
}
