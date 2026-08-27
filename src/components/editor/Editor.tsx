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
import { useStoryboardStore } from '@/lib/storyboard/store';
import { useIsMobile } from '@/hooks/useIsMobile';
import { AdjustPanel } from './AdjustPanel';
import { CurvePanel } from './CurvePanel';
import { HSLPanel } from './HSLPanel';
import { EffectsPanel } from './EffectsPanel';
import { DetailPanel } from './DetailPanel';
import { PresetPanel } from './PresetPanel';
import { MaskPanel } from './MaskPanel';
import { TransformPanel } from './TransformPanel';
import { AIPanel } from './AIPanel';
import { ExportProvider } from '@/contexts/export-context';
import { ArrowLeft, Check, Redo2, Undo2 } from 'lucide-react';
import type { MobilePanelType } from './MobileToolbar';

const PANEL_TITLES: Record<MobilePanelType, string> = {
  presets: 'Presets',
  tune: 'Tune',
  ai: 'AI creative director',
  transform: 'Crop & transform',
};

export function Editor() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { undo, redo, canUndo, canRedo, resetEditState, copySettings, pasteSettings, hasCopiedSettings } = useEditorStore();
  const image = useEditorStore((state) => state.image);
  const editState = useEditorStore((state) => state.editState);
  const storyboardContext = useEditorStore((state) => state.storyboardContext);
  const setStoryboardContext = useEditorStore((state) => state.setStoryboardContext);
  const { activeImageId, updateImageEditState, setActiveImage, cloneImageVersion, getImage } = useGalleryStore();
  const setEditorImage = useEditorStore((state) => state.setImage);
  const addTake = useStoryboardStore((state) => state.addTake);
  const selectTake = useStoryboardStore((state) => state.selectTake);
  const showToast = useEditorStore((state) => state.showToast);

  const [exportOpen, setExportOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanelType | null>(null);
  const [mobileTuneMode, setMobileTuneMode] = useState<'light' | 'color' | 'effects' | 'detail'>('light');

  const sourceGalleryImage = activeImageId ? getImage(activeImageId) : null;
  const hasEditorChanges = Boolean(sourceGalleryImage && JSON.stringify(sourceGalleryImage.editState) !== JSON.stringify(editState));

  const closeEditor = () => {
    setStoryboardContext(null);
    setActiveImage(null);
    setEditorImage(null);
    router.push('/');
  };

  const handleBack = () => {
    // Library edits remain non-destructive settings on the same gallery asset.
    // Storyboard edits are only persisted through Save as new version.
    if (!storyboardContext && activeImageId && editState) {
      updateImageEditState(activeImageId, editState);
    }
    closeEditor();
  };

  const handleSaveVersion = async () => {
    if (!storyboardContext || !activeImageId || !sourceGalleryImage || !hasEditorChanges || isSavingVersion) return;
    setIsSavingVersion(true);
    try {
      const project = useStoryboardStore.getState().projects.find((candidate) => candidate.id === storyboardContext.projectId);
      const shot = project?.shots.find((candidate) => candidate.id === storyboardContext.shotId);
      const sourceTake = shot?.takes.find((candidate) => candidate.id === storyboardContext.sourceTakeId);
      if (!project || !shot || !sourceTake || sourceTake.imageId !== activeImageId) {
        throw new Error('The source storyboard version is no longer available.');
      }

      const roleVersionCount = shot.takes.filter((take) => take.panelRole === storyboardContext.panelRole).length;
      const extensionIndex = sourceGalleryImage.fileName.lastIndexOf('.');
      const baseName = extensionIndex > 0 ? sourceGalleryImage.fileName.slice(0, extensionIndex) : sourceGalleryImage.fileName;
      const extension = extensionIndex > 0 ? sourceGalleryImage.fileName.slice(extensionIndex) : '';
      const clonedImage = await cloneImageVersion(
        activeImageId,
        editState,
        `${baseName}-lumen-v${roleVersionCount + 1}${extension}`,
      );
      const takeId = addTake(project.id, shot.id, {
        imageId: clonedImage.id,
        prompt: sourceTake.prompt,
        referenceIds: sourceTake.referenceIds,
        model: 'Lumen editor',
        seed: null,
        panelRole: storyboardContext.panelRole,
        sourceTakeId: sourceTake.id,
        sourceImageId: sourceTake.imageId,
      });
      selectTake(project.id, shot.id, takeId);
      showToast(`Saved as ${storyboardContext.panelRole} panel version ${roleVersionCount + 1}`);
      closeEditor();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not save this storyboard version.');
    } finally {
      setIsSavingVersion(false);
    }
  };

  useEffect(() => {
    if (!storyboardContext || !hasEditorChanges) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [hasEditorChanges, storyboardContext]);

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

  const handleOpenPanel = (panel: MobilePanelType) => {
    setMobilePanel(mobilePanel === panel ? null : panel);
  };

  return (
    <ExportProvider>
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--editor-canvas-bg)', color: 'var(--editor-text-primary)' }}
    >
      <header
        className="h-14 flex-shrink-0 flex items-center justify-between gap-3 px-3 md:px-4"
        style={{ backgroundColor: 'var(--editor-bg-primary)', borderBottom: '1px solid var(--editor-border)' }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={handleBack}
            className="md:hidden h-9 w-9 flex items-center justify-center rounded-full"
            aria-label={storyboardContext ? 'Back to storyboard' : 'Back to library'}
            style={{ backgroundColor: 'var(--editor-bg-secondary)' }}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="hidden md:flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-neutral-950 text-white flex items-center justify-center text-xs font-semibold">L</span>
            <span className="text-xs font-semibold tracking-[0.2em]">LUMEN</span>
          </div>
          <div className="hidden md:block h-5 w-px" style={{ backgroundColor: 'var(--editor-border)' }} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" style={{ color: 'var(--editor-text-primary)' }}>{image?.fileName || 'Untitled photo'}</p>
            <p className="hidden md:block text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--editor-text-muted)' }}>Local non-destructive draft</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 md:hidden">
            <button aria-label="Undo" disabled={!canUndo()} onClick={undo} className="flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-30"><Undo2 className="h-4 w-4" /></button>
            <button aria-label="Redo" disabled={!canRedo()} onClick={redo} className="flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-30"><Redo2 className="h-4 w-4" /></button>
          </div>
          {storyboardContext && (
            <button
              type="button"
              onClick={handleSaveVersion}
              disabled={!hasEditorChanges || isSavingVersion}
              className="ml-1 flex h-9 items-center gap-1.5 rounded-full bg-neutral-950 px-3 text-[10px] font-semibold text-white disabled:opacity-35 md:px-4 md:text-xs"
            >
              {isSavingVersion ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Check className="h-3.5 w-3.5" />}
              {isSavingVersion ? 'Saving…' : hasEditorChanges ? 'Save new version' : 'No changes'}
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left tool sidebar - hidden on mobile */}
        {!isMobile && (
          <ToolSidebar mode="editor" onBack={handleBack} backLabel={storyboardContext ? 'Back to Storyboard' : 'Back to Library'} onExport={() => setExportOpen(true)} />
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
            {mobilePanel === 'ai' && <div className="h-[calc(70vh-49px)]"><AIPanel /></div>}
            {mobilePanel === 'transform' && <TransformPanel />}
            {mobilePanel === 'tune' && (
              <div>
                <div className="sticky top-0 z-10 flex gap-1 overflow-x-auto px-3 py-2" style={{ backgroundColor: 'var(--editor-bg-primary)', borderBottom: '1px solid var(--editor-border)' }}>
                  {(['light', 'color', 'effects', 'detail'] as const).map((item) => (
                    <button
                      key={item}
                      onClick={() => setMobileTuneMode(item)}
                      className="rounded-full px-4 py-2 text-xs font-medium capitalize"
                      style={{
                        backgroundColor: mobileTuneMode === item ? 'var(--editor-accent)' : 'var(--editor-bg-secondary)',
                        color: mobileTuneMode === item ? 'var(--editor-accent-foreground)' : 'var(--editor-text-tertiary)',
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                {mobileTuneMode === 'light' && <AdjustPanel />}
                {mobileTuneMode === 'color' && <HSLPanel />}
                {mobileTuneMode === 'effects' && <div><EffectsPanel /><MaskPanel /></div>}
                {mobileTuneMode === 'detail' && <div><DetailPanel /><CurvePanel /></div>}
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
