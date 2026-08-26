'use client';

import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Settings2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useStoryboardStore, type StoryboardProject } from '@/lib/storyboard/store';

export function StoryboardOutline({
  project,
  selectedShotId,
  onSelectShot,
  onOpenSettings,
}: {
  project: StoryboardProject;
  selectedShotId: string | null;
  onSelectShot: (shotId: string) => void;
  onOpenSettings: () => void;
}) {
  const addScene = useStoryboardStore((state) => state.addScene);
  const addShot = useStoryboardStore((state) => state.addShot);
  const [expandedScenes, setExpandedScenes] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(project.scenes.map((scene) => [scene.id, true])),
  );

  const totalDuration = useMemo(
    () => project.shots.reduce((total, shot) => total + shot.durationSeconds, 0),
    [project.shots],
  );

  const addShotToScene = (sceneId: string) => {
    const sceneShots = project.shots.filter((shot) => shot.sceneId === sceneId);
    const afterShotId = sceneShots.at(-1)?.id;
    const shotId = addShot(project.id, afterShotId, sceneId);
    setExpandedScenes((current) => ({ ...current, [sceneId]: true }));
    onSelectShot(shotId);
  };

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ backgroundColor: 'var(--editor-bg-primary)' }}>
      <div className="border-b px-4 py-4" style={{ borderColor: 'var(--editor-border)' }}>
        <div className="mb-1 flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--editor-text-muted)' }}>Outline</p>
          <button
            type="button"
            aria-label="Storyboard actions"
            className="rounded-md p-1"
            style={{ color: 'var(--editor-text-muted)' }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
        <p className="truncate text-sm font-semibold">{project.title}</p>
        <p className="mt-1 text-[10px]" style={{ color: 'var(--editor-text-muted)' }}>
          {project.scenes.length} scene{project.scenes.length === 1 ? '' : 's'} · {project.shots.length} shots · {totalDuration.toFixed(1)} sec
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {project.scenes.map((scene, sceneIndex) => {
          const sceneShots = project.shots.filter((shot) => shot.sceneId === scene.id);
          const expanded = expandedScenes[scene.id] ?? true;
          return (
            <section className="mb-2" key={scene.id}>
              <div className="group flex items-center gap-1 rounded-lg pr-1 hover:bg-neutral-50">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-2 text-left"
                  onClick={() => setExpandedScenes((current) => ({ ...current, [scene.id]: !expanded }))}
                >
                  {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--editor-text-muted)' }} /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--editor-text-muted)' }} />}
                  <span className="w-5 shrink-0 font-mono text-[9px]" style={{ color: 'var(--editor-text-muted)' }}>{String(sceneIndex + 1).padStart(2, '0')}</span>
                  <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{scene.title}</span>
                  <span className="text-[9px] tabular-nums" style={{ color: 'var(--editor-text-muted)' }}>{sceneShots.length}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Add shot to ${scene.title}`}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-white group-hover:opacity-100 focus:opacity-100"
                  onClick={() => addShotToScene(scene.id)}
                  style={{ color: 'var(--editor-text-tertiary)' }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {expanded && (
                <div className="ml-3 border-l pl-2" style={{ borderColor: 'var(--editor-border)' }}>
                  {sceneShots.length > 0 ? sceneShots.map((shot) => {
                    const shotIndex = project.shots.findIndex((candidate) => candidate.id === shot.id);
                    const selected = selectedShotId === shot.id;
                    return (
                      <button
                        type="button"
                        className={cn(
                          'my-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                          selected ? 'bg-neutral-950 text-white' : 'hover:bg-neutral-100',
                        )}
                        key={shot.id}
                        onClick={() => onSelectShot(shot.id)}
                      >
                        <span className="w-5 shrink-0 font-mono text-[9px]" style={{ color: selected ? '#a3a3a3' : 'var(--editor-text-muted)' }}>{String(shotIndex + 1).padStart(2, '0')}</span>
                        <span className="min-w-0 flex-1 truncate text-[10px] font-medium">{shot.title}</span>
                        <span className="text-[9px] tabular-nums" style={{ color: selected ? '#a3a3a3' : 'var(--editor-text-muted)' }}>{shot.durationSeconds}s</span>
                      </button>
                    );
                  }) : (
                    <button
                      type="button"
                      className="my-1 flex w-full items-center gap-1.5 rounded-md px-2 py-2 text-[10px]"
                      style={{ color: 'var(--editor-text-muted)' }}
                      onClick={() => addShotToScene(scene.id)}
                    >
                      <Plus className="h-3 w-3" /> Add first shot
                    </button>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="space-y-1 border-t p-2" style={{ borderColor: 'var(--editor-border)' }}>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[10px] font-medium hover:bg-neutral-100"
          onClick={() => {
            const sceneId = addScene(project.id);
            setExpandedScenes((current) => ({ ...current, [sceneId]: true }));
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Add scene
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[10px] font-medium hover:bg-neutral-100"
          onClick={onOpenSettings}
          style={{ color: 'var(--editor-text-tertiary)' }}
        >
          <Settings2 className="h-3.5 w-3.5" /> Project and scene settings
        </button>
      </div>
    </div>
  );
}
