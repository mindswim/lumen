'use client';

import {
  BookOpen,
  ChevronDown,
  CircleCheck,
  Download,
  HardDrive,
  PanelLeftOpen,
  PanelRightOpen,
  Plus,
  Sparkles,
} from 'lucide-react';

import type { StoryboardAspect, StoryboardProject, StoryboardStorageStatus } from '@/lib/storyboard/store';
import { ASPECTS, type StoryboardWorkspaceView } from '@/components/storyboard/storyboard-ui';

export function StoryboardWorkspaceToolbar({
  project,
  projects,
  view,
  storageStatus,
  outlineOpen,
  inspectorOpen,
  hasShot,
  onProjectChange,
  onViewChange,
  onOpenReferences,
  onAspectChange,
  onNewProject,
  onGenerate,
  onExport,
  onToggleOutline,
  onToggleInspector,
}: {
  project: StoryboardProject;
  projects: StoryboardProject[];
  view: StoryboardWorkspaceView;
  storageStatus: StoryboardStorageStatus;
  outlineOpen: boolean;
  inspectorOpen: boolean;
  hasShot: boolean;
  onProjectChange: (projectId: string) => void;
  onViewChange: (view: StoryboardWorkspaceView) => void;
  onOpenReferences: () => void;
  onAspectChange: (aspect: StoryboardAspect) => void;
  onNewProject: () => void;
  onGenerate: () => void;
  onExport: () => void;
  onToggleOutline: () => void;
  onToggleInspector: () => void;
}) {
  const storageLabel = storageStatus === 'saving'
    ? 'Saving…'
    : storageStatus === 'error'
      ? 'Save failed'
      : 'Saved to workspace';

  return (
    <div
      className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-2 md:h-14 md:flex-nowrap md:py-0 md:px-4"
      style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-primary)' }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-xs font-semibold text-white sm:flex">L</span>
        <div className="mr-1 hidden 2xl:block">
          <p className="text-xs font-semibold tracking-[0.2em]">LUMEN</p>
          <p className="text-[9px]" style={{ color: 'var(--editor-text-muted)' }}>Director workspace</p>
        </div>
        <div className="relative">
          <select
            value={project.id}
            onChange={(event) => onProjectChange(event.target.value)}
            className="max-w-20 appearance-none truncate rounded-full border bg-transparent py-1.5 pl-3 pr-8 text-xs font-semibold outline-none sm:max-w-48 lg:max-w-60"
            style={{ borderColor: 'var(--editor-border)' }}
            aria-label="Active project"
          >
            {projects.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2" />
        </div>
        <button
          onClick={onNewProject}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
          style={{ borderColor: 'var(--editor-border)' }}
          aria-label="New project"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="order-3 flex w-full shrink-0 items-center justify-center gap-1 md:order-none md:w-auto md:justify-start">
        <div className="flex rounded-full p-1" style={{ backgroundColor: 'var(--editor-bg-secondary)' }}>
          {([
            { value: 'board' as const, label: 'Board' },
            { value: 'shot-list' as const, label: 'Shot list' },
            { value: 'timing' as const, label: 'Timing' },
          ]).map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onViewChange(item.value)}
              className="rounded-full px-2.5 py-1.5 text-[10px] font-medium sm:px-3 sm:text-xs"
              style={{
                backgroundColor: view === item.value ? 'var(--editor-bg-primary)' : 'transparent',
                color: view === item.value ? 'var(--editor-text-primary)' : 'var(--editor-text-muted)',
                boxShadow: view === item.value ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onOpenReferences}
          className="hidden rounded-full px-3 py-2 text-[10px] font-medium lg:block"
          style={{ color: 'var(--editor-text-muted)' }}
        >
          References
        </button>
        <button
          type="button"
          aria-label="References"
          onClick={onOpenReferences}
          className="flex h-8 w-8 items-center justify-center rounded-full lg:hidden"
          style={{ color: 'var(--editor-text-muted)' }}
        >
          <BookOpen className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <div
          className="hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[9px] font-medium xl:flex"
          style={{
            backgroundColor: storageStatus === 'error' ? '#fef2f2' : 'var(--editor-bg-secondary)',
            color: storageStatus === 'error' ? '#b91c1c' : 'var(--editor-text-muted)',
          }}
          title="Project data and images are stored in the shared local Lumen workspace and are available to every browser using this server."
        >
          {storageStatus === 'saved' ? <CircleCheck className="h-3 w-3" /> : <HardDrive className="h-3 w-3" />}
          {storageLabel}
        </div>
        <div className="hidden items-center gap-1 rounded-full p-1 2xl:flex" style={{ backgroundColor: 'var(--editor-bg-secondary)' }}>
          {ASPECTS.map((aspect) => (
            <button
              key={aspect.value}
              onClick={() => onAspectChange(aspect.value)}
              className="rounded-full px-2.5 py-1 text-[10px] font-medium"
              style={{
                backgroundColor: project.aspect === aspect.value ? 'var(--editor-bg-primary)' : 'transparent',
                color: project.aspect === aspect.value ? 'var(--editor-text-primary)' : 'var(--editor-text-muted)',
                boxShadow: project.aspect === aspect.value ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
              }}
            >
              {aspect.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={!hasShot}
          className="flex h-8 items-center gap-1.5 rounded-full bg-neutral-950 px-3 text-[10px] font-medium text-white disabled:opacity-40"
        >
          <Sparkles className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Generate</span>
        </button>
        <button
          type="button"
          onClick={onExport}
          aria-label="Export storyboard"
          className="flex h-8 items-center gap-1.5 rounded-full border px-3 text-[10px] font-medium"
          style={{ borderColor: 'var(--editor-border)' }}
        >
          <Download className="h-3.5 w-3.5" /> <span className="hidden 2xl:inline">Export</span>
        </button>
        <button
          type="button"
          onClick={onToggleOutline}
          className="flex h-8 items-center gap-1.5 rounded-full border px-3 text-[10px] font-medium"
          aria-label="Scene and shot outline"
          style={{
            borderColor: outlineOpen ? 'var(--editor-text-primary)' : 'var(--editor-border)',
            backgroundColor: outlineOpen ? 'var(--editor-text-primary)' : 'transparent',
            color: outlineOpen ? 'var(--editor-bg-primary)' : 'var(--editor-text-tertiary)',
          }}
        >
          <PanelLeftOpen className="h-3.5 w-3.5" /> <span className="hidden xl:inline">Outline</span>
        </button>
        <button
          type="button"
          onClick={onToggleInspector}
          disabled={!hasShot}
          className="flex h-8 items-center gap-1.5 rounded-full border px-3 text-[10px] font-medium disabled:opacity-40"
          aria-label="Shot details"
          style={{
            borderColor: inspectorOpen ? 'var(--editor-text-primary)' : 'var(--editor-border)',
            backgroundColor: inspectorOpen ? 'var(--editor-text-primary)' : 'transparent',
            color: inspectorOpen ? 'var(--editor-bg-primary)' : 'var(--editor-text-tertiary)',
          }}
        >
          <PanelRightOpen className="h-3.5 w-3.5" /> <span className="hidden xl:inline">Shot details</span>
        </button>
      </div>
    </div>
  );
}
