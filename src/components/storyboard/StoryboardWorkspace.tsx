'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleCheck,
  Clock3,
  Film,
  HardDrive,
  ImagePlus,
  Layers3,
  Link2,
  LockKeyhole,
  MapPin,
  PanelLeftOpen,
  PanelRightOpen,
  Pause,
  Play,
  Plus,
  SkipBack,
  SkipForward,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import { createAIImagePreview } from '@/lib/ai/image-preview';
import { useGalleryStore, type GalleryImage } from '@/lib/gallery/store';
import { composeStoryboardPrompt, type PromptReference } from '@/lib/storyboard/prompt';
import { inferReferenceKind, referenceDisplayName } from '@/lib/storyboard/reference';
import {
  getSelectedTake,
  useStoryboardStore,
  type CameraAngle,
  type CameraMovement,
  type ReferenceKind,
  type ShotSize,
  type StoryboardAspect,
  type StoryboardProject,
  type StoryboardShot,
  type StoryboardStorageStatus,
} from '@/lib/storyboard/store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

const FIELD = 'w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none transition focus:border-neutral-500';
const LABEL = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em]';

const ASPECTS: Array<{ value: StoryboardAspect; label: string }> = [
  { value: 'landscape_16_9', label: '16:9' },
  { value: 'landscape_4_3', label: '4:3' },
  { value: 'portrait_16_9', label: '9:16' },
];

const REFERENCE_KINDS: Array<{ value: ReferenceKind; label: string }> = [
  { value: 'character', label: 'Character' },
  { value: 'location', label: 'Location' },
  { value: 'object', label: 'Object' },
  { value: 'style', label: 'Style' },
  { value: 'research', label: 'Research' },
];

const SHOT_SIZES: Array<{ value: ShotSize; label: string }> = [
  { value: 'unspecified', label: 'Shot size' },
  { value: 'extreme-wide', label: 'Extreme wide' },
  { value: 'wide', label: 'Wide' },
  { value: 'medium-wide', label: 'Medium wide' },
  { value: 'medium', label: 'Medium' },
  { value: 'medium-close-up', label: 'Medium close-up' },
  { value: 'close-up', label: 'Close-up' },
  { value: 'extreme-close-up', label: 'Extreme close-up' },
];

const CAMERA_ANGLES: Array<{ value: CameraAngle; label: string }> = [
  { value: 'unspecified', label: 'Camera angle' },
  { value: 'eye-level', label: 'Eye level' },
  { value: 'high-angle', label: 'High angle' },
  { value: 'low-angle', label: 'Low angle' },
  { value: 'overhead', label: 'Overhead' },
  { value: 'dutch-angle', label: 'Dutch angle' },
];

const CAMERA_MOVEMENTS: Array<{ value: CameraMovement; label: string }> = [
  { value: 'static', label: 'Static' },
  { value: 'pan', label: 'Pan' },
  { value: 'tilt', label: 'Tilt' },
  { value: 'dolly', label: 'Dolly' },
  { value: 'tracking', label: 'Tracking' },
  { value: 'handheld', label: 'Handheld' },
  { value: 'crane', label: 'Crane' },
  { value: 'zoom', label: 'Zoom' },
];

interface GeneratedBundleReference {
  id: string;
  kind: ReferenceKind;
  name: string;
  url: string;
}

interface GeneratedBundleShot {
  number: number;
  title: string;
  url: string;
  referenceIds: string[];
}

interface GeneratedStoryboardBundle {
  slug: string;
  project: string;
  generator: string;
  status?: string;
  historicalAccuracy?: string;
  references: GeneratedBundleReference[];
  shots: GeneratedBundleShot[];
}

export type StoryboardWorkspaceView = 'board' | 'shot-list' | 'timing';

function aspectClass(aspect: StoryboardAspect): string {
  if (aspect === 'portrait_16_9') return 'aspect-[9/16]';
  if (aspect === 'landscape_4_3') return 'aspect-[4/3]';
  return 'aspect-video';
}

function imageForTake(shot: StoryboardShot, images: GalleryImage[]): GalleryImage | null {
  const selected = getSelectedTake(shot);
  return selected ? images.find((image) => image.id === selected.imageId) ?? null : null;
}

function NewProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createProject = useStoryboardStore((state) => state.createProject);
  const [title, setTitle] = useState('');
  const [logline, setLogline] = useState('');
  const [visualDirection, setVisualDirection] = useState('');
  const [aspect, setAspect] = useState<StoryboardAspect>('landscape_16_9');

  const create = () => {
    createProject({ title, logline, visualDirection, aspect });
    setTitle('');
    setLogline('');
    setVisualDirection('');
    setAspect('landscape_16_9');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-neutral-200 bg-white sm:max-w-xl"
        style={{ color: 'var(--editor-text-primary)' }}
      >
        <DialogHeader>
          <DialogTitle>Start a visual story</DialogTitle>
          <DialogDescription>
            Establish the story and camera language first. Characters, locations, and shots come next.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <label>
            <span className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>Title</span>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="The last train north"
              className={FIELD}
              style={{ borderColor: 'var(--editor-border)' }}
            />
          </label>
          <label>
            <span className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>Story premise</span>
            <textarea
              value={logline}
              onChange={(event) => setLogline(event.target.value)}
              placeholder="A courier crosses a flooded city before sunrise to deliver a letter that could end a war."
              rows={3}
              className={`${FIELD} resize-none`}
              style={{ borderColor: 'var(--editor-border)' }}
            />
          </label>
          <label>
            <span className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>Visual language</span>
            <textarea
              value={visualDirection}
              onChange={(event) => setVisualDirection(event.target.value)}
              placeholder="Grounded 1970s political thriller, restrained camera, humid blue dawn, practical amber light, fine 35mm grain."
              rows={3}
              className={`${FIELD} resize-none`}
              style={{ borderColor: 'var(--editor-border)' }}
            />
          </label>
          <div>
            <span className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>Master frame</span>
            <div className="flex gap-2">
              {ASPECTS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAspect(option.value)}
                  className="rounded-full border px-4 py-2 text-xs font-medium"
                  style={{
                    borderColor: aspect === option.value ? 'var(--editor-text-primary)' : 'var(--editor-border)',
                    backgroundColor: aspect === option.value ? 'var(--editor-text-primary)' : 'transparent',
                    color: aspect === option.value ? 'var(--editor-bg-primary)' : 'var(--editor-text-tertiary)',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full px-4 py-2 text-sm"
            style={{ color: 'var(--editor-text-tertiary)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={create}
            disabled={!title.trim()}
            className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            Create storyboard
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StoryboardEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-8">
      <div className="max-w-2xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-xl">
          <Film className="h-7 w-7" />
        </div>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--editor-text-muted)' }}>
          Visual continuity studio
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">
          Make the images tell one story.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 md:text-base" style={{ color: 'var(--editor-text-tertiary)' }}>
          Build a reference library, organize scenes and shots, then select the storyboard panels that belong in the same film.
        </p>
        <button
          onClick={onCreate}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-neutral-950 px-6 py-3 text-sm font-medium text-white shadow-lg"
        >
          <Plus className="h-4 w-4" /> Start a storyboard
        </button>
        <div className="mx-auto mt-10 grid max-w-xl grid-cols-3 gap-3 text-left">
          {[
            ['01', 'Prepare references', 'Add recurring characters, costumes, locations, props, and lookbook images.'],
            ['02', 'Build scenes and shots', 'Describe the action, shot size, angle, movement, and composition.'],
            ['03', 'Select panels', 'Compare versions, check continuity, and time the storyboard as an animatic.'],
          ].map(([number, title, copy]) => (
            <div key={number} className="rounded-2xl border p-4" style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-primary)' }}>
              <span className="text-[10px] font-mono" style={{ color: 'var(--editor-text-muted)' }}>{number}</span>
              <p className="mt-3 text-xs font-semibold">{title}</p>
              <p className="mt-1 text-[11px] leading-5" style={{ color: 'var(--editor-text-tertiary)' }}>{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectPanel({ project, onClose }: { project: StoryboardProject; onClose: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingResearch, setIsImportingResearch] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [researchFormOpen, setResearchFormOpen] = useState(false);
  const [researchName, setResearchName] = useState('');
  const [researchImageUrl, setResearchImageUrl] = useState('');
  const [researchSourceUrl, setResearchSourceUrl] = useState('');
  const [researchSourceTitle, setResearchSourceTitle] = useState('');
  const [researchError, setResearchError] = useState<string | null>(null);
  const [bundlesOpen, setBundlesOpen] = useState(false);
  const [bundles, setBundles] = useState<GeneratedStoryboardBundle[]>([]);
  const [bundlesError, setBundlesError] = useState<string | null>(null);
  const [isLoadingBundles, setIsLoadingBundles] = useState(false);
  const [importingBundleSlug, setImportingBundleSlug] = useState<string | null>(null);
  const addImages = useGalleryStore((state) => state.addImages);
  const addImageFromUrl = useGalleryStore((state) => state.addImageFromUrl);
  const images = useGalleryStore((state) => state.images);
  const updateProject = useStoryboardStore((state) => state.updateProject);
  const addReference = useStoryboardStore((state) => state.addReference);
  const updateReference = useStoryboardStore((state) => state.updateReference);
  const removeReference = useStoryboardStore((state) => state.removeReference);
  const updateScene = useStoryboardStore((state) => state.updateScene);
  const updateShot = useStoryboardStore((state) => state.updateShot);
  const addTake = useStoryboardStore((state) => state.addTake);
  const selectedShotId = useStoryboardStore((state) => state.selectedShotId);
  const selectedShot = project.shots.find((shot) => shot.id === selectedShotId) ?? project.shots[0];
  const activeScene = project.scenes.find((scene) => scene.id === selectedShot?.sceneId) ?? project.scenes[0];

  useEffect(() => {
    if (!bundlesOpen || bundles.length > 0 || isLoadingBundles) return;
    setIsLoadingBundles(true);
    setBundlesError(null);
    fetch('/api/workspace/bundles', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load generated bundles.');
        setBundles(result.bundles ?? []);
      })
      .catch((error) => setBundlesError(error instanceof Error ? error.message : 'Could not load generated bundles.'))
      .finally(() => setIsLoadingBundles(false));
  }, [bundles.length, bundlesOpen, isLoadingBundles]);

  const toggleSceneReference = (referenceId: string) => {
    if (!activeScene) return;
    const removing = activeScene.referenceIds.includes(referenceId);
    const referenceIds = removing
      ? activeScene.referenceIds.filter((value) => value !== referenceId)
      : [...activeScene.referenceIds, referenceId];
    updateScene(project.id, activeScene.id, { referenceIds });
    if (!removing) {
      project.shots
        .filter((shot) => shot.sceneId === activeScene.id && shot.referenceIds.includes(referenceId))
        .forEach((shot) => updateShot(project.id, shot.id, { referenceIds: shot.referenceIds.filter((value) => value !== referenceId) }));
    }
  };

  const importReferences = async (files: File[]) => {
    if (files.length === 0) return;
    setIsImporting(true);
    try {
      const added = await addImages(files);
      for (const image of added) {
        addReference(project.id, {
          imageId: image.id,
          name: referenceDisplayName(image.fileName),
          kind: inferReferenceKind(image.fileName),
          description: '',
        });
      }
    } finally {
      setIsImporting(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const importResearchReference = async () => {
    if (!researchName.trim() || !researchImageUrl.trim() || isImportingResearch) return;
    setIsImportingResearch(true);
    setResearchError(null);

    try {
      const safeName = researchName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'research-reference';
      const image = await addImageFromUrl(researchImageUrl.trim(), `${safeName}-research.png`);
      addReference(project.id, {
        imageId: image.id,
        name: researchName.trim(),
        kind: 'research',
        description: '',
        sourceUrl: researchSourceUrl.trim(),
        sourceTitle: researchSourceTitle.trim(),
        rightsNote: 'Research use; verify reuse rights before publication.',
      });
      setResearchName('');
      setResearchImageUrl('');
      setResearchSourceUrl('');
      setResearchSourceTitle('');
      setResearchFormOpen(false);
      setLibraryOpen(true);
    } catch {
      setResearchError('This source blocked direct import. Download the image and use Add instead.');
    } finally {
      setIsImportingResearch(false);
    }
  };

  const importGeneratedBundle = async (bundle: GeneratedStoryboardBundle) => {
    if (importingBundleSlug) return;
    setImportingBundleSlug(bundle.slug);
    setBundlesError(null);

    try {
      const referenceIds = new Map<string, string>();

      for (const bundledReference of bundle.references) {
        const latestProject = useStoryboardStore.getState().projects.find((candidate) => candidate.id === project.id);
        const existingReference = latestProject?.references.find((reference) =>
          reference.sourceUrl === bundledReference.url
          || (reference.name === bundledReference.name && reference.sourceTitle === bundle.generator));
        if (existingReference) {
          referenceIds.set(bundledReference.id, existingReference.id);
          continue;
        }

        let image = useGalleryStore.getState().images.find((candidate) => candidate.sourceUrl === bundledReference.url);
        if (!image) {
          image = await addImageFromUrl(
            bundledReference.url,
            bundledReference.url.split('/').pop() || `${bundledReference.id}.png`,
            { provider: bundle.generator, sourceUrl: bundledReference.url },
          );
        }

        const referenceId = addReference(project.id, {
          imageId: image.id,
          name: bundledReference.name,
          kind: bundledReference.kind,
          description: '',
          sourceUrl: bundledReference.url,
          sourceTitle: bundle.generator,
          rightsNote: 'AI-generated production reference; verify historical details before publication.',
        });
        referenceIds.set(bundledReference.id, referenceId);
      }

      for (const bundledShot of bundle.shots) {
        const latestProject = useStoryboardStore.getState().projects.find((candidate) => candidate.id === project.id);
        const targetShot = latestProject?.shots[bundledShot.number - 1]
          ?? latestProject?.shots.find((shot) => shot.title.toLowerCase() === bundledShot.title.toLowerCase());
        if (!targetShot) continue;

        let image = useGalleryStore.getState().images.find((candidate) => candidate.sourceUrl === bundledShot.url);
        if (!image) {
          image = await addImageFromUrl(
            bundledShot.url,
            bundledShot.url.split('/').pop() || `shot-${bundledShot.number}.png`,
            { provider: bundle.generator, sourceUrl: bundledShot.url },
          );
        }

        if (!targetShot.takes.some((take) => take.imageId === image.id)) {
          addTake(project.id, targetShot.id, {
            imageId: image.id,
            prompt: `Imported generated panel: ${bundledShot.title}`,
            referenceIds: bundledShot.referenceIds.flatMap((id) => referenceIds.get(id) ?? []),
            model: bundle.generator,
            seed: null,
          });
        }

        const mappedReferenceIds = bundledShot.referenceIds.flatMap((id) => referenceIds.get(id) ?? []);
        if (mappedReferenceIds.length > 0) {
          updateShot(project.id, targetShot.id, {
            referenceIds: Array.from(new Set([...targetShot.referenceIds, ...mappedReferenceIds])),
          });
        }
      }

      setLibraryOpen(true);
    } catch (error) {
      setBundlesError(error instanceof Error ? error.message : 'Could not import the generated bundle.');
    } finally {
      setImportingBundleSlug(null);
    }
  };

  return (
    <aside
      className="h-full overflow-y-auto p-5 md:p-6"
      style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-primary)' }}
    >
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => importReferences(Array.from(event.target.files ?? []))}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          <p className="text-xs font-semibold">Project &amp; scene</p>
        </div>
        <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100" aria-label="Close project setup">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-4 space-y-3">
        <label>
          <span className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>Title</span>
          <input
            value={project.title}
            onChange={(event) => updateProject(project.id, { title: event.target.value })}
            className={`${FIELD} font-medium`}
            style={{ borderColor: 'var(--editor-border)' }}
            aria-label="Project title"
          />
        </label>
        <label>
          <span className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>Premise</span>
          <textarea
            value={project.logline}
            onChange={(event) => updateProject(project.id, { logline: event.target.value })}
            rows={3}
            className={`${FIELD} resize-none text-xs leading-5`}
            style={{ borderColor: 'var(--editor-border)' }}
            placeholder="What is this story about?"
          />
        </label>
        <label>
          <span className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>Look &amp; tone</span>
          <textarea
            value={project.visualDirection}
            onChange={(event) => updateProject(project.id, { visualDirection: event.target.value })}
            rows={5}
            className={`${FIELD} resize-none text-xs leading-5`}
            style={{ borderColor: 'var(--editor-border)' }}
            placeholder="Medium, era, camera, palette, light, texture…"
          />
        </label>
      </div>

      <div className="my-5 h-px" style={{ backgroundColor: 'var(--editor-border)' }} />

      {activeScene && (
        <>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold">Scene setup</p>
              <p className="mt-1 text-[10px]" style={{ color: 'var(--editor-text-muted)' }}>Defaults inherited by shots in this scene</p>
            </div>
            <span className="rounded-full bg-neutral-100 px-2 py-1 text-[9px] font-medium">{project.scenes.indexOf(activeScene) + 1} / {project.scenes.length}</span>
          </div>
          <div className="mt-3 space-y-2.5">
            <input
              value={activeScene.title}
              onChange={(event) => updateScene(project.id, activeScene.id, { title: event.target.value })}
              className={FIELD}
              style={{ borderColor: 'var(--editor-border)' }}
              aria-label="Scene name"
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="relative">
                <MapPin className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2" style={{ color: 'var(--editor-text-muted)' }} />
                <input
                  value={activeScene.location}
                  onChange={(event) => updateScene(project.id, activeScene.id, { location: event.target.value })}
                  placeholder="Location"
                  className={`${FIELD} pl-7 text-xs`}
                  style={{ borderColor: 'var(--editor-border)' }}
                  aria-label="Scene location"
                />
              </label>
              <label className="relative">
                <Clock3 className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2" style={{ color: 'var(--editor-text-muted)' }} />
                <input
                  value={activeScene.timeOfDay}
                  onChange={(event) => updateScene(project.id, activeScene.id, { timeOfDay: event.target.value })}
                  placeholder="Time of day"
                  className={`${FIELD} pl-7 text-xs`}
                  style={{ borderColor: 'var(--editor-border)' }}
                  aria-label="Scene time of day"
                />
              </label>
            </div>
            <textarea
              value={activeScene.summary}
              onChange={(event) => updateScene(project.id, activeScene.id, { summary: event.target.value })}
              rows={2}
              placeholder="What happens in this scene?"
              className={`${FIELD} resize-none text-xs leading-5`}
              style={{ borderColor: 'var(--editor-border)' }}
              aria-label="Scene action"
            />
          </div>
          {project.references.length > 0 && (
            <div className="mt-3">
              <p className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>Scene references</p>
              <div className="flex flex-wrap gap-1.5">
                {project.references.map((reference) => {
                  const active = activeScene.referenceIds.includes(reference.id);
                  return (
                    <button
                      key={reference.id}
                      type="button"
                      onClick={() => toggleSceneReference(reference.id)}
                      className="rounded-full border px-2.5 py-1 text-[9px] font-medium"
                      style={{
                        borderColor: active ? 'var(--editor-text-primary)' : 'var(--editor-border)',
                        backgroundColor: active ? 'var(--editor-text-primary)' : 'transparent',
                        color: active ? 'var(--editor-bg-primary)' : 'var(--editor-text-tertiary)',
                      }}
                    >
                      {reference.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="my-5 h-px" style={{ backgroundColor: 'var(--editor-border)' }} />
        </>
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-3.5 w-3.5" />
            <p className="text-xs font-semibold">Reference library</p>
          </div>
          <p className="mt-1 text-[10px]" style={{ color: 'var(--editor-text-muted)' }}>
            {project.references.length} project reference{project.references.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex max-w-[13rem] flex-wrap items-center justify-end gap-1.5">
          {project.references.length > 0 && (
            <button
              type="button"
              onClick={() => setLibraryOpen((value) => !value)}
              className="h-8 rounded-full border px-3 text-[10px] font-medium"
              style={{ borderColor: 'var(--editor-border)' }}
            >
              {libraryOpen ? 'Done' : 'Manage'}
            </button>
          )}
          <button
            type="button"
            onClick={() => { setResearchFormOpen((value) => !value); setResearchError(null); }}
            className="flex h-8 items-center gap-1.5 rounded-full border px-3 text-[10px] font-medium"
            style={{ borderColor: 'var(--editor-border)' }}
          >
            <Link2 className="h-3 w-3" /> Web
          </button>
          <button
            type="button"
            onClick={() => { setBundlesOpen((value) => !value); setBundlesError(null); }}
            className="flex h-8 items-center gap-1.5 rounded-full border px-3 text-[10px] font-medium"
            style={{ borderColor: 'var(--editor-border)' }}
          >
            <Layers3 className="h-3 w-3" /> Imports
          </button>
          <button
            onClick={() => fileInput.current?.click()}
            disabled={isImporting}
            className="flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium disabled:opacity-50"
            style={{ borderColor: 'var(--editor-border)' }}
          >
            <Upload className="h-3 w-3" /> {isImporting ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>

      {researchFormOpen && (
        <div className="mt-3 rounded-xl border p-3" style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-secondary)' }}>
          <p className="text-[10px] font-semibold">Add a research image</p>
          <p className="mt-1 text-[9px] leading-4" style={{ color: 'var(--editor-text-muted)' }}>
            Lumen stores a local copy and keeps the source page attached for provenance.
          </p>
          <div className="mt-3 grid gap-2">
            <input value={researchName} onChange={(event) => setResearchName(event.target.value)} placeholder="Reference name" className={`${FIELD} text-xs`} style={{ borderColor: 'var(--editor-border)' }} aria-label="Research reference name" />
            <input type="url" value={researchImageUrl} onChange={(event) => setResearchImageUrl(event.target.value)} placeholder="Direct image URL" className={`${FIELD} text-xs`} style={{ borderColor: 'var(--editor-border)' }} aria-label="Research image URL" />
            <input value={researchSourceTitle} onChange={(event) => setResearchSourceTitle(event.target.value)} placeholder="Source or collection" className={`${FIELD} text-xs`} style={{ borderColor: 'var(--editor-border)' }} aria-label="Research source title" />
            <input type="url" value={researchSourceUrl} onChange={(event) => setResearchSourceUrl(event.target.value)} placeholder="Source page URL" className={`${FIELD} text-xs`} style={{ borderColor: 'var(--editor-border)' }} aria-label="Research source page URL" />
          </div>
          {researchError && <p className="mt-2 text-[9px] leading-4 text-red-600">{researchError}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setResearchFormOpen(false)} className="rounded-full px-3 py-1.5 text-[10px]" style={{ color: 'var(--editor-text-muted)' }}>Cancel</button>
            <button type="button" onClick={importResearchReference} disabled={!researchName.trim() || !researchImageUrl.trim() || isImportingResearch} className="rounded-full bg-neutral-950 px-3 py-1.5 text-[10px] font-medium text-white disabled:opacity-40">
              {isImportingResearch ? 'Importing…' : 'Add research'}
            </button>
          </div>
        </div>
      )}

      {bundlesOpen && (
        <div className="mt-3 rounded-xl border p-3" style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-secondary)' }}>
          <p className="text-[10px] font-semibold">Generation imports</p>
          <p className="mt-1 text-[9px] leading-4" style={{ color: 'var(--editor-text-muted)' }}>
            Bring externally generated references and numbered panels into this project. In-app generations are saved automatically.
          </p>
          {isLoadingBundles && <p className="mt-3 text-[10px]" style={{ color: 'var(--editor-text-muted)' }}>Looking for bundles…</p>}
          {!isLoadingBundles && bundles.length === 0 && !bundlesError && (
            <p className="mt-3 rounded-lg border border-dashed p-3 text-[10px]" style={{ borderColor: 'var(--editor-border)', color: 'var(--editor-text-muted)' }}>
              No generation manifests found under public/generated.
            </p>
          )}
          <div className="mt-3 space-y-2">
            {bundles.map((bundle) => (
              <div key={bundle.slug} className="rounded-lg border p-2.5" style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-primary)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold">{bundle.project}</p>
                    <p className="mt-1 text-[9px]" style={{ color: 'var(--editor-text-muted)' }}>
                      {bundle.references.length} references · {bundle.shots.length} panels · {bundle.generator}
                    </p>
                    {bundle.project !== project.title && (
                      <p className="mt-1 text-[9px] text-amber-700">This bundle was made for a different project title.</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => importGeneratedBundle(bundle)}
                    disabled={Boolean(importingBundleSlug)}
                    className="shrink-0 rounded-full bg-neutral-950 px-3 py-1.5 text-[9px] font-medium text-white disabled:opacity-40"
                  >
                    {importingBundleSlug === bundle.slug ? 'Importing…' : 'Import'}
                  </button>
                </div>
                {bundle.historicalAccuracy && (
                  <p className="mt-2 text-[9px] leading-4" style={{ color: 'var(--editor-text-tertiary)' }}>{bundle.historicalAccuracy}</p>
                )}
              </div>
            ))}
          </div>
          {bundlesError && <p className="mt-2 text-[9px] leading-4 text-red-600">{bundlesError}</p>}
        </div>
      )}

      {project.references.length === 0 ? (
        <button
          onClick={() => fileInput.current?.click()}
          className="mt-3 flex w-full flex-col items-center rounded-xl border border-dashed px-4 py-7 text-center"
          style={{ borderColor: 'var(--editor-border)', color: 'var(--editor-text-tertiary)' }}
        >
          <ImagePlus className="h-5 w-5" />
          <span className="mt-2 text-xs font-medium">Add recurring references</span>
          <span className="mt-1 text-[10px] leading-4">Faces, outfits, places, props, or one style anchor.</span>
        </button>
      ) : libraryOpen ? (
        <div className="mt-3 space-y-3">
          <p className="rounded-lg bg-neutral-100 px-3 py-2 text-[9px] leading-4" style={{ color: 'var(--editor-text-tertiary)' }}>
            Keep one recurring subject per reference. Assign reusable defaults to the scene, then add only exceptional references to an individual shot.
          </p>
          {project.references.map((reference) => {
            const image = images.find((candidate) => candidate.id === reference.imageId);
            return (
              <div key={reference.id} className="rounded-xl border p-2" style={{ borderColor: 'var(--editor-border)' }}>
                <div className="flex gap-2">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    {image ? (
                      // Local workspace images are intentionally rendered directly.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    ) : <div className="h-full w-full bg-neutral-200" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <input
                      value={reference.name}
                      onChange={(event) => updateReference(project.id, reference.id, { name: event.target.value })}
                      className="w-full bg-transparent text-xs font-semibold outline-none"
                      aria-label="Reference name"
                    />
                    <div className="relative mt-1">
                      <select
                        value={reference.kind}
                        onChange={(event) => updateReference(project.id, reference.id, { kind: event.target.value as ReferenceKind })}
                        className="w-full appearance-none rounded-md border bg-transparent px-2 py-1 pr-6 text-[10px] outline-none"
                        style={{ borderColor: 'var(--editor-border)', color: 'var(--editor-text-tertiary)' }}
                        aria-label="Reference type"
                      >
                        {REFERENCE_KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2" />
                    </div>
                  </div>
                  <button
                    onClick={() => removeReference(project.id, reference.id)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full opacity-50 hover:bg-red-50 hover:text-red-600 hover:opacity-100"
                    aria-label={`Remove ${reference.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  value={reference.description}
                  onChange={(event) => updateReference(project.id, reference.id, { description: event.target.value })}
                  placeholder="Describe only this subject: identity, outfit, or defining features…"
                  className="mt-2 w-full bg-transparent text-[10px] leading-4 outline-none"
                  style={{ color: 'var(--editor-text-tertiary)' }}
                  aria-label={`Notes for ${reference.name}`}
                />
                {reference.kind === 'research' && (
                  <div className="mt-2 grid gap-1.5 border-t pt-2" style={{ borderColor: 'var(--editor-border)' }}>
                    <input
                      value={reference.sourceTitle ?? ''}
                      onChange={(event) => updateReference(project.id, reference.id, { sourceTitle: event.target.value })}
                      placeholder="Source or collection"
                      className="w-full bg-transparent text-[9px] outline-none"
                      style={{ color: 'var(--editor-text-tertiary)' }}
                      aria-label={`Source for ${reference.name}`}
                    />
                    <input
                      type="url"
                      value={reference.sourceUrl ?? ''}
                      onChange={(event) => updateReference(project.id, reference.id, { sourceUrl: event.target.value })}
                      placeholder="Source page URL"
                      className="w-full bg-transparent text-[9px] outline-none"
                      style={{ color: 'var(--editor-text-muted)' }}
                      aria-label={`Source URL for ${reference.name}`}
                    />
                    <input
                      value={reference.rightsNote ?? ''}
                      onChange={(event) => updateReference(project.id, reference.id, { rightsNote: event.target.value })}
                      placeholder="Rights or usage note"
                      className="w-full bg-transparent text-[9px] outline-none"
                      style={{ color: 'var(--editor-text-muted)' }}
                      aria-label={`Rights note for ${reference.name}`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-neutral-100 px-3 py-2 text-[9px] leading-4" style={{ color: 'var(--editor-text-tertiary)' }}>
          References stay collapsed while you board. Use Manage to rename, classify, or remove them.
        </p>
      )}
    </aside>
  );
}

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

function Board({
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
  const playbackShot = project.shots.find((shot) => shot.id === selectedShotId) ?? project.shots[0];
  const playbackIndex = playbackShot ? project.shots.findIndex((shot) => shot.id === playbackShot.id) : -1;
  const playbackImage = playbackShot ? imageForTake(playbackShot, images) : null;
  const elapsedBeforeShot = playbackIndex > 0
    ? project.shots.slice(0, playbackIndex).reduce((sum, shot) => sum + shot.durationSeconds, 0)
    : 0;
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (view !== 'timing' || !isPlaying || !playbackShot) return;
    const timer = window.setTimeout(() => {
      const nextShot = project.shots[playbackIndex + 1];
      if (nextShot) selectShot(nextShot.id);
      else setIsPlaying(false);
    }, Math.max(500, playbackShot.durationSeconds * 1000));
    return () => window.clearTimeout(timer);
  }, [isPlaying, playbackIndex, playbackShot, project.shots, selectShot, view]);

  const selectPreviousPlaybackShot = () => {
    const previous = project.shots[Math.max(0, playbackIndex - 1)];
    if (previous) selectShot(previous.id);
  };

  const selectNextPlaybackShot = () => {
    const next = project.shots[Math.min(project.shots.length - 1, playbackIndex + 1)];
    if (next) selectShot(next.id);
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
                    <p className="font-mono text-[9px] text-white/55">SHOT {String(playbackIndex + 1).padStart(2, '0')}</p>
                    <p className="mt-1 text-sm font-medium">{playbackShot.title}</p>
                  </div>
                  <p className="text-[10px] tabular-nums text-white/60">{playbackShot.durationSeconds.toFixed(1)} sec</p>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 px-4 py-3">
              <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${totalDuration ? (elapsedBeforeShot / totalDuration) * 100 : 0}%` }} />
              </div>
              <div className="flex items-center justify-center gap-3">
                <button type="button" onClick={selectPreviousPlaybackShot} aria-label="Previous shot" disabled={playbackIndex <= 0} className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 disabled:opacity-25"><SkipBack className="h-3.5 w-3.5" /></button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isPlaying && playbackIndex === project.shots.length - 1 && project.shots[0]) selectShot(project.shots[0].id);
                    setIsPlaying((value) => !value);
                  }}
                  aria-label={isPlaying ? 'Pause animatic' : 'Play animatic'}
                  disabled={project.shots.length === 0}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black disabled:opacity-30"
                >
                  {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
                </button>
                <button type="button" onClick={selectNextPlaybackShot} aria-label="Next shot" disabled={playbackIndex < 0 || playbackIndex >= project.shots.length - 1} className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 disabled:opacity-25"><SkipForward className="h-3.5 w-3.5" /></button>
                <span className="ml-2 min-w-24 text-[9px] tabular-nums text-white/45">{elapsedBeforeShot.toFixed(1)} / {totalDuration.toFixed(1)} sec</span>
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
                      onClick={() => selectShot(timelineShot.id)}
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
                        <p className="mt-1 text-[9px] text-white/45">{timelineShot.durationSeconds}s · {CAMERA_MOVEMENTS.find((item) => item.value === timelineShot.cameraMovement)?.label}</p>
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

function ShotInspector({
  project,
  shot,
  onOpenImage,
  onClose,
  onGenerate,
}: {
  project: StoryboardProject;
  shot: StoryboardShot;
  onOpenImage: (imageId: string) => void;
  onClose: () => void;
  onGenerate: () => void;
}) {
  const takeInput = useRef<HTMLInputElement>(null);
  const images = useGalleryStore((state) => state.images);
  const addImages = useGalleryStore((state) => state.addImages);
  const updateShot = useStoryboardStore((state) => state.updateShot);
  const addTake = useStoryboardStore((state) => state.addTake);
  const selectTake = useStoryboardStore((state) => state.selectTake);
  const addReference = useStoryboardStore((state) => state.addReference);
  const removeShot = useStoryboardStore((state) => state.removeShot);
  const [isImportingTake, setIsImportingTake] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shotIndex = project.shots.findIndex((candidate) => candidate.id === shot.id);
  const scene = project.scenes.find((candidate) => candidate.id === shot.sceneId) ?? project.scenes[0];
  const sceneReferenceIds = scene?.referenceIds ?? [];
  const activeReferenceIds = Array.from(new Set([...sceneReferenceIds, ...shot.referenceIds]));
  const previousCandidate = shotIndex > 0 ? project.shots[shotIndex - 1] : null;
  const previousShot = previousCandidate?.sceneId === shot.sceneId ? previousCandidate : null;
  const previousTake = previousShot ? getSelectedTake(previousShot) : null;

  const toggleReference = (referenceId: string) => {
    const next = shot.referenceIds.includes(referenceId)
      ? shot.referenceIds.filter((id) => id !== referenceId)
      : [...shot.referenceIds, referenceId];
    updateShot(project.id, shot.id, { referenceIds: next });
  };

  const importTakes = async (files: File[]) => {
    if (files.length === 0 || isImportingTake) return;
    setIsImportingTake(true);
    setError(null);

    try {
      const added = await addImages(files);
      for (const image of added) {
        addTake(project.id, shot.id, {
          imageId: image.id,
          prompt: shot.prompt,
          referenceIds: activeReferenceIds,
          model: 'Imported image',
          seed: null,
        });
      }
      if (added.length === 0) throw new Error('No supported image files were imported.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The take could not be imported.');
    } finally {
      setIsImportingTake(false);
      if (takeInput.current) takeInput.current.value = '';
    }
  };

  return (
    <aside
      className="fixed inset-x-0 bottom-0 top-[7.5rem] z-30 overflow-y-auto border-t p-4 lg:static lg:order-3 lg:h-full lg:border-l lg:border-t-0"
      style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-primary)' }}
    >
      <input
        ref={takeInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => importTakes(Array.from(event.target.files ?? []))}
      />

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--editor-text-muted)' }}>
            Shot {String(shotIndex + 1).padStart(2, '0')}
          </p>
          <p className="mt-1 text-xs font-semibold">Shot details</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => removeShot(project.id, shot.id)}
            disabled={project.shots.length <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-red-50 hover:text-red-600 disabled:opacity-20"
            aria-label="Delete shot"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100" aria-label="Close shot details">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <label>
          <span className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>Shot name</span>
          <input
            value={shot.title}
            onChange={(event) => updateShot(project.id, shot.id, { title: event.target.value })}
            className={FIELD}
            style={{ borderColor: 'var(--editor-border)' }}
          />
        </label>
        <label>
          <span className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>Scene</span>
          <div className="relative">
            <select
              value={shot.sceneId}
              onChange={(event) => updateShot(project.id, shot.id, { sceneId: event.target.value })}
              className={`${FIELD} appearance-none pr-8 text-xs`}
              style={{ borderColor: 'var(--editor-border)' }}
            >
              {project.scenes.map((candidate, index) => <option key={candidate.id} value={candidate.id}>{index + 1}. {candidate.title}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2" />
          </div>
        </label>
        <label>
          <span className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>Action / beat</span>
          <textarea
            value={shot.beat}
            onChange={(event) => updateShot(project.id, shot.id, { beat: event.target.value })}
            rows={2}
            className={`${FIELD} resize-none text-xs leading-5`}
            style={{ borderColor: 'var(--editor-border)' }}
            placeholder="What happens or changes during this shot?"
          />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label>
            <span className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>Size</span>
            <select value={shot.shotSize} onChange={(event) => updateShot(project.id, shot.id, { shotSize: event.target.value as ShotSize })} className={`${FIELD} px-2 text-[10px]`} style={{ borderColor: 'var(--editor-border)' }}>
              {SHOT_SIZES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>Angle</span>
            <select value={shot.cameraAngle} onChange={(event) => updateShot(project.id, shot.id, { cameraAngle: event.target.value as CameraAngle })} className={`${FIELD} px-2 text-[10px]`} style={{ borderColor: 'var(--editor-border)' }}>
              {CAMERA_ANGLES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>Movement</span>
            <select value={shot.cameraMovement} onChange={(event) => updateShot(project.id, shot.id, { cameraMovement: event.target.value as CameraMovement })} className={`${FIELD} px-2 text-[10px]`} style={{ borderColor: 'var(--editor-border)' }}>
              {CAMERA_MOVEMENTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <label>
          <span className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>Shot description</span>
          <textarea
            value={shot.prompt}
            onChange={(event) => updateShot(project.id, shot.id, { prompt: event.target.value })}
            rows={5}
            className={`${FIELD} resize-none text-xs leading-5`}
            style={{ borderColor: 'var(--editor-border)' }}
            placeholder="Wide shot from behind the courier as she enters the flooded station. The red satchel is visible at her left hip…"
          />
        </label>
        <div className="grid grid-cols-[88px_1fr] gap-2">
          <label>
            <span className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>Duration</span>
            <div className="relative">
              <input
                type="number"
                min="0.5"
                max="120"
                step="0.5"
                value={shot.durationSeconds}
                onChange={(event) => updateShot(project.id, shot.id, { durationSeconds: Math.max(0.5, Number(event.target.value) || 0.5) })}
                className={`${FIELD} pr-6 text-xs`}
                style={{ borderColor: 'var(--editor-border)' }}
                aria-label="Shot duration in seconds"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px]" style={{ color: 'var(--editor-text-muted)' }}>s</span>
            </div>
          </label>
          <label>
            <span className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>Dialogue / voice-over</span>
            <input
              value={shot.dialogue}
              onChange={(event) => updateShot(project.id, shot.id, { dialogue: event.target.value })}
              placeholder="Optional"
              className={`${FIELD} text-xs`}
              style={{ borderColor: 'var(--editor-border)' }}
            />
          </label>
        </div>
        <label>
          <span className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>Continuity requirements</span>
          <textarea
            value={shot.continuityNotes}
            onChange={(event) => updateShot(project.id, shot.id, { continuityNotes: event.target.value })}
            rows={2}
            className={`${FIELD} resize-none text-xs leading-5`}
            style={{ borderColor: 'var(--editor-border)' }}
            placeholder="Same raincoat and satchel; water remains ankle-deep; key light stays camera-left."
          />
        </label>
      </div>

      <div className="my-5 h-px" style={{ backgroundColor: 'var(--editor-border)' }} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LockKeyhole className="h-3.5 w-3.5" />
          <p className="text-xs font-semibold">Shot references</p>
        </div>
        <span className="text-[9px] font-mono" style={{ color: 'var(--editor-text-muted)' }}>
          {sceneReferenceIds.length} scene · {shot.referenceIds.length} shot
        </span>
      </div>

      {project.references.length === 0 ? (
        <p className="mt-3 rounded-lg bg-neutral-100 px-3 py-2.5 text-[10px] leading-4" style={{ color: 'var(--editor-text-tertiary)' }}>
          Add characters, locations, props, or a style image to the Reference Library. Assign recurring references at scene level and exceptions here.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {project.references.map((reference) => {
            const image = images.find((candidate) => candidate.id === reference.imageId);
            const active = shot.referenceIds.includes(reference.id);
            const inherited = sceneReferenceIds.includes(reference.id);
            return (
              <button
                key={reference.id}
                onClick={() => !inherited && toggleReference(reference.id)}
                disabled={inherited}
                className="relative overflow-hidden rounded-lg border text-left"
                style={{ borderColor: active || inherited ? 'var(--editor-text-primary)' : 'var(--editor-border)', opacity: inherited ? 0.78 : 1 }}
              >
                <div className="aspect-[4/3] bg-neutral-100">
                  {image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-[10px] font-semibold">{reference.name}</p>
                  <p className="mt-0.5 text-[9px] capitalize" style={{ color: 'var(--editor-text-muted)' }}>{inherited ? 'Scene default' : active ? 'This shot' : reference.kind}</p>
                </div>
                <span
                  className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border text-white"
                  style={{ backgroundColor: active || inherited ? '#111' : 'rgba(0,0,0,.35)', borderColor: 'rgba(255,255,255,.65)' }}
                >
                  {(active || inherited) && <Check className="h-3 w-3" />}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {previousShot && (
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-2.5" style={{ borderColor: 'var(--editor-border)' }}>
            <input
              type="checkbox"
              checked={shot.usePreviousPanel}
              onChange={(event) => updateShot(project.id, shot.id, { usePreviousPanel: event.target.checked })}
              disabled={!previousTake}
              className="mt-0.5"
            />
            <span>
              <span className="block text-[10px] font-semibold">Use previous panel as reference</span>
              <span className="mt-0.5 block text-[9px] leading-4" style={{ color: 'var(--editor-text-muted)' }}>
                {previousTake ? `Opt in when ${previousShot.title} is continuous action—not for every cut.` : `${previousShot.title} needs a selected version first.`}
              </span>
            </span>
          </label>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[10px] leading-4 text-red-700" role="alert">{error}</p>
      )}

      <button
        onClick={onGenerate}
        disabled={!shot.prompt.trim()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-xs font-medium text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {shot.takes.length ? 'Generate alternative' : 'Generate panel'}
      </button>
      <button
        type="button"
        onClick={() => takeInput.current?.click()}
        disabled={isImportingTake}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] font-medium disabled:opacity-40"
        style={{ borderColor: 'var(--editor-border)' }}
      >
        <Upload className="h-3.5 w-3.5" /> {isImportingTake ? 'Importing…' : 'Import existing version'}
      </button>
      <p className="mt-2 text-center text-[9px] leading-4" style={{ color: 'var(--editor-text-muted)' }}>Review the target, references, provider, and price before starting a paid run.</p>

      {shot.takes.length > 0 && (
        <>
          <div className="my-5 h-px" style={{ backgroundColor: 'var(--editor-border)' }} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers3 className="h-3.5 w-3.5" />
              <p className="text-xs font-semibold">Versions</p>
            </div>
            <span className="text-[9px]" style={{ color: 'var(--editor-text-muted)' }}>Choose the version used on the board</span>
          </div>
          <div className="mt-3 space-y-2">
            {[...shot.takes].reverse().map((take, reverseIndex) => {
              const image = images.find((candidate) => candidate.id === take.imageId);
              const selected = shot.selectedTakeId === take.id;
              const isBibleReference = project.references.some((reference) => reference.imageId === take.imageId);
              const takeNumber = shot.takes.length - reverseIndex;
              return (
                <div
                  key={take.id}
                  className="flex gap-2 rounded-xl border p-2"
                  style={{ borderColor: selected ? 'var(--editor-text-primary)' : 'var(--editor-border)' }}
                >
                  <button
                    onClick={() => selectTake(project.id, shot.id, take.id)}
                    className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-neutral-100"
                    aria-label={`Select version ${takeNumber}`}
                  >
                    {image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    )}
                    {selected && (
                      <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-950 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                  <div className="min-w-0 flex-1 py-0.5">
                    <p className="text-[10px] font-semibold">Version {takeNumber}</p>
                    <p className="mt-1 truncate text-[9px]" style={{ color: 'var(--editor-text-muted)' }}>
                      {take.referenceIds.length} reference{take.referenceIds.length === 1 ? '' : 's'} · {take.model}
                    </p>
                    <div className="mt-3 flex gap-1.5">
                      {!selected && (
                        <button
                          onClick={() => selectTake(project.id, shot.id, take.id)}
                          className="rounded-full bg-neutral-950 px-2.5 py-1 text-[9px] font-medium text-white"
                        >
                          Select
                        </button>
                      )}
                      {image && (
                        <>
                          <button
                            onClick={() => onOpenImage(image.id)}
                            className="rounded-full border px-2.5 py-1 text-[9px] font-medium"
                            style={{ borderColor: 'var(--editor-border)' }}
                          >
                            Finish
                          </button>
                          <button
                            onClick={() => {
                              if (isBibleReference) return;
                              addReference(project.id, {
                                imageId: image.id,
                                name: `${shot.title} reference`,
                                kind: 'style',
                                description: `Visual reference established in ${shot.title}. Rename it and classify it as a character, location, object, or style reference.`,
                              });
                            }}
                            disabled={isBibleReference}
                            className="rounded-full border px-2.5 py-1 text-[9px] font-medium disabled:opacity-40"
                            style={{ borderColor: 'var(--editor-border)' }}
                          >
                            {isBibleReference ? 'In library' : 'Add to library'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </aside>
  );
}

function StoryboardGenerationDialog({
  open,
  onOpenChange,
  project,
  shot,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: StoryboardProject;
  shot: StoryboardShot;
}) {
  const images = useGalleryStore((state) => state.images);
  const addImageFromUrl = useGalleryStore((state) => state.addImageFromUrl);
  const updateProject = useStoryboardStore((state) => state.updateProject);
  const addTake = useStoryboardStore((state) => state.addTake);
  const [refineSelected, setRefineSelected] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const shotIndex = project.shots.findIndex((candidate) => candidate.id === shot.id);
  const scene = project.scenes.find((candidate) => candidate.id === shot.sceneId) ?? project.scenes[0];
  const sceneReferenceIds = scene?.referenceIds ?? [];
  const activeReferenceIds = Array.from(new Set([...sceneReferenceIds, ...shot.referenceIds]));
  const assignedReferences = activeReferenceIds
    .map((referenceId) => project.references.find((reference) => reference.id === referenceId))
    .filter((reference): reference is NonNullable<typeof reference> => Boolean(reference));
  const previousCandidate = shotIndex > 0 ? project.shots[shotIndex - 1] : null;
  const previousShot = previousCandidate?.sceneId === shot.sceneId ? previousCandidate : null;
  const previousTake = previousShot ? getSelectedTake(previousShot) : null;
  const currentTake = getSelectedTake(shot);
  const currentImage = currentTake ? images.find((image) => image.id === currentTake.imageId) : null;
  const renderTier = project.renderTier ?? 'draft';
  const referenceLimit = renderTier === 'draft' ? 4 : 10;
  const inputCount = assignedReferences.filter((reference) => images.some((image) => image.id === reference.imageId)).length
    + (shot.usePreviousPanel && previousTake ? 1 : 0)
    + (refineSelected && currentTake ? 1 : 0);

  const closeDialog = (nextOpen: boolean) => {
    if (!nextOpen) {
      setError(null);
      setGenerated(false);
      setRefineSelected(false);
    }
    onOpenChange(nextOpen);
  };

  const generate = async () => {
    if (!shot.prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    setGenerated(false);

    try {
      const inputs: Array<{ image: GalleryImage; promptReference: PromptReference; referenceId?: string }> = [];
      for (const referenceId of activeReferenceIds) {
        const reference = project.references.find((candidate) => candidate.id === referenceId);
        const image = reference ? images.find((candidate) => candidate.id === reference.imageId) : null;
        if (reference && image) inputs.push({ image, promptReference: { reference, label: reference.name }, referenceId });
      }

      if (shot.usePreviousPanel && previousTake && previousShot) {
        const image = images.find((candidate) => candidate.id === previousTake.imageId);
        if (image) inputs.push({
          image,
          promptReference: { reference: null, label: `PREVIOUS SELECTED SHOT — ${previousShot.title}. Preserve identities, wardrobe, world state, and screen direction without copying its composition.` },
        });
      }

      if (refineSelected && currentTake) {
        const image = images.find((candidate) => candidate.id === currentTake.imageId);
        if (image) inputs.push({
          image,
          promptReference: { reference: null, label: 'CURRENT SELECTED VERSION — refine this frame while preserving its successful composition and continuity.' },
        });
      }

      const uniqueInputs = inputs.filter((input, index, all) => (
        all.findIndex((candidate) => candidate.image.id === input.image.id) === index
      ));
      if (uniqueInputs.length > referenceLimit) {
        throw new Error(`${renderTier === 'draft' ? 'Draft' : 'Final'} generation supports ${referenceLimit} reference images. Remove or re-scope ${uniqueInputs.length - referenceLimit} before running.`);
      }

      const prompt = composeStoryboardPrompt(
        project,
        shot,
        shotIndex,
        uniqueInputs.map((input) => input.promptReference),
      );
      const referenceImages = await Promise.all(
        uniqueInputs.map((input) => createAIImagePreview(input.image.dataUrl)),
      );
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: 'storyboard',
          prompt,
          imageSize: project.aspect,
          numImages: 1,
          referenceImages,
          renderTier,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The frame could not be generated.');

      for (const [index, output] of (result.images as Array<{ url: string }>).entries()) {
        const safeTitle = shot.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `shot-${shotIndex + 1}`;
        const image = await addImageFromUrl(output.url, `${String(shotIndex + 1).padStart(2, '0')}-${safeTitle}-v${shot.takes.length + index + 1}.jpg`);
        addTake(project.id, shot.id, {
          imageId: image.id,
          prompt,
          referenceIds: uniqueInputs.flatMap((input) => input.referenceId ? [input.referenceId] : []),
          model: result.model || 'fal-ai/bytedance/seedream/v4.5',
          seed: typeof result.seed === 'number' ? result.seed : null,
        });
      }
      setGenerated(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The frame could not be generated.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-5" style={{ borderColor: 'var(--editor-border)' }}>
          <DialogTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> {shot.takes.length ? 'Generate alternative' : 'Generate panel'}</DialogTitle>
          <DialogDescription>Review the target and the exact continuity inputs before starting a paid generation.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[68vh] overflow-y-auto">
          <section className="border-b px-6 py-5" style={{ borderColor: 'var(--editor-border)' }}>
            <div className="mb-3 flex items-center justify-between">
              <div><p className="text-xs font-semibold">Target</p><p className="mt-0.5 text-[10px]" style={{ color: 'var(--editor-text-muted)' }}>1 shot · 1 new version</p></div>
              <span className="font-mono text-[10px]" style={{ color: 'var(--editor-text-muted)' }}>SHOT {String(shotIndex + 1).padStart(2, '0')}</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl border p-2.5" style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-secondary)' }}>
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-900">
                {currentImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentImage.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : <div className="flex h-full items-center justify-center text-[8px] uppercase tracking-wide text-white/40">New panel</div>}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{shot.title}</p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-4" style={{ color: 'var(--editor-text-tertiary)' }}>{shot.beat || shot.prompt}</p>
              </div>
            </div>
            {!shot.prompt.trim() && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[10px] text-amber-800">Add a shot description before generating. The action/beat alone is not treated as a complete image direction.</p>}
          </section>

          <section className="border-b px-6 py-5" style={{ borderColor: 'var(--editor-border)' }}>
            <div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold">Reference assignments</p><span className="text-[10px]" style={{ color: inputCount > referenceLimit ? 'var(--editor-error)' : 'var(--editor-text-muted)' }}>{inputCount} of {referenceLimit} inputs</span></div>
            {assignedReferences.length > 0 ? (
              <div className="space-y-2">
                {assignedReferences.map((reference) => {
                  const image = images.find((candidate) => candidate.id === reference.imageId);
                  const inherited = sceneReferenceIds.includes(reference.id);
                  const role = reference.kind === 'character' ? 'Subject identity' : reference.kind === 'location' ? 'Environment' : reference.kind === 'object' ? 'Prop' : reference.kind === 'style' ? 'Look' : 'Research';
                  return (
                    <div key={reference.id} className="flex items-center gap-3 rounded-lg border p-2.5" style={{ borderColor: 'var(--editor-border)' }}>
                      <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                        {image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{reference.name}</p><p className="mt-0.5 text-[9px]" style={{ color: 'var(--editor-text-muted)' }}>{role} · {inherited ? 'Scene default' : 'This shot'}</p></div>
                      <CircleCheck className="h-4 w-4 text-neutral-500" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed px-3 py-4 text-[10px] leading-4" style={{ borderColor: 'var(--editor-border)', color: 'var(--editor-text-muted)' }}>No project references are assigned. The model will use only the written shot and project direction.</p>
            )}

            {(shot.usePreviousPanel && previousTake && previousShot) && (
              <div className="mt-2 flex items-center gap-3 rounded-lg border p-2.5" style={{ borderColor: 'var(--editor-border)' }}>
                <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-neutral-100"><ArrowLeft className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">Previous selected panel</p><p className="mt-0.5 text-[9px]" style={{ color: 'var(--editor-text-muted)' }}>{previousShot.title} · continuous action</p></div>
                <CircleCheck className="h-4 w-4 text-neutral-500" />
              </div>
            )}

            {currentTake && (
              <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg bg-neutral-100 p-3">
                <input type="checkbox" checked={refineSelected} onChange={(event) => setRefineSelected(event.target.checked)} className="mt-0.5" />
                <span><span className="block text-[10px] font-semibold">Refine the selected version</span><span className="mt-0.5 block text-[9px] leading-4" style={{ color: 'var(--editor-text-muted)' }}>Include the current composition as an additional input. Leave this off for a genuinely different alternative.</span></span>
              </label>
            )}
            <p className="mt-3 text-[10px] leading-4" style={{ color: 'var(--editor-text-muted)' }}>Only references assigned to this scene or shot are sent. Other project references are excluded.</p>
          </section>

          <section className="px-6 py-5">
            <p className="mb-3 text-xs font-semibold">Provider and quality</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3" style={{ borderColor: 'var(--editor-border)' }}><p className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--editor-text-muted)' }}>Provider</p><p className="mt-1 text-xs font-medium">fal.ai</p></div>
              {([
                { value: 'draft' as const, label: 'Draft', note: 'FLUX.2 Flash' },
                { value: 'final' as const, label: 'Final', note: 'Seedream 4.5' },
              ]).map((tier) => (
                <button
                  key={tier.value}
                  type="button"
                  onClick={() => updateProject(project.id, { renderTier: tier.value })}
                  className="rounded-lg border p-3 text-left"
                  style={{ borderColor: renderTier === tier.value ? 'var(--editor-text-primary)' : 'var(--editor-border)', backgroundColor: renderTier === tier.value ? 'var(--editor-bg-secondary)' : 'transparent' }}
                >
                  <p className="text-xs font-semibold">{tier.label}</p><p className="mt-1 text-[9px]" style={{ color: 'var(--editor-text-muted)' }}>{tier.note}</p>
                </button>
              ))}
            </div>
          </section>

          {error && <p className="mx-6 mb-5 rounded-lg bg-red-50 px-3 py-2.5 text-[10px] leading-4 text-red-700" role="alert">{error}</p>}
          {generated && <p className="mx-6 mb-5 rounded-lg bg-neutral-100 px-3 py-2.5 text-[10px] leading-4">New version added. Select it from Shot details after closing this dialog.</p>}
        </div>

        <DialogFooter className="items-center border-t px-6 py-4 sm:justify-between" style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-secondary)' }}>
          <p className="text-[9px]" style={{ color: 'var(--editor-text-muted)' }}>{renderTier === 'draft' ? 'FLUX.2 Flash · $0.005 per input/output MP' : 'Seedream 4.5 · $0.04 per image'} · 1 output</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => closeDialog(false)} className="rounded-full border px-4 py-2 text-xs font-medium" style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-primary)' }}>{generated ? 'Done' : 'Cancel'}</button>
            <button type="button" onClick={generate} disabled={!shot.prompt.trim() || isGenerating || generated || inputCount > referenceLimit} className="flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-xs font-medium text-white disabled:opacity-40">
              {isGenerating ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Sparkles className="h-3.5 w-3.5" />}
              {isGenerating ? 'Generating…' : generated ? 'Version added' : `Generate ${renderTier}`}
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StoryboardWorkspaceToolbar({
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
      className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3 md:px-4"
      style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-primary)' }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-xs font-semibold text-white">L</span>
        <div className="mr-1 hidden 2xl:block">
          <p className="text-xs font-semibold tracking-[0.2em]">LUMEN</p>
          <p className="text-[9px]" style={{ color: 'var(--editor-text-muted)' }}>Director workspace</p>
        </div>
        <div className="relative">
          <select
            value={project.id}
            onChange={(event) => onProjectChange(event.target.value)}
            className="max-w-36 appearance-none truncate rounded-full border bg-transparent py-1.5 pl-3 pr-8 text-xs font-semibold outline-none sm:max-w-48 lg:max-w-60"
            style={{ borderColor: 'var(--editor-border)' }}
            aria-label="Active storyboard"
          >
            {projects.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2" />
        </div>
        <button
          onClick={onNewProject}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
          style={{ borderColor: 'var(--editor-border)' }}
          aria-label="New storyboard"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1">
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

export function StoryboardWorkspace({
  onOpenImage,
  onOpenReferences,
}: {
  onOpenImage: (imageId: string) => void;
  onOpenReferences: () => void;
}) {
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [projectSettingsOpen, setProjectSettingsOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [generationOpen, setGenerationOpen] = useState(false);
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
        onGenerate={() => setGenerationOpen(true)}
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
            <ShotInspector key={shot.id} project={project} shot={shot} onOpenImage={onOpenImage} onClose={() => setInspectorOpen(false)} onGenerate={() => setGenerationOpen(true)} />
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
          {shot && <ShotInspector key={shot.id} project={project} shot={shot} onOpenImage={onOpenImage} onClose={() => setMobileInspectorOpen(false)} onGenerate={() => { setMobileInspectorOpen(false); setGenerationOpen(true); }} />}
        </SheetContent>
      </Sheet>

      {shot && (
        <StoryboardGenerationDialog
          key={shot.id}
          open={generationOpen}
          onOpenChange={setGenerationOpen}
          project={project}
          shot={shot}
        />
      )}

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
