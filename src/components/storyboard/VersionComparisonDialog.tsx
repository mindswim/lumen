'use client';

import { useMemo, useState } from 'react';
import { ArrowUpRight, Check, Columns2, Layers2 } from 'lucide-react';

import { useGalleryStore } from '@/lib/gallery/store';
import type { StoryboardEditorContext } from '@/lib/editor/state';
import {
  getSelectedTake,
  useStoryboardStore,
  type StoryboardPanelRole,
  type StoryboardProject,
  type StoryboardShot,
} from '@/lib/storyboard/store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function VersionComparisonDialog({
  open,
  onOpenChange,
  project,
  shot,
  panelRole,
  onOpenImage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: StoryboardProject;
  shot: StoryboardShot;
  panelRole: StoryboardPanelRole;
  onOpenImage: (imageId: string, context?: StoryboardEditorContext) => void;
}) {
  const images = useGalleryStore((state) => state.images);
  const selectTake = useStoryboardStore((state) => state.selectTake);
  const takes = useMemo(
    () => shot.takes.filter((take) => (take.panelRole ?? 'start') === panelRole),
    [panelRole, shot.takes],
  );
  const selectedTake = getSelectedTake(shot, panelRole);
  const initialRight = selectedTake?.id ?? takes.at(-1)?.id ?? '';
  const initialLeft = takes.findLast((take) => take.id !== initialRight)?.id ?? takes[0]?.id ?? '';
  const [leftTakeId, setLeftTakeId] = useState(initialLeft);
  const [rightTakeId, setRightTakeId] = useState(initialRight);
  const [mode, setMode] = useState<'side-by-side' | 'overlay'>('side-by-side');
  const [overlayOpacity, setOverlayOpacity] = useState(50);

  const leftTake = takes.find((take) => take.id === leftTakeId) ?? takes[0];
  const rightTake = takes.find((take) => take.id === rightTakeId) ?? takes.at(-1);
  const leftImage = leftTake ? images.find((image) => image.id === leftTake.imageId) : null;
  const rightImage = rightTake ? images.find((image) => image.id === rightTake.imageId) : null;
  const takeLabel = (takeId: string) => {
    const index = takes.findIndex((take) => take.id === takeId);
    return `Version ${index + 1}`;
  };
  const openTakeInEditor = (imageId: string, takeId: string) => onOpenImage(imageId, {
    projectId: project.id,
    shotId: shot.id,
    panelRole,
    sourceTakeId: takeId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-6 py-5" style={{ borderColor: 'var(--editor-border)' }}>
          <div className="flex flex-wrap items-start justify-between gap-4 pr-8">
            <div>
              <DialogTitle className="text-base">Compare versions</DialogTitle>
              <DialogDescription>{shot.title} · {panelRole} panel</DialogDescription>
            </div>
            <div className="flex rounded-lg bg-neutral-100 p-0.5">
              <button type="button" onClick={() => setMode('side-by-side')} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-medium" style={{ backgroundColor: mode === 'side-by-side' ? 'white' : 'transparent', boxShadow: mode === 'side-by-side' ? '0 1px 2px rgba(0,0,0,.08)' : 'none' }}><Columns2 className="h-3.5 w-3.5" /> Side by side</button>
              <button type="button" onClick={() => setMode('overlay')} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-medium" style={{ backgroundColor: mode === 'overlay' ? 'white' : 'transparent', boxShadow: mode === 'overlay' ? '0 1px 2px rgba(0,0,0,.08)' : 'none' }}><Layers2 className="h-3.5 w-3.5" /> Overlay</button>
            </div>
          </div>
        </DialogHeader>

        {takes.length < 2 ? (
          <div className="flex min-h-80 items-center justify-center px-8 text-center">
            <div><p className="text-sm font-semibold">Two versions are needed to compare.</p><p className="mt-2 text-xs" style={{ color: 'var(--editor-text-muted)' }}>Generate or import another {panelRole} panel version first.</p></div>
          </div>
        ) : (
          <div className="max-h-[76vh] overflow-y-auto p-5">
            <div className="mb-4 grid grid-cols-2 gap-4">
              {[{ side: 'left' as const, value: leftTake?.id ?? '', onChange: setLeftTakeId }, { side: 'right' as const, value: rightTake?.id ?? '', onChange: setRightTakeId }].map((control) => (
                <label key={control.side}>
                  <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--editor-text-muted)' }}>{control.side} version</span>
                  <select value={control.value} onChange={(event) => control.onChange(event.target.value)} className="w-full rounded-lg border bg-transparent px-3 py-2 text-xs outline-none" style={{ borderColor: 'var(--editor-border)' }}>
                    {takes.map((take, index) => <option key={take.id} value={take.id}>Version {index + 1}{take.id === selectedTake?.id ? ' · Selected' : ''}</option>)}
                  </select>
                </label>
              ))}
            </div>

            {mode === 'side-by-side' ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[{ take: leftTake, image: leftImage }, { take: rightTake, image: rightImage }].map(({ take, image }, index) => (
                  <div key={`${take?.id}-${index}`} className="overflow-hidden rounded-xl border" style={{ borderColor: take?.id === selectedTake?.id ? 'var(--editor-text-primary)' : 'var(--editor-border)' }}>
                    <div className="flex min-h-[280px] items-center justify-center bg-neutral-950">
                      {image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image.dataUrl} alt="" className="max-h-[62vh] w-full object-contain" />
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3 p-3">
                      <div><p className="text-xs font-semibold">{take ? takeLabel(take.id) : 'Missing'}</p><p className="mt-0.5 text-[9px]" style={{ color: 'var(--editor-text-muted)' }}>{take?.model ?? 'No metadata'}</p></div>
                      <div className="flex gap-1.5">
                        {image && take && <button type="button" onClick={() => openTakeInEditor(image.id, take.id)} className="flex h-8 w-8 items-center justify-center rounded-full border" style={{ borderColor: 'var(--editor-border)' }} aria-label={`Open ${takeLabel(take.id)} in editor`}><ArrowUpRight className="h-3.5 w-3.5" /></button>}
                        {take && take.id !== selectedTake?.id && <button type="button" onClick={() => selectTake(project.id, shot.id, take.id)} className="rounded-full bg-neutral-950 px-3 py-2 text-[10px] font-medium text-white">Select</button>}
                        {take?.id === selectedTake?.id && <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-2 text-[10px] font-medium"><Check className="h-3 w-3" /> Selected</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div className="relative mx-auto flex min-h-[360px] max-w-4xl items-center justify-center overflow-hidden rounded-xl bg-neutral-950">
                  {leftImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={leftImage.dataUrl} alt="" className="max-h-[66vh] w-full object-contain" />
                  )}
                  {rightImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={rightImage.dataUrl} alt="" className="absolute inset-0 h-full w-full object-contain" style={{ opacity: overlayOpacity / 100 }} />
                  )}
                </div>
                <div className="mx-auto mt-4 flex max-w-lg items-center gap-3">
                  <span className="text-[9px] font-medium">Left</span>
                  <input type="range" min="0" max="100" value={overlayOpacity} onChange={(event) => setOverlayOpacity(Number(event.target.value))} className="flex-1 accent-neutral-950" aria-label="Overlay opacity" />
                  <span className="text-[9px] font-medium">Right</span>
                </div>
                <div className="mx-auto mt-4 grid max-w-2xl grid-cols-2 gap-3">
                  {[{ side: 'Left', take: leftTake, image: leftImage }, { side: 'Right', take: rightTake, image: rightImage }].map(({ side, take, image }) => (
                    <div key={side} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--editor-border)' }}>
                      <div><p className="text-[9px]" style={{ color: 'var(--editor-text-muted)' }}>{side}</p><p className="text-[10px] font-semibold">{take ? takeLabel(take.id) : 'Missing'}</p></div>
                      <div className="flex gap-1.5">
                        {image && take && <button type="button" onClick={() => openTakeInEditor(image.id, take.id)} className="flex h-8 w-8 items-center justify-center rounded-full border" style={{ borderColor: 'var(--editor-border)' }} aria-label={`Open ${side.toLowerCase()} version in editor`}><ArrowUpRight className="h-3.5 w-3.5" /></button>}
                        {take && take.id !== selectedTake?.id && <button type="button" onClick={() => selectTake(project.id, shot.id, take.id)} className="rounded-full bg-neutral-950 px-3 py-2 text-[10px] font-medium text-white">Select</button>}
                        {take?.id === selectedTake?.id && <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-2 text-[10px] font-medium"><Check className="h-3 w-3" /> Selected</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
