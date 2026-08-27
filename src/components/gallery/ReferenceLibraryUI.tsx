'use client';

import { ArrowUpRight, Images, Sparkles, Upload, X } from 'lucide-react';

import type { GalleryImage } from '@/lib/gallery/store';
import {
  useStoryboardStore,
  type ReferenceKind,
  type StoryReference,
  type StoryboardProject,
} from '@/lib/storyboard/store';

export type ReferenceFilter = 'all' | ReferenceKind;

export const REFERENCE_FILTERS: Array<{ value: ReferenceFilter; label: string }> = [
  { value: 'all', label: 'All references' },
  { value: 'character', label: 'Characters' },
  { value: 'location', label: 'Locations' },
  { value: 'object', label: 'Props' },
  { value: 'style', label: 'Looks' },
  { value: 'research', label: 'Research' },
];

const REFERENCE_KIND_LABELS: Record<ReferenceKind, string> = {
  character: 'Character',
  location: 'Location',
  object: 'Prop',
  style: 'Look',
  research: 'Research',
};

export function ReferenceThumbnail({
  image,
  isSelected,
  onSelect,
  onOpen,
  isMobile,
  reference,
  usageCount,
}: {
  image: GalleryImage;
  isSelected: boolean;
  onSelect: (multi: boolean) => void;
  onOpen: () => void;
  isMobile: boolean;
  reference?: StoryReference;
  usageCount: number;
}) {
  const displayName = reference?.name || image.fileName;
  const kindLabel = reference ? REFERENCE_KIND_LABELS[reference.kind] : 'Reference';

  return (
    <article className="group min-w-0">
      <div className={`relative aspect-[4/3] overflow-hidden rounded-md bg-neutral-100 ring-offset-2 transition-colors ${isSelected ? 'ring-2 ring-neutral-950' : 'ring-1 ring-black/10'}`}>
        <button
          type="button"
          aria-label={`Select ${displayName}`}
          aria-pressed={isSelected}
          className="absolute inset-0 z-10 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
          onClick={(event) => onSelect(event.metaKey || event.ctrlKey)}
          onDoubleClick={() => !isMobile && onOpen()}
        />
        {/* Local workspace and legacy data URLs are rendered directly. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.dataUrl}
          alt={displayName}
          className="h-full w-full object-contain"
          decoding="async"
          draggable={false}
          loading="lazy"
        />
        {isSelected && (
          <div className="pointer-events-none absolute right-2.5 top-2.5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><polyline points="20,6 9,17 4,12" /></svg>
          </div>
        )}
        <button
          type="button"
          aria-label={`Edit ${displayName}`}
          onClick={(event) => { event.stopPropagation(); onOpen(); }}
          className={`absolute bottom-2.5 right-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-sm transition-opacity ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`}
        >
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 min-w-0 px-0.5">
        <p className="truncate text-xs font-medium">{displayName}</p>
        <p className="mt-0.5 truncate text-[9px] uppercase tracking-[0.08em]" style={{ color: 'var(--editor-text-muted)' }}>
          {kindLabel} · {usageCount === 0 ? 'Unused' : `${usageCount} shot${usageCount === 1 ? '' : 's'}`}
        </p>
      </div>
    </article>
  );
}

export function ReferenceInspector({
  project,
  reference,
  image,
  onOpenImage,
  onClose,
  embedded = false,
}: {
  project: StoryboardProject;
  reference: StoryReference;
  image: GalleryImage;
  onOpenImage: (imageId: string) => void;
  onClose: () => void;
  embedded?: boolean;
}) {
  const updateReference = useStoryboardStore((state) => state.updateReference);
  const inheritedSceneIds = new Set(
    project.scenes
      .filter((scene) => scene.referenceIds.includes(reference.id))
      .map((scene) => scene.id),
  );
  const usedByShots = project.shots.filter((shot) => (
    shot.referenceIds.includes(reference.id) || inheritedSceneIds.has(shot.sceneId)
  ));

  return (
    <aside
      className={embedded ? 'h-full overflow-y-auto' : 'hidden h-full w-80 shrink-0 overflow-y-auto border-l xl:block'}
      style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-primary)' }}
    >
      <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--editor-border)' }}>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--editor-text-muted)' }}>Reference details</p>
          <p className="mt-0.5 text-xs font-semibold">Production asset</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close reference details" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-6 p-5">
        <div className="overflow-hidden rounded-xl border bg-neutral-100" style={{ borderColor: 'var(--editor-border)' }}>
          {/* Local workspace and legacy data URLs are rendered directly. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.dataUrl} alt={reference.name} className="aspect-[4/3] h-auto w-full object-cover" />
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--editor-text-muted)' }}>Name</span>
            <input value={reference.name} onChange={(event) => updateReference(project.id, reference.id, { name: event.target.value })} className="w-full rounded-lg border bg-transparent px-3 py-2.5 text-xs font-medium outline-none focus:border-neutral-500" style={{ borderColor: 'var(--editor-border)' }} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--editor-text-muted)' }}>Category</span>
            <select value={reference.kind} onChange={(event) => updateReference(project.id, reference.id, { kind: event.target.value as ReferenceKind })} className="w-full rounded-lg border bg-transparent px-3 py-2.5 text-xs outline-none" style={{ borderColor: 'var(--editor-border)' }}>
              {REFERENCE_FILTERS.filter((filter) => filter.value !== 'all').map((filter) => (
                <option key={filter.value} value={filter.value}>{filter.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--editor-text-muted)' }}>Direction</span>
            <textarea value={reference.description} onChange={(event) => updateReference(project.id, reference.id, { description: event.target.value })} rows={4} placeholder="Describe the details this reference should preserve." className="w-full resize-none rounded-lg border bg-transparent px-3 py-2.5 text-xs leading-5 outline-none focus:border-neutral-500" style={{ borderColor: 'var(--editor-border)' }} />
          </label>
        </div>

        <section className="border-t pt-5" style={{ borderColor: 'var(--editor-border)' }}>
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--editor-text-muted)' }}>Used by</p>
          {usedByShots.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {usedByShots.map((shot) => {
                const index = project.shots.findIndex((candidate) => candidate.id === shot.id);
                return <span key={shot.id} className="rounded-md bg-neutral-100 px-2 py-1.5 text-[9px] font-medium">{String(index + 1).padStart(2, '0')} · {shot.title}</span>;
              })}
            </div>
          ) : (
            <p className="mt-2 text-[10px] leading-4" style={{ color: 'var(--editor-text-tertiary)' }}>Not assigned yet. Add it to a scene for inherited continuity or directly to an individual shot.</p>
          )}
        </section>

        <section className="border-t pt-5" style={{ borderColor: 'var(--editor-border)' }}>
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--editor-text-muted)' }}>Provenance</p>
          <dl className="mt-3 space-y-2 text-[10px]">
            <div className="flex justify-between gap-4"><dt style={{ color: 'var(--editor-text-muted)' }}>Source</dt><dd className="truncate text-right">{image.sourceProvider || reference.sourceTitle || 'Imported'}</dd></div>
            {reference.rightsNote && <div className="flex justify-between gap-4"><dt style={{ color: 'var(--editor-text-muted)' }}>Rights</dt><dd className="max-w-[180px] text-right leading-4">{reference.rightsNote}</dd></div>}
          </dl>
        </section>

        <button type="button" onClick={() => onOpenImage(image.id)} className="flex w-full items-center justify-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-xs font-medium text-white">
          Open in image editor <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
}

export function ReferenceEmptyState({ onAddPhotos, onCreate }: { onAddPhotos: () => void; onCreate: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-xl"><Images className="h-7 w-7" /></div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--editor-text-muted)' }}>Your visual workspace</p>
      <h2 className="mt-2 max-w-md text-2xl font-semibold tracking-tight md:text-3xl">Build a look that belongs to you.</h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed" style={{ color: 'var(--editor-text-tertiary)' }}>
        Import a photo or an entire shoot. Lumen helps you explore a direction, refine it, and carry it consistently across the set.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={onAddPhotos} className="flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-3 text-sm font-medium text-white"><Upload className="h-4 w-4" /> Import photos</button>
        <button type="button" onClick={onCreate} className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium" style={{ backgroundColor: 'var(--editor-bg-primary)', border: '1px solid var(--editor-border)' }}><Sparkles className="h-4 w-4" /> Create a reference</button>
      </div>
    </div>
  );
}
