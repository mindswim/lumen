'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Film, ImagePlus, LockKeyhole, Pause, Play, Plus, SkipBack, SkipForward } from 'lucide-react';

import { useGalleryStore } from '@/lib/gallery/store';
import {
  getSelectedTake,
  useStoryboardStore,
  type StoryboardPanelRole,
  type StoryboardProject,
  type StoryboardShot,
} from '@/lib/storyboard/store';
import {
  CAMERA_MOVEMENTS,
  SHOT_SIZES,
  aspectClass,
  imageForTake,
  type StoryboardWorkspaceView,
} from '@/components/storyboard/storyboard-ui';

function ShotCard({
  project,
  shot,
  index,
  selected,
  onInspect,
}: {
  project: StoryboardProject;
  shot: StoryboardShot;
  index: number;
  selected: boolean;
  onInspect: () => void;
}) {
  const images = useGalleryStore((state) => state.images);
  const selectShot = useStoryboardStore((state) => state.selectShot);
  const moveShot = useStoryboardStore((state) => state.moveShot);
  const selectedImage = imageForTake(shot, images);
  const canMoveEarlier = index > 0 && project.shots[index - 1]?.sceneId === shot.sceneId;
  const canMoveLater = index < project.shots.length - 1 && project.shots[index + 1]?.sceneId === shot.sceneId;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => { selectShot(shot.id); onInspect(); }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          selectShot(shot.id);
          onInspect();
        }
      }}
      className="group overflow-hidden rounded-2xl border text-left transition-all"
      style={{
        borderColor: selected ? 'var(--editor-text-primary)' : 'var(--editor-border)',
        backgroundColor: 'var(--editor-bg-primary)',
        boxShadow: selected ? '0 0 0 1px var(--editor-text-primary), 0 10px 30px rgba(0,0,0,.08)' : '0 1px 2px rgba(0,0,0,.03)',
      }}
    >
      <div className={`relative overflow-hidden bg-neutral-900 ${aspectClass(project.aspect)}`}>
        {selectedImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selectedImage.dataUrl} alt={`${shot.title} selected frame`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center text-white/50">
            <ImagePlus className="h-5 w-5" />
            <span className="mt-2 text-[10px] font-medium uppercase tracking-[0.15em]">Unshot</span>
          </div>
        )}
        <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2.5 py-1 font-mono text-[10px] text-white backdrop-blur">
          {String(index + 1).padStart(2, '0')}
        </div>
        {shot.selectedTakeId && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-neutral-900 shadow-sm backdrop-blur">
            <Check className="h-2.5 w-2.5" /> Selected
          </div>
        )}
        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            onClick={(event) => { event.stopPropagation(); moveShot(project.id, shot.id, -1); }}
            disabled={!canMoveEarlier}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur disabled:opacity-30"
            aria-label="Move shot earlier"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(event) => { event.stopPropagation(); moveShot(project.id, shot.id, 1); }}
            disabled={!canMoveLater}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur disabled:opacity-30"
            aria-label="Move shot later"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-xs font-semibold">{shot.title}</h3>
            <p className="mt-1 line-clamp-2 text-[11px] leading-4" style={{ color: 'var(--editor-text-tertiary)' }}>
              {shot.beat || shot.prompt || 'Add the story beat and direct the frame.'}
            </p>
          </div>
          <span className="shrink-0 text-[9px] font-mono" style={{ color: 'var(--editor-text-muted)' }}>
            {shot.takes.length} version{shot.takes.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[8px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--editor-text-muted)' }}>
          {shot.shotSize !== 'unspecified' && <span>{SHOT_SIZES.find((item) => item.value === shot.shotSize)?.label}</span>}
          {shot.cameraMovement !== 'static' && <span>· {CAMERA_MOVEMENTS.find((item) => item.value === shot.cameraMovement)?.label}</span>}
          <span>· {shot.durationSeconds}s</span>
          {shot.panelRoles.length > 1 && <span>· {shot.panelRoles.length} panels</span>}
        </div>
        {shot.referenceIds.length > 0 && (
          <div className="mt-3 flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--editor-text-muted)' }}>
            <LockKeyhole className="h-3 w-3" /> {shot.referenceIds.length} shot reference{shot.referenceIds.length === 1 ? '' : 's'}
          </div>
        )}
      </div>
    </article>
  );
}

