'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { useGalleryStore, type GalleryImage } from '@/lib/gallery/store';
import { useEditorStore, type StoryboardEditorContext } from '@/lib/editor/state';
import { GenerationInput } from './GenerationInput';
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
import { useStoryboardStore } from '@/lib/storyboard/store';
import { inferReferenceKind, referenceDisplayName } from '@/lib/storyboard/reference';
import {
  REFERENCE_FILTERS,
  ReferenceEmptyState,
  ReferenceInspector,
  ReferenceThumbnail,
  type ReferenceFilter,
} from './ReferenceLibraryUI';

type WorkspaceMode = 'storyboards' | 'references';

const WORKSPACES: Array<{ value: WorkspaceMode; label: string }> = [
  { value: 'storyboards', label: 'Storyboards' },
  { value: 'references', label: 'References' },
];

const PANEL_TITLES: Record<MobilePanelType, string> = {
  presets: 'Looks',
  tune: 'Tune selected photos',
  ai: 'AI creative director',
  transform: 'Crop & transform',
};

export function Gallery() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanelType | null>(null);
  const [mobileTuneMode, setMobileTuneMode] = useState<'light' | 'color' | 'detail' | 'effects'>('light');
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('storyboards');
  const [showGenerator, setShowGenerator] = useState(false);
  const [query, setQuery] = useState('');
  const [referenceFilter, setReferenceFilter] = useState<ReferenceFilter>('all');
  const [referenceDetailsOpen, setReferenceDetailsOpen] = useState(false);
  const [confirmRemoveReferences, setConfirmRemoveReferences] = useState(false);

  const {
    images,
    selectedIds,
    addImages,
    removeImages,
    selectImage,
    deselectAll,
    setActiveImage,
    isHydrated,
    hydrateFromIndexedDB,
  } = useGalleryStore();

  const setEditorImage = useEditorStore((state) => state.setImage);
  const setEditState = useEditorStore((state) => state.setEditState);
  const setStoryboardContext = useEditorStore((state) => state.setStoryboardContext);
  const showToast = useEditorStore((state) => state.showToast);
  const getImage = useGalleryStore((state) => state.getImage);
  const storyboardsHydrated = useStoryboardStore((state) => state.isHydrated);
  const hydrateStoryboards = useStoryboardStore((state) => state.hydrate);
  const projects = useStoryboardStore((state) => state.projects);
  const activeProjectId = useStoryboardStore((state) => state.activeProjectId);
  const setActiveStoryboardProject = useStoryboardStore((state) => state.setActiveProject);
  const addReference = useStoryboardStore((state) => state.addReference);
  const removeReference = useStoryboardStore((state) => state.removeReference);
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
  const selectedReference = selectedReferenceIds.length === 1
    ? referenceByImageId.get(selectedReferenceIds[0])
    : undefined;
  const selectedReferenceImage = selectedReference
    ? images.find((image) => image.id === selectedReference.imageId)
    : undefined;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredImages = visibleImages.filter((image) => {
    const reference = referenceByImageId.get(image.id);
    const matchesCategory = referenceFilter === 'all' || reference?.kind === referenceFilter;
    const matchesQuery = !normalizedQuery
      || image.fileName.toLowerCase().includes(normalizedQuery)
      || reference?.name.toLowerCase().includes(normalizedQuery)
      || reference?.description.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });
  const getReferenceUsageCount = (referenceId: string) => {
    const inheritedSceneIds = new Set(
      (activeProject?.scenes ?? [])
        .filter((scene) => scene.referenceIds.includes(referenceId))
        .map((scene) => scene.id),
    );
    return (activeProject?.shots ?? []).filter((shot) => (
      shot.referenceIds.includes(referenceId) || inheritedSceneIds.has(shot.sceneId)
    )).length;
  };

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

  const handleOpenImage = useCallback(async (imageId: string, storyboardContext?: StoryboardEditorContext) => {
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
    setStoryboardContext(storyboardContext ?? null);
    const params = new URLSearchParams({ imageId: galleryImage.id });
    if (storyboardContext) {
      params.set('projectId', storyboardContext.projectId);
      params.set('shotId', storyboardContext.shotId);
      params.set('panelRole', storyboardContext.panelRole);
      params.set('sourceTakeId', storyboardContext.sourceTakeId);
    }
    router.push(`/editor?${params.toString()}`);
  }, [getImage, router, setActiveImage, setEditState, setEditorImage, setStoryboardContext]);

  const handleRemoveSelectedReferences = () => {
    if (!currentProjectId || selectedReferenceIds.length === 0) return;
    const references = selectedReferenceIds
      .map((imageId) => referenceByImageId.get(imageId))
      .filter((reference): reference is NonNullable<typeof reference> => Boolean(reference));
    for (const reference of references) removeReference(currentProjectId, reference.id);
    const result = removeImages(selectedReferenceIds);
    deselectAll();
    setConfirmRemoveReferences(false);
    const retainedCopy = result.protectedIds.length > 0
      ? ` · ${result.protectedIds.length} source image${result.protectedIds.length === 1 ? '' : 's'} retained because they are used elsewhere`
      : '';
    showToast(`${references.length} project reference${references.length === 1 ? '' : 's'} removed${retainedCopy}`);
  };

  const handleOpenPanel = (panel: MobilePanelType) => setMobilePanel(mobilePanel === panel ? null : panel);
  const handleReferenceFilter = (filter: ReferenceFilter) => {
    setReferenceFilter(filter);
    setReferenceDetailsOpen(false);
    setConfirmRemoveReferences(false);
    deselectAll();
  };

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
              {confirmRemoveReferences ? (
                <>
                  <button type="button" onClick={() => setConfirmRemoveReferences(false)} className="rounded-full px-3 py-2 text-xs font-medium">Cancel</button>
                  <button type="button" onClick={handleRemoveSelectedReferences} className="rounded-full bg-red-600 px-3 py-2 text-xs font-medium text-white">Remove {selectedReferenceIds.length}</button>
                </>
              ) : (
                <>
                  {selectedReferenceIds.length === 1 && <button type="button" onClick={() => setReferenceDetailsOpen(true)} className="rounded-full border px-3 py-2 text-xs font-medium xl:hidden" style={{ borderColor: 'var(--editor-border)' }}>Details</button>}
                  {selectedReferenceIds.length === 1 && <button type="button" onClick={() => handleOpenImage(selectedReferenceIds[0])} className="rounded-full px-4 py-2 text-xs font-medium" style={{ backgroundColor: 'var(--editor-accent)', color: 'var(--editor-accent-foreground)' }}>Edit</button>}
                  <button type="button" onClick={() => setConfirmRemoveReferences(true)} aria-label="Remove selected project references" className="flex h-9 w-9 items-center justify-center rounded-full" style={{ color: 'var(--editor-error)', backgroundColor: 'var(--editor-bg-secondary)' }}><Trash2 className="h-4 w-4" /></button>
                </>
              )}
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
          ) : workspaceMode === 'storyboards' ? (
            <StoryboardWorkspace onOpenImage={handleOpenImage} onOpenReferences={() => setWorkspaceMode('references')} />
          ) : (
            <div className="flex h-full min-h-0">
              <aside className="hidden w-52 shrink-0 border-r px-3 py-5 lg:block" style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-primary)' }}>
                <div className="px-2">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--editor-text-muted)' }}>Library</p>
                  <p className="mt-1 text-xs font-semibold">Project references</p>
                </div>
                <nav className="mt-4 space-y-1" aria-label="Reference categories">
                  {REFERENCE_FILTERS.map((filter) => {
                    const count = filter.value === 'all'
                      ? visibleImages.length
                      : visibleImages.filter((image) => referenceByImageId.get(image.id)?.kind === filter.value).length;
                    return (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => handleReferenceFilter(filter.value)}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[11px] font-medium transition hover:bg-neutral-100"
                        style={{ backgroundColor: referenceFilter === filter.value ? 'var(--editor-bg-secondary)' : undefined }}
                      >
                        <span>{filter.label}</span>
                        <span className="text-[9px] tabular-nums" style={{ color: 'var(--editor-text-muted)' }}>{count}</span>
                      </button>
                    );
                  })}
                </nav>
                <p className="mt-6 border-t px-2 pt-4 text-[9px] leading-4" style={{ borderColor: 'var(--editor-border)', color: 'var(--editor-text-muted)' }}>
                  Scene references apply to every shot in that scene. Shot references stay local to one frame.
                </p>
              </aside>

              <div className={`min-w-0 flex-1 overflow-y-auto ${isMobile ? 'pb-24' : ''}`} onClick={(event) => { if (event.target === event.currentTarget) deselectAll(); }}>
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
                  <div className="flex min-h-[70vh]"><ReferenceEmptyState onAddPhotos={handleAddPhotos} onCreate={() => setShowGenerator(true)} /></div>
                ) : (
                  <div className="p-3 md:p-6">
                    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--editor-text-muted)' }}>Reference assets</p>
                        <h1 className="mt-1 text-xl font-semibold">{activeProject?.title || 'Current project'}</h1>
                        <p className="mt-1 text-[10px] leading-4" style={{ color: 'var(--editor-text-tertiary)' }}>Reusable visual facts for characters, places, props, looks, and research.</p>
                      </div>
                      <span className="rounded-full border px-3 py-1.5 text-[9px] font-medium" style={{ borderColor: 'var(--editor-border)' }}>{filteredImages.length} shown</span>
                    </div>

                    <div className="mb-4 space-y-3 lg:hidden">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--editor-text-muted)' }} />
                        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search project references" className="w-full rounded-full py-2.5 pl-9 pr-3 text-xs outline-none" style={{ backgroundColor: 'var(--editor-bg-primary)', border: '1px solid var(--editor-border)' }} />
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {REFERENCE_FILTERS.map((filter) => (
                          <button
                            key={filter.value}
                            type="button"
                            onClick={() => handleReferenceFilter(filter.value)}
                            className="shrink-0 rounded-full border px-3 py-2 text-[10px] font-medium"
                            style={{ borderColor: referenceFilter === filter.value ? 'var(--editor-text-primary)' : 'var(--editor-border)', backgroundColor: referenceFilter === filter.value ? 'var(--editor-bg-primary)' : 'transparent' }}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                      {filteredImages.map((image) => {
                        const reference = referenceByImageId.get(image.id);
                        return (
                          <ReferenceThumbnail
                            key={image.id}
                            image={image}
                            reference={reference}
                            usageCount={reference ? getReferenceUsageCount(reference.id) : 0}
                            isSelected={selectedIds.includes(image.id)}
                            onSelect={(multi) => { setConfirmRemoveReferences(false); selectImage(image.id, multi); }}
                            onOpen={() => handleOpenImage(image.id)}
                            isMobile={isMobile}
                          />
                        );
                      })}
                    </div>
                    {filteredImages.length === 0 && <p className="py-20 text-center text-sm" style={{ color: 'var(--editor-text-muted)' }}>No references match the current filters.</p>}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {workspaceMode === 'references' && activeProject && selectedReference && selectedReferenceImage && (
          <ReferenceInspector project={activeProject} reference={selectedReference} image={selectedReferenceImage} onOpenImage={handleOpenImage} onClose={deselectAll} />
        )}
      </div>

      {isMobile && workspaceMode === 'references' && (
        <MobileToolbar mode="gallery" onOpenPanel={handleOpenPanel} activePanel={mobilePanel} onAddPhotos={handleAddPhotos} />
      )}

      <Sheet open={referenceDetailsOpen && Boolean(activeProject && selectedReference && selectedReferenceImage)} onOpenChange={setReferenceDetailsOpen}>
        <SheetContent side="right" className="w-[min(92vw,360px)] p-0 sm:max-w-sm" style={{ backgroundColor: 'var(--editor-bg-primary)', borderColor: 'var(--editor-border)' }}>
          <SheetTitle className="sr-only">Reference details</SheetTitle>
          {activeProject && selectedReference && selectedReferenceImage && (
            <ReferenceInspector
              embedded
              project={activeProject}
              reference={selectedReference}
              image={selectedReferenceImage}
              onOpenImage={handleOpenImage}
              onClose={() => setReferenceDetailsOpen(false)}
            />
          )}
        </SheetContent>
      </Sheet>

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
