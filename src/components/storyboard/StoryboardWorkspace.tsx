'use client';

import { useMemo, useState } from 'react';

import type { StoryboardEditorContext } from '@/lib/editor/state';
import {
  useStoryboardStore,
  type StoryboardPanelRole,
} from '@/lib/storyboard/store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { StoryboardOutline } from '@/components/storyboard/StoryboardOutline';
import { StoryboardExportDialog } from '@/components/storyboard/StoryboardExportDialog';
import { StoryboardWorkspaceToolbar } from '@/components/storyboard/StoryboardWorkspaceToolbar';
import { StoryboardGenerationDialog } from '@/components/storyboard/StoryboardGenerationDialog';
import { StoryboardEmpty, NewProjectDialog } from '@/components/storyboard/StoryboardProjectDialogs';
import { ProjectPanel } from '@/components/storyboard/ProjectPanel';
import { Board } from '@/components/storyboard/StoryboardBoard';
import { ShotInspector } from '@/components/storyboard/ShotInspector';
import type { StoryboardWorkspaceView } from '@/components/storyboard/storyboard-ui';

export function StoryboardWorkspace({
  onOpenImage,
  onOpenReferences,
}: {
  onOpenImage: (imageId: string, context?: StoryboardEditorContext) => void;
  onOpenReferences: () => void;
}) {
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [projectSettingsOpen, setProjectSettingsOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [generationOpen, setGenerationOpen] = useState(false);
  const [generationPanelRole, setGenerationPanelRole] = useState<StoryboardPanelRole>('start');
  const [exportOpen, setExportOpen] = useState(false);
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [view, setView] = useState<StoryboardWorkspaceView>('board');
  const projects = useStoryboardStore((state) => state.projects);
  const activeProjectId = useStoryboardStore((state) => state.activeProjectId);
  const selectedShotId = useStoryboardStore((state) => state.selectedShotId);
  const storageStatus = useStoryboardStore((state) => state.storageStatus);
  const setActiveProject = useStoryboardStore((state) => state.setActiveProject);
  const selectShot = useStoryboardStore((state) => state.selectShot);
  const updateProject = useStoryboardStore((state) => state.updateProject);
  const project = useMemo(
    () => projects.find((candidate) => candidate.id === activeProjectId) ?? projects[0] ?? null,
    [activeProjectId, projects],
  );
  const shot = project?.shots.find((candidate) => candidate.id === selectedShotId) ?? project?.shots[0] ?? null;

  const openInspector = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches) {
      setInspectorOpen(true);
    } else {
      setMobileInspectorOpen(true);
    }
  };

  const selectAndInspectShot = (shotId: string) => {
    selectShot(shotId);
    setMobileOutlineOpen(false);
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches) {
      setInspectorOpen(true);
    }
  };

  if (!project) {
    return (
      <>
        <StoryboardEmpty onCreate={() => setNewProjectOpen(true)} />
        <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} />
      </>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <StoryboardWorkspaceToolbar
        project={project}
        projects={projects}
        view={view}
        storageStatus={storageStatus}
        outlineOpen={outlineOpen}
        inspectorOpen={inspectorOpen}
        hasShot={Boolean(shot)}
        onProjectChange={setActiveProject}
        onViewChange={setView}
        onOpenReferences={onOpenReferences}
        onAspectChange={(aspect) => updateProject(project.id, { aspect })}
        onNewProject={() => setNewProjectOpen(true)}
        onGenerate={() => { setGenerationPanelRole('start'); setGenerationOpen(true); }}
        onExport={() => setExportOpen(true)}
        onToggleOutline={() => {
          if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
            setOutlineOpen((open) => !open);
          } else {
            setMobileOutlineOpen(true);
          }
        }}
        onToggleInspector={() => {
          if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches) {
            setInspectorOpen((open) => !open);
          } else {
            setMobileInspectorOpen(true);
          }
        }}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {outlineOpen && (
          <aside className="hidden w-[240px] shrink-0 border-r lg:block" style={{ borderColor: 'var(--editor-border)' }}>
            <StoryboardOutline
              project={project}
              selectedShotId={shot?.id ?? null}
              onSelectShot={selectAndInspectShot}
              onOpenSettings={() => setProjectSettingsOpen(true)}
            />
          </aside>
        )}
        <Board
          project={project}
          selectedShotId={shot?.id ?? null}
          view={view}
          hasOpenRail={outlineOpen || inspectorOpen}
          onInspectShot={openInspector}
        />
        {inspectorOpen && shot && (
          <div className="hidden w-[360px] shrink-0 xl:block">
            <ShotInspector key={shot.id} project={project} shot={shot} onOpenImage={onOpenImage} onClose={() => setInspectorOpen(false)} onGenerate={(panelRole) => { setGenerationPanelRole(panelRole); setGenerationOpen(true); }} />
          </div>
        )}
      </div>

      <Sheet open={mobileOutlineOpen} onOpenChange={setMobileOutlineOpen}>
        <SheetContent className="w-[280px] gap-0 p-0" side="left">
          <SheetHeader className="sr-only">
            <SheetTitle>Storyboard outline</SheetTitle>
            <SheetDescription>Navigate scenes and shots.</SheetDescription>
          </SheetHeader>
          <StoryboardOutline
            project={project}
            selectedShotId={shot?.id ?? null}
            onSelectShot={selectAndInspectShot}
            onOpenSettings={() => {
              setMobileOutlineOpen(false);
              setProjectSettingsOpen(true);
            }}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={mobileInspectorOpen} onOpenChange={setMobileInspectorOpen}>
        <SheetContent className="w-[360px] gap-0 p-0 sm:max-w-[360px]" side="right">
          <SheetHeader className="sr-only">
            <SheetTitle>Shot details</SheetTitle>
            <SheetDescription>Edit direction, references, timing, generation, and versions for the selected shot.</SheetDescription>
          </SheetHeader>
          {shot && <ShotInspector key={shot.id} project={project} shot={shot} onOpenImage={onOpenImage} onClose={() => setMobileInspectorOpen(false)} onGenerate={(panelRole) => { setMobileInspectorOpen(false); setGenerationPanelRole(panelRole); setGenerationOpen(true); }} />}
        </SheetContent>
      </Sheet>

      {shot && (
        <StoryboardGenerationDialog
          key={`${shot.id}-${generationPanelRole}`}
          open={generationOpen}
          onOpenChange={setGenerationOpen}
          project={project}
          shot={shot}
          initialPanelRole={generationPanelRole}
        />
      )}

      <StoryboardExportDialog open={exportOpen} onOpenChange={setExportOpen} project={project} />

      <Dialog open={projectSettingsOpen} onOpenChange={setProjectSettingsOpen}>
        <DialogContent className="h-[88vh] max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-4xl" showCloseButton={false}>
          <DialogHeader className="sr-only">
            <DialogTitle>Project and scene settings</DialogTitle>
            <DialogDescription>Edit project direction, scene defaults, references, and imported bundles.</DialogDescription>
          </DialogHeader>
          <ProjectPanel project={project} onClose={() => setProjectSettingsOpen(false)} />
        </DialogContent>
      </Dialog>

      <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} />
    </div>
  );
}
