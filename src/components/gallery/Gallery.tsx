'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Images, Search, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { useGalleryStore, type GalleryImage } from '@/lib/gallery/store';
import { useEditorStore } from '@/lib/editor/state';
import { GenerationInput } from './GenerationInput';
import { Sidebar } from '@/components/editor/Sidebar';
import { MobileToolbar, type MobilePanelType } from '@/components/editor/MobileToolbar';
import { Toast } from '@/components/ui/toast';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/useIsMobile';
import { AdjustPanel } from '@/components/editor/AdjustPanel';
import { CurvePanel } from '@/components/editor/CurvePanel';
import { HSLPanel } from '@/components/editor/HSLPanel';
import { EffectsPanel } from '@/components/editor/EffectsPanel';
import { DetailPanel } from '@/components/editor/DetailPanel';
import { PresetPanel } from '@/components/editor/PresetPanel';
import { MaskPanel } from '@/components/editor/MaskPanel';
import { TransformPanel } from '@/components/editor/TransformPanel';
import { AIPanel } from '@/components/editor/AIPanel';
import { StoryboardWorkspace } from '@/components/storyboard/StoryboardWorkspace';
import { useStoryboardStore, type StoryReference } from '@/lib/storyboard/store';
import { inferReferenceKind, referenceDisplayName } from '@/lib/storyboard/reference';

type WorkspaceMode = 'storyboard' | 'animatic' | 'references';

const WORKSPACES: Array<{ value: WorkspaceMode; label: string }> = [
  { value: 'storyboard', label: 'Storyboard' },
  { value: 'animatic', label: 'Timing' },
  { value: 'references', label: 'References' },
];

const PANEL_TITLES: Record<MobilePanelType, string> = {
  presets: 'Looks',
  tune: 'Tune selected photos',
  ai: 'AI creative director',
  transform: 'Crop & transform',
};