export function Board({
  project,
  selectedShotId,
  view,
  onInspectShot,
  hasOpenRail,
}: {
  project: StoryboardProject;
  selectedShotId: string | null;
  view: StoryboardWorkspaceView;
  onInspectShot: () => void;
  hasOpenRail: boolean;
}) {
  const addShot = useStoryboardStore((state) => state.addShot);
  const addScene = useStoryboardStore((state) => state.addScene);
  const selectShot = useStoryboardStore((state) => state.selectShot);
  const images = useGalleryStore((state) => state.images);
  const completed = project.shots.filter((shot) => shot.selectedTakeId).length;
  const totalDuration = project.shots.reduce((sum, shot) => sum + shot.durationSeconds, 0);
  const initiallySelectedIndex = Math.max(0, project.shots.findIndex((shot) => shot.id === selectedShotId));
  const initiallyElapsed = project.shots.slice(0, initiallySelectedIndex).reduce((sum, shot) => sum + shot.durationSeconds, 0);
  const [playbackSeconds, setPlaybackSeconds] = useState(initiallyElapsed);
  const [isPlaying, setIsPlaying] = useState(false);
  const safePlaybackSeconds = Math.min(Math.max(0, playbackSeconds), Math.max(0, totalDuration));
  const shotAtTime = useCallback((seconds: number) => {
    let cursor = 0;
    for (const candidate of project.shots) {
      cursor += candidate.durationSeconds;
      if (seconds < cursor) return candidate;
    }
    return project.shots.at(-1);
  }, [project.shots]);
  const playbackShot = shotAtTime(safePlaybackSeconds) ?? project.shots[0];
  const playbackIndex = playbackShot ? project.shots.findIndex((shot) => shot.id === playbackShot.id) : -1;
  const elapsedBeforeShot = playbackIndex > 0
    ? project.shots.slice(0, playbackIndex).reduce((sum, shot) => sum + shot.durationSeconds, 0)
    : 0;
  const elapsedWithinShot = playbackShot ? Math.max(0, safePlaybackSeconds - elapsedBeforeShot) : 0;
  const timedPanelRoles = playbackShot
    ? playbackShot.panelRoles.filter((role) => Boolean(getSelectedTake(playbackShot, role)))
    : [];
  const playbackPanelRoles = timedPanelRoles.length > 0 ? timedPanelRoles : (['start'] as StoryboardPanelRole[]);
  const playbackPanelIndex = playbackShot
    ? Math.min(playbackPanelRoles.length - 1, Math.floor((elapsedWithinShot / Math.max(0.1, playbackShot.durationSeconds)) * playbackPanelRoles.length))
    : 0;
  const playbackPanelRole = playbackPanelRoles[Math.max(0, playbackPanelIndex)] ?? 'start';
  const playbackImage = playbackShot ? imageForTake(playbackShot, images, playbackPanelRole) : null;

  const seekPlayback = (seconds: number) => {
    const nextSeconds = Math.min(Math.max(0, seconds), totalDuration);
    setPlaybackSeconds(nextSeconds);
    const targetShot = shotAtTime(nextSeconds === totalDuration ? Math.max(0, nextSeconds - 0.001) : nextSeconds);
    if (targetShot && targetShot.id !== selectedShotId) selectShot(targetShot.id);
  };

  useEffect(() => {
    if (view !== 'timing' || !isPlaying || totalDuration <= 0) return;
    const timer = window.setInterval(() => {
      setPlaybackSeconds((current) => {
        const next = Math.min(totalDuration, current + 0.1);
        const targetShot = shotAtTime(next === totalDuration ? Math.max(0, next - 0.001) : next);
        if (targetShot && targetShot.id !== useStoryboardStore.getState().selectedShotId) selectShot(targetShot.id);
        if (next >= totalDuration) setIsPlaying(false);
        return next;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [isPlaying, selectShot, shotAtTime, totalDuration, view]);

  const selectPreviousPlaybackShot = () => {
    const previousIndex = Math.max(0, playbackIndex - 1);
    const seconds = project.shots.slice(0, previousIndex).reduce((sum, shot) => sum + shot.durationSeconds, 0);
    seekPlayback(seconds);
  };

  const selectNextPlaybackShot = () => {
    const nextIndex = Math.min(project.shots.length - 1, playbackIndex + 1);
    const seconds = project.shots.slice(0, nextIndex).reduce((sum, shot) => sum + shot.durationSeconds, 0);
    seekPlayback(seconds);
  };

  if (view === 'timing') {
    return (
      <main className="order-1 min-w-0 flex-1 overflow-y-auto p-4 lg:order-2 lg:h-full lg:p-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--editor-text-muted)' }}>Timing</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Test the pace before making video.</h1>
              <p className="mt-2 max-w-xl text-xs leading-5" style={{ color: 'var(--editor-text-tertiary)' }}>
                Selected storyboard panels become timed clips. Adjust duration in the shot inspector; dialogue and voice-over stay attached to the shot.
              </p>
            </div>
            <div className="rounded-full border px-3 py-1.5 text-[10px] font-medium" style={{ borderColor: 'var(--editor-border)' }}>
              {project.shots.length} shots · {totalDuration.toFixed(1)} sec
            </div>
          </div>

          <section className="overflow-hidden rounded-2xl bg-neutral-950 text-white shadow-xl">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <Film className="h-3.5 w-3.5" />
              <p className="text-xs font-semibold">Animatic preview</p>
              <p className="ml-auto text-[9px] text-white/45">Panels timed to shot duration</p>
            </div>

            <div className="relative mx-auto flex min-h-[260px] max-h-[58vh] max-w-5xl items-center justify-center overflow-hidden bg-black">
              {playbackImage && playbackShot ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={playbackImage.dataUrl} alt={playbackShot.title} className="max-h-[58vh] w-full object-contain" />
              ) : (
                <div className="flex min-h-[260px] flex-col items-center justify-center text-white/35">
                  <ImagePlus className="h-7 w-7" />
                  <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.14em]">No selected panel</p>
                </div>
              )}
              {playbackShot && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/80 to-transparent px-5 pb-4 pt-16">
                  <div>
                    <p className="font-mono text-[9px] uppercase text-white/55">SHOT {String(playbackIndex + 1).padStart(2, '0')} · {playbackPanelRole} panel</p>
                    <p className="mt-1 text-sm font-medium">{playbackShot.title}</p>
                  </div>
                  <p className="text-[10px] tabular-nums text-white/60">{playbackShot.durationSeconds.toFixed(1)} sec</p>
                </div>
              )}
              {playbackShot?.dialogue && (
                <p className="pointer-events-none absolute bottom-16 left-1/2 max-w-[80%] -translate-x-1/2 rounded-md bg-black/75 px-3 py-2 text-center text-xs leading-5 text-white shadow-lg">{playbackShot.dialogue}</p>
              )}
            </div>

            <div className="border-t border-white/10 px-4 py-3">
              <input type="range" min="0" max={Math.max(0.1, totalDuration)} step="0.1" value={safePlaybackSeconds} onChange={(event) => seekPlayback(Number(event.target.value))} className="mb-3 h-1 w-full cursor-pointer accent-white" aria-label="Animatic playhead" />
              <div className="flex items-center justify-center gap-3">
                <button type="button" onClick={selectPreviousPlaybackShot} aria-label="Previous shot" disabled={playbackIndex <= 0} className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 disabled:opacity-25"><SkipBack className="h-3.5 w-3.5" /></button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isPlaying && safePlaybackSeconds >= totalDuration) seekPlayback(0);
                    setIsPlaying((value) => !value);
                  }}
                  aria-label={isPlaying ? 'Pause animatic' : 'Play animatic'}
                  disabled={project.shots.length === 0}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black disabled:opacity-30"
                >
                  {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
                </button>
                <button type="button" onClick={selectNextPlaybackShot} aria-label="Next shot" disabled={playbackIndex < 0 || playbackIndex >= project.shots.length - 1} className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 disabled:opacity-25"><SkipForward className="h-3.5 w-3.5" /></button>
                <span className="ml-2 min-w-24 text-[9px] tabular-nums text-white/45">{safePlaybackSeconds.toFixed(1)} / {totalDuration.toFixed(1)} sec</span>
              </div>
            </div>

            <div className="overflow-x-auto border-t border-white/10 p-4">
              <div className="flex min-w-max gap-1.5">
                {project.shots.map((timelineShot, index) => {
                  const image = imageForTake(timelineShot, images);
                  const selected = timelineShot.id === selectedShotId;
                  return (
                    <button
                      key={timelineShot.id}
                      type="button"
                      onClick={() => seekPlayback(project.shots.slice(0, index).reduce((sum, candidate) => sum + candidate.durationSeconds, 0))}
                      className="overflow-hidden rounded-lg border text-left text-white transition"
                      style={{
                        width: `${Math.max(132, timelineShot.durationSeconds * 46)}px`,
                        borderColor: selected ? 'white' : 'rgba(255,255,255,.12)',
                        backgroundColor: selected ? 'rgba(255,255,255,.10)' : 'rgba(255,255,255,.04)',
                      }}
                    >
                      <div className={`relative bg-neutral-900 ${aspectClass(project.aspect)}`}>
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image.dataUrl} alt="" className="h-full w-full object-cover" />
                        ) : <div className="flex h-full items-center justify-center text-[9px] uppercase tracking-wide text-white/40">No panel</div>}
                        <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 font-mono text-[9px] text-white">{String(index + 1).padStart(2, '0')}</span>
                      </div>
                      <div className="p-2.5">
                        <p className="truncate text-[10px] font-semibold">{timelineShot.title}</p>
                        <p className="mt-1 text-[9px] text-white/45">{timelineShot.durationSeconds}s · {timelineShot.panelRoles.length} panel{timelineShot.panelRoles.length === 1 ? '' : 's'} · {CAMERA_MOVEMENTS.find((item) => item.value === timelineShot.cameraMovement)?.label}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
          <div className="mt-4 rounded-2xl border border-dashed px-5 py-4 text-xs leading-5" style={{ borderColor: 'var(--editor-border)', color: 'var(--editor-text-tertiary)' }}>
            An animatic is the storyboard played in sequence with rough timing. It validates pace and coverage before the expensive step of generating motion, dialogue, voice-over, and sound.
          </div>
        </div>
      </main>
    );
  }

  if (view === 'shot-list') {
    return (
      <main className="order-1 min-w-0 flex-1 overflow-y-auto p-4 lg:order-2 lg:h-full lg:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--editor-text-muted)' }}>Production view</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Shot list</h1>
              <p className="mt-2 max-w-xl text-xs leading-5" style={{ color: 'var(--editor-text-tertiary)' }}>
                Structured direction for the same {project.shots.length} shots. Select a row to inspect or edit it.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const sceneId = project.scenes[0]?.id;
                if (!sceneId) return;
                const shotId = addShot(project.id, undefined, sceneId);
                selectShot(shotId);
                onInspectShot();
              }}
              className="flex items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] font-medium"
              style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-primary)' }}
            >
              <Plus className="h-3.5 w-3.5" /> Add shot
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-primary)' }}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1240px] border-collapse text-left">
                <thead style={{ backgroundColor: 'var(--editor-bg-secondary)' }}>
                  <tr className="text-[9px] font-semibold uppercase tracking-[0.11em]" style={{ color: 'var(--editor-text-muted)' }}>
                    <th className="w-16 px-4 py-3">Shot</th>
                    <th className="w-24 px-3 py-3">Panel</th>
                    <th className="w-40 px-3 py-3">Name</th>
                    <th className="w-40 px-3 py-3">Scene</th>
                    <th className="w-[360px] px-3 py-3">Description</th>
                    <th className="w-36 px-3 py-3">Framing</th>
                    <th className="w-28 px-3 py-3">Movement</th>
                    <th className="w-20 px-3 py-3">Duration</th>
                    <th className="w-24 px-3 py-3">Version</th>
                  </tr>
                </thead>
                <tbody>
                  {project.shots.map((listShot, index) => {
                    const scene = project.scenes.find((candidate) => candidate.id === listShot.sceneId);
                    const image = imageForTake(listShot, images);
                    const isSelected = listShot.id === selectedShotId;
                    return (
                      <tr
                        key={listShot.id}
                        tabIndex={0}
                        className="cursor-pointer border-t text-[11px] transition-colors hover:bg-neutral-50"
                        style={{ borderColor: 'var(--editor-border)', backgroundColor: isSelected ? 'var(--editor-bg-secondary)' : undefined }}
                        onClick={() => { selectShot(listShot.id); onInspectShot(); }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            selectShot(listShot.id);
                            onInspectShot();
                          }
                        }}
                      >
                        <td className="px-4 py-3 font-mono" style={{ color: 'var(--editor-text-muted)' }}>{String(index + 1).padStart(2, '0')}</td>
                        <td className="px-3 py-2">
                          <div className="h-11 w-16 overflow-hidden rounded-md bg-neutral-900">
                            {image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={image.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                            ) : <span className="flex h-full items-center justify-center text-[8px] uppercase text-white/40">Missing</span>}
                          </div>
                        </td>
                        <td className="px-3 py-3 font-semibold">{listShot.title}</td>
                        <td className="px-3 py-3" style={{ color: 'var(--editor-text-tertiary)' }}>{scene?.title ?? 'Unassigned'}</td>
                        <td className="w-[360px] max-w-[360px] px-3 py-3 leading-5" style={{ color: 'var(--editor-text-tertiary)' }}>{listShot.beat || listShot.prompt || 'Add shot direction.'}</td>
                        <td className="px-3 py-3" style={{ color: 'var(--editor-text-tertiary)' }}>{SHOT_SIZES.find((item) => item.value === listShot.shotSize)?.label}</td>
                        <td className="px-3 py-3" style={{ color: 'var(--editor-text-tertiary)' }}>{CAMERA_MOVEMENTS.find((item) => item.value === listShot.cameraMovement)?.label}</td>
                        <td className="px-3 py-3 tabular-nums" style={{ color: 'var(--editor-text-tertiary)' }}>{listShot.durationSeconds}s</td>
                        <td className="px-3 py-3">
                          {listShot.selectedTakeId ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium"><Check className="h-3 w-3" /> Selected</span>
                          ) : <span className="text-[10px]" style={{ color: 'var(--editor-text-muted)' }}>Missing</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="order-1 min-w-0 flex-1 overflow-y-auto p-4 lg:order-2 lg:h-full lg:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--editor-text-muted)' }}>Storyboard</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{project.title}</h1>
            <p className="mt-1 text-xs" style={{ color: 'var(--editor-text-tertiary)' }}>{project.scenes.length} scene{project.scenes.length === 1 ? '' : 's'} · {project.shots.length} shots</p>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium">{completed} of {project.shots.length} selected</p>
            <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-neutral-200">
              <div className="h-full rounded-full bg-neutral-950 transition-all" style={{ width: `${project.shots.length ? (completed / project.shots.length) * 100 : 0}%` }} />
            </div>
          </div>
        </div>

        <div className="space-y-8">
            {project.scenes.map((scene, sceneIndex) => {
              const sceneShots = project.shots.filter((shot) => shot.sceneId === scene.id);
              return (
                <section key={scene.id}>
                  <div className="mb-3 flex items-start justify-between gap-4 border-b pb-3" style={{ borderColor: 'var(--editor-border)' }}>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[9px]" style={{ color: 'var(--editor-text-muted)' }}>SCENE {String(sceneIndex + 1).padStart(2, '0')}</span>
                        <h2 className="text-sm font-semibold">{scene.title}</h2>
                      </div>
                      <p className="mt-1 text-[10px]" style={{ color: 'var(--editor-text-tertiary)' }}>
                        {[scene.location, scene.timeOfDay].filter(Boolean).join(' · ') || 'Add location and time of day in Scene setup'}
                        {scene.referenceIds.length ? ` · ${scene.referenceIds.length} scene reference${scene.referenceIds.length === 1 ? '' : 's'}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addShot(project.id, sceneShots.at(-1)?.id, scene.id)}
                      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-medium"
                      style={{ borderColor: 'var(--editor-border)' }}
                    >
                      <Plus className="h-3 w-3" /> Add shot
                    </button>
                  </div>
                  <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${hasOpenRail ? '' : 'lg:grid-cols-3'}`}>
                    {sceneShots.map((shot) => (
                      <ShotCard key={shot.id} project={project} shot={shot} index={project.shots.indexOf(shot)} selected={shot.id === selectedShotId} onInspect={onInspectShot} />
                    ))}
                  </div>
                </section>
              );
            })}
            <button
              type="button"
              onClick={() => addScene(project.id)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed px-5 py-5 text-xs font-medium transition hover:bg-white"
              style={{ borderColor: 'var(--editor-border)', color: 'var(--editor-text-tertiary)' }}
            >
              <Plus className="h-4 w-4" /> Add scene
            </button>
        </div>
      </div>
    </main>
  );
}