function PhotoThumbnail({
  image,
  isSelected,
  onSelect,
  onOpen,
  isMobile,
  reference,
}: {
  image: GalleryImage;
  isSelected: boolean;
  onSelect: (multi: boolean) => void;
  onOpen: () => void;
  isMobile: boolean;
  reference?: StoryReference;
}) {
  return (
    <div
      className="group relative mb-3 break-inside-avoid cursor-pointer overflow-hidden rounded-xl md:mb-4"
      style={{ boxShadow: isSelected ? '0 0 0 3px var(--editor-accent)' : '0 1px 2px rgba(0,0,0,.06)' }}
      role="button"
      tabIndex={0}
      aria-label={`Select ${image.fileName}`}
      onClick={(event) => onSelect(event.metaKey || event.ctrlKey)}
      onDoubleClick={() => !isMobile && onOpen()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onSelect(event.metaKey || event.ctrlKey);
      }}
    >
      {/* Local workspace and legacy data URLs are rendered directly. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.thumbnailUrl} alt={image.fileName} className="h-auto w-full object-cover" draggable={false} />
      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />

      {isSelected && (
        <div className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-lg">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><polyline points="20,6 9,17 4,12" /></svg>
        </div>
      )}

      <button
        aria-label={`Edit ${image.fileName}`}
        onClick={(event) => { event.stopPropagation(); onOpen(); }}
        className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow-lg transition-all ${isMobile ? 'opacity-100' : 'translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'}`}
      >
        <ArrowUpRight className="h-4 w-4" />
      </button>

      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent px-3 pb-2.5 pt-12 text-white transition-all ${isMobile ? 'opacity-100' : 'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'}`}>
        <p className="truncate text-xs font-medium">{reference?.name || image.fileName}</p>
        <p className="mt-0.5 truncate text-[10px] capitalize text-white/65">
          {reference ? `${reference.kind} · ${image.sourceProvider || reference.sourceTitle || 'Imported'}` : `${image.width} × ${image.height}`}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ onAddPhotos, onCreate }: { onAddPhotos: () => void; onCreate: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-xl"><Images className="h-7 w-7" /></div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--editor-text-muted)' }}>Your visual workspace</p>
      <h2 className="mt-2 max-w-md text-2xl font-semibold tracking-tight md:text-3xl">Build a look that belongs to you.</h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed" style={{ color: 'var(--editor-text-tertiary)' }}>
        Import a photo or an entire shoot. Lumen helps you explore a direction, refine it, and carry it consistently across the set.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button onClick={onAddPhotos} className="flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-3 text-sm font-medium text-white"><Upload className="h-4 w-4" /> Import photos</button>
        <button onClick={onCreate} className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium" style={{ backgroundColor: 'var(--editor-bg-primary)', border: '1px solid var(--editor-border)' }}><Sparkles className="h-4 w-4" /> Create a reference</button>
      </div>
    </div>
  );
}

export function Gallery() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanelType | null>(null);
  const [mobileTuneMode, setMobileTuneMode] = useState<'light' | 'color' | 'detail' | 'effects'>('light');
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('storyboard');
  const [showGenerator, setShowGenerator] = useState(false);
  const [query, setQuery] = useState('');

  const {
    images,
    selectedIds,
    addImages,
    removeImages,
    restoreLastDeleted,
    selectImage,
    deselectAll,
    setActiveImage,
    gridColumns,
    isHydrated,
    hydrateFromIndexedDB,
  } = useGalleryStore();

  const setEditorImage = useEditorStore((state) => state.setImage);
  const setEditState = useEditorStore((state) => state.setEditState);
  const showToast = useEditorStore((state) => state.showToast);
  const getImage = useGalleryStore((state) => state.getImage);
  const storyboardsHydrated = useStoryboardStore((state) => state.isHydrated);
  const hydrateStoryboards = useStoryboardStore((state) => state.hydrate);
  const projects = useStoryboardStore((state) => state.projects);
  const activeProjectId = useStoryboardStore((state) => state.activeProjectId);
  const setActiveStoryboardProject = useStoryboardStore((state) => state.setActiveProject);
  const addReference = useStoryboardStore((state) => state.addReference);
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const currentProjectId = activeProject?.id;

  useEffect(() => {
    if (!isHydrated) hydrateFromIndexedDB();
  }, [hydrateFromIndexedDB, isHydrated]);

  useEffect(() => {
    if (!storyboardsHydrated) hydrateStoryboards();
  }, [hydrateStoryboards, storyboardsHydrated]);

  const referenceByImageId = new Map((activeProject?.references ?? []).map((reference) => [reference.imageId, reference]));
  const visibleImages = images.filter((image) => referenceByImageId.has(image.id));
  const selectedReferenceIds = selectedIds.filter((id) => referenceByImageId.has(id));
  const normalizedQuery = query.trim().toLowerCase();
  const filteredImages = visibleImages.filter((image) => {
    const reference = referenceByImageId.get(image.id);
    return image.fileName.toLowerCase().includes(normalizedQuery)
      || reference?.name.toLowerCase().includes(normalizedQuery);
  });
  const effectiveColumns = isMobile ? 2 : gridColumns;

  const handleAddPhotos = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0 && currentProjectId) {
      const added = await addImages(files);
      for (const image of added) {
        addReference(currentProjectId, {
          imageId: image.id,
          name: referenceDisplayName(image.fileName),
          kind: inferReferenceKind(image.fileName),
          description: '',
        });
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    if (workspaceMode !== 'references') return;
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0 && currentProjectId) {
      const added = await addImages(files);
      for (const image of added) {
        addReference(currentProjectId, {
          imageId: image.id,
          name: referenceDisplayName(image.fileName),
          kind: inferReferenceKind(image.fileName),
          description: '',
        });
      }
    }
  };

  const handleCreatedReference = (image: GalleryImage, prompt: string) => {
    if (!currentProjectId) return;
    addReference(currentProjectId, {
      imageId: image.id,
      name: referenceDisplayName(image.fileName),
      kind: inferReferenceKind(prompt),
      description: prompt,
      sourceTitle: image.sourceProvider,
      sourceUrl: image.sourceUrl,
      rightsNote: 'AI-generated production reference.',
    });
  };

  const handleOpenImage = useCallback(async (imageId: string) => {
    const galleryImage = getImage(imageId);
    if (!galleryImage) return;

    const image = new Image();
    image.src = galleryImage.dataUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Could not open this photo'));
    });

    setEditorImage({
      original: image,
      preview: image,
      width: galleryImage.width,
      height: galleryImage.height,
      fileName: galleryImage.fileName,
    });
    setEditState(galleryImage.editState);
    setActiveImage(galleryImage.id);
    router.push('/editor');
  }, [getImage, router, setActiveImage, setEditState, setEditorImage]);

  const handleDeleteSelected = () => {
    const count = selectedReferenceIds.length;
    if (count === 0) return;
    const result = removeImages(selectedReferenceIds);
    if (result.protectedIds.length > 0) {
      const protectedCount = result.protectedIds.length;
      const removedCopy = result.removedIds.length > 0 ? `${result.removedIds.length} removed · ` : '';
      showToast(`${removedCopy}${protectedCount} used by a storyboard and kept safe`, result.removedIds.length > 0 ? {
        label: 'Undo',
        onClick: () => restoreLastDeleted().catch(() => showToast('Could not restore photos')),
      } : undefined);
      return;
    }
    showToast(`${result.removedIds.length} photo${result.removedIds.length === 1 ? '' : 's'} removed`, {
      label: 'Undo',
      onClick: () => restoreLastDeleted().catch(() => showToast('Could not restore photos')),
    });
  };

  const handleOpenPanel = (panel: MobilePanelType) => setMobilePanel(mobilePanel === panel ? null : panel);

  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--editor-canvas-bg)', color: 'var(--editor-text-primary)' }}
      onDrop={handleDrop}
      onDragOver={(event) => { event.preventDefault(); if (workspaceMode === 'references') setIsDragging(true); }}
      onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
    >
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />

      {(workspaceMode === 'references' || !storyboardsHydrated || !activeProject) && <header className="flex h-14 flex-shrink-0 items-center justify-between gap-2 px-3 md:px-4" style={{ backgroundColor: 'var(--editor-bg-primary)', borderBottom: '1px solid var(--editor-border)' }}>
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-950 text-xs font-semibold text-white">L</span>
            <div className="hidden 2xl:block">
              <p className="text-xs font-semibold tracking-[0.2em]">LUMEN</p>
              <p className="text-[9px]" style={{ color: 'var(--editor-text-muted)' }}>Director workspace</p>
            </div>
          </div>
          {activeProject && (
            <select
              aria-label="Active project"
              className="hidden max-w-40 rounded-full border bg-transparent px-3 py-1.5 text-xs font-semibold outline-none md:block lg:max-w-52"
              onChange={(event) => setActiveStoryboardProject(event.target.value)}
              style={{ borderColor: 'var(--editor-border)' }}
              value={activeProject.id}
            >
              {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
            </select>
          )}
          <div className="flex rounded-full p-1" style={{ backgroundColor: 'var(--editor-bg-secondary)' }}>
            {WORKSPACES.map((workspace) => (
              <button key={workspace.value} onClick={() => setWorkspaceMode(workspace.value)} className="rounded-full px-2.5 py-1.5 text-[11px] font-medium md:px-3 md:text-xs" style={{ backgroundColor: workspaceMode === workspace.value ? 'var(--editor-bg-primary)' : 'transparent', color: workspaceMode === workspace.value ? 'var(--editor-text-primary)' : 'var(--editor-text-muted)', boxShadow: workspaceMode === workspace.value ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>{workspace.label}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {workspaceMode === 'references' && visibleImages.length > 0 && (
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--editor-text-muted)' }} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search project references" className="w-44 rounded-full py-2 pl-9 pr-3 text-xs outline-none xl:w-56" style={{ backgroundColor: 'var(--editor-bg-secondary)', border: '1px solid var(--editor-border)' }} />
            </div>
          )}
          {selectedReferenceIds.length > 0 && workspaceMode === 'references' && (
            <>
              <span className="hidden text-xs md:inline" style={{ color: 'var(--editor-text-tertiary)' }}>{selectedReferenceIds.length} selected</span>
              {selectedReferenceIds.length === 1 && <button onClick={() => handleOpenImage(selectedReferenceIds[0])} className="rounded-full px-4 py-2 text-xs font-medium" style={{ backgroundColor: 'var(--editor-accent)', color: 'var(--editor-accent-foreground)' }}>Edit</button>}
              <button onClick={handleDeleteSelected} aria-label="Delete selected photos" className="flex h-9 w-9 items-center justify-center rounded-full" style={{ color: 'var(--editor-error)', backgroundColor: 'var(--editor-bg-secondary)' }}><Trash2 className="h-4 w-4" /></button>
            </>
          )}
          {workspaceMode === 'references' && (
            <>
              <button onClick={() => setShowGenerator((value) => !value)} className="hidden items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium md:flex" style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-primary)' }}><Sparkles className="h-4 w-4" /> Create</button>
              <button onClick={handleAddPhotos} className="hidden items-center gap-2 rounded-full px-4 py-2 text-xs font-medium md:flex" style={{ backgroundColor: 'var(--editor-accent)', color: 'var(--editor-accent-foreground)' }}><Upload className="h-4 w-4" /> Import</button>
            </>
          )}
        </div>
      </header>}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="relative flex-1 overflow-hidden">
          {isDragging && (
            <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-black/80 text-white">
              <div className="rounded-3xl border border-white/25 bg-white/10 px-10 py-8 text-center backdrop-blur"><Upload className="mx-auto mb-3 h-7 w-7" /><p className="text-sm font-medium">Drop photos into this session</p></div>
            </div>
          )}

          {!isHydrated || !storyboardsHydrated ? (
            <div className="flex h-full items-center justify-center text-sm" style={{ color: 'var(--editor-text-muted)' }}>Opening your workspace…</div>
          ) : workspaceMode === 'storyboard' ? (
            <StoryboardWorkspace onOpenImage={handleOpenImage} onViewChange={setWorkspaceMode} view="storyboard" />
          ) : workspaceMode === 'animatic' ? (
            <StoryboardWorkspace onOpenImage={handleOpenImage} onViewChange={setWorkspaceMode} view="animatic" />
          ) : (
            <div className={`h-full overflow-auto ${isMobile ? 'pb-24' : ''}`} onClick={(event) => { if (event.target === event.currentTarget) deselectAll(); }}>
              {showGenerator && (
                <section className="border-b px-3 py-6 md:px-8 md:py-8" style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-secondary)' }}>
                  <div className="mx-auto max-w-4xl">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--editor-text-muted)' }}>Create reference</p>
                        <h2 className="mt-1 text-xl font-semibold tracking-tight">Make a character, costume, location, prop, or lookbook image.</h2>
                      </div>
                      <button onClick={() => setShowGenerator(false)} aria-label="Close reference creator" className="flex h-8 w-8 items-center justify-center rounded-full border" style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-primary)' }}><X className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="rounded-3xl p-2 md:p-4" style={{ backgroundColor: 'var(--editor-bg-primary)', border: '1px solid var(--editor-border)', boxShadow: '0 12px 40px rgba(0,0,0,.06)' }}><GenerationInput onCreated={handleCreatedReference} /></div>
                  </div>
                </section>
              )}
              {visibleImages.length === 0 ? (
                <div className="flex min-h-[70vh]"><EmptyState onAddPhotos={handleAddPhotos} onCreate={() => setShowGenerator(true)} /></div>
              ) : (
                <div className="p-3 md:p-6">
                  <div className="mb-4 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--editor-text-muted)' }}>Reference assets</p>
                      <h1 className="mt-1 text-lg font-semibold">{activeProject?.title || 'Current project'} <span className="font-normal" style={{ color: 'var(--editor-text-muted)' }}>· {filteredImages.length}</span></h1>
                    </div>
                    <p className="hidden text-xs md:block" style={{ color: 'var(--editor-text-muted)' }}>Import, create, and finish reusable project references</p>
                  </div>
                  <div className="space-y-3 md:space-y-4" style={{ columnCount: effectiveColumns, columnGap: isMobile ? '.75rem' : '1rem' }}>
                    {filteredImages.map((image) => (
                      <PhotoThumbnail key={image.id} image={image} reference={referenceByImageId.get(image.id)} isSelected={selectedIds.includes(image.id)} onSelect={(multi) => selectImage(image.id, multi)} onOpen={() => handleOpenImage(image.id)} isMobile={isMobile} />
                    ))}
                  </div>
                  {filteredImages.length === 0 && <p className="py-20 text-center text-sm" style={{ color: 'var(--editor-text-muted)' }}>No images match “{query}”.</p>}
                </div>
              )}
            </div>
          )}
        </main>

        {!isMobile && workspaceMode === 'references' && selectedReferenceIds.length > 0 && <Sidebar />}
      </div>

      {isMobile && workspaceMode === 'references' && (
        <MobileToolbar mode="gallery" onOpenPanel={handleOpenPanel} activePanel={mobilePanel} onAddPhotos={handleAddPhotos} />
      )}

      <Sheet open={mobilePanel !== null} onOpenChange={(open) => !open && setMobilePanel(null)}>
        <SheetContent side="bottom" className="h-[72vh] p-0 rounded-t-3xl" style={{ backgroundColor: 'var(--editor-bg-primary)', borderColor: 'var(--editor-border)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--editor-border)' }}>
            <SheetTitle className="text-sm font-medium">{mobilePanel ? PANEL_TITLES[mobilePanel] : 'Panel'}</SheetTitle>
          </div>
          <div className="flex-1 overflow-y-auto pb-safe">
            {selectedReferenceIds.length === 0 && mobilePanel !== null ? (
              <div className="flex h-48 flex-col items-center justify-center px-8 text-center"><p className="text-sm font-medium">Select at least one photo</p><p className="mt-1 text-xs" style={{ color: 'var(--editor-text-muted)' }}>Then use Looks, Tune, or AI across the selection.</p></div>
            ) : (
              <>
                {mobilePanel === 'presets' && <PresetPanel />}
                {mobilePanel === 'ai' && <div className="h-[calc(72vh-49px)]"><AIPanel /></div>}
                {mobilePanel === 'transform' && <TransformPanel />}
                {mobilePanel === 'tune' && (
                  <div>
                    <div className="sticky top-0 z-10 flex gap-1 px-3 py-2" style={{ backgroundColor: 'var(--editor-bg-primary)', borderBottom: '1px solid var(--editor-border)' }}>
                      {(['light', 'color', 'detail', 'effects'] as const).map((item) => <button key={item} onClick={() => setMobileTuneMode(item)} className="flex-1 rounded-full px-3 py-2 text-xs font-medium capitalize" style={{ backgroundColor: mobileTuneMode === item ? 'var(--editor-accent)' : 'var(--editor-bg-secondary)', color: mobileTuneMode === item ? 'var(--editor-accent-foreground)' : 'var(--editor-text-tertiary)' }}>{item}</button>)}
                    </div>
                    {mobileTuneMode === 'light' && <AdjustPanel />}
                    {mobileTuneMode === 'color' && <HSLPanel />}
                    {mobileTuneMode === 'detail' && <div><DetailPanel /><CurvePanel /></div>}
                    {mobileTuneMode === 'effects' && <div><EffectsPanel /><MaskPanel /></div>}
                  </div>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Toast />
    </div>
  );
}
