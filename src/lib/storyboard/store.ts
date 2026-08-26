import { create } from 'zustand';
import {
  getStoryboardState,
} from '@/lib/storage/indexed-db';
import {
  getSharedStoryboardState,
  saveSharedStoryboardState,
} from '@/lib/storage/shared-workspace';

export type StoryboardAspect = 'landscape_16_9' | 'landscape_4_3' | 'portrait_16_9';
export type ReferenceKind = 'character' | 'location' | 'object' | 'style' | 'research';
export type StoryboardRenderTier = 'draft' | 'final';
export type ShotSize = 'unspecified' | 'extreme-wide' | 'wide' | 'medium-wide' | 'medium' | 'medium-close-up' | 'close-up' | 'extreme-close-up';
export type CameraAngle = 'unspecified' | 'eye-level' | 'high-angle' | 'low-angle' | 'overhead' | 'dutch-angle';
export type CameraMovement = 'static' | 'pan' | 'tilt' | 'dolly' | 'tracking' | 'handheld' | 'crane' | 'zoom';
export type StoryboardStorageStatus = 'loading' | 'saving' | 'saved' | 'error';

export interface StoryReference {
  id: string;
  imageId: string;
  name: string;
  kind: ReferenceKind;
  description: string;
  sourceUrl?: string;
  sourceTitle?: string;
  rightsNote?: string;
  createdAt: number;
}

export interface StoryboardScene {
  id: string;
  title: string;
  summary: string;
  location: string;
  timeOfDay: string;
  referenceIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface StoryboardTake {
  id: string;
  imageId: string;
  prompt: string;
  referenceIds: string[];
  model: string;
  seed: number | null;
  createdAt: number;
}

export interface StoryboardShot {
  id: string;
  sceneId: string;
  title: string;
  beat: string;
  prompt: string;
  continuityNotes: string;
  dialogue: string;
  durationSeconds: number;
  shotSize: ShotSize;
  cameraAngle: CameraAngle;
  cameraMovement: CameraMovement;
  usePreviousPanel: boolean;
  referenceIds: string[];
  takes: StoryboardTake[];
  selectedTakeId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface StoryboardProject {
  id: string;
  title: string;
  logline: string;
  visualDirection: string;
  aspect: StoryboardAspect;
  renderTier: StoryboardRenderTier;
  references: StoryReference[];
  scenes: StoryboardScene[];
  shots: StoryboardShot[];
  createdAt: number;
  updatedAt: number;
}

interface CreateProjectInput {
  title: string;
  logline: string;
  visualDirection: string;
  aspect: StoryboardAspect;
}

interface StoryboardStore {
  projects: StoryboardProject[];
  activeProjectId: string | null;
  selectedShotId: string | null;
  isHydrated: boolean;
  storageStatus: StoryboardStorageStatus;
  storagePersisted: boolean | null;
  lastSavedAt: number | null;

  hydrate: () => Promise<void>;
  createProject: (input: CreateProjectInput) => string;
  updateProject: (id: string, changes: Partial<Pick<StoryboardProject, 'title' | 'logline' | 'visualDirection' | 'aspect' | 'renderTier'>>) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string) => void;
  addReference: (projectId: string, reference: Omit<StoryReference, 'id' | 'createdAt'>) => string;
  updateReference: (projectId: string, referenceId: string, changes: Partial<Pick<StoryReference, 'name' | 'kind' | 'description' | 'sourceUrl' | 'sourceTitle' | 'rightsNote'>>) => void;
  removeReference: (projectId: string, referenceId: string) => void;
  addScene: (projectId: string) => string;
  updateScene: (projectId: string, sceneId: string, changes: Partial<Pick<StoryboardScene, 'title' | 'summary' | 'location' | 'timeOfDay' | 'referenceIds'>>) => void;
  addShot: (projectId: string, afterShotId?: string, sceneId?: string) => string;
  updateShot: (projectId: string, shotId: string, changes: Partial<Pick<StoryboardShot, 'sceneId' | 'title' | 'beat' | 'prompt' | 'continuityNotes' | 'dialogue' | 'durationSeconds' | 'shotSize' | 'cameraAngle' | 'cameraMovement' | 'usePreviousPanel' | 'referenceIds'>>) => void;
  removeShot: (projectId: string, shotId: string) => void;
  moveShot: (projectId: string, shotId: string, direction: -1 | 1) => void;
  selectShot: (shotId: string | null) => void;
  addTake: (projectId: string, shotId: string, take: Omit<StoryboardTake, 'id' | 'createdAt'>) => string;
  selectTake: (projectId: string, shotId: string, takeId: string) => void;
}

interface PersistedStoryboardState {
  version: 3;
  projects: StoryboardProject[];
  activeProjectId: string | null;
  selectedShotId: string | null;
}

const LEGACY_STORAGE_KEY = 'lumen-storyboards-v1';

function id(prefix: string): string {
  const value = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${value}`;
}

function createScene(number: number): StoryboardScene {
  const now = Date.now();
  return {
    id: id('scene'),
    title: `Scene ${number}`,
    summary: '',
    location: '',
    timeOfDay: '',
    referenceIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

function createShot(number: number, sceneId: string): StoryboardShot {
  const now = Date.now();
  return {
    id: id('shot'),
    sceneId,
    title: `Shot ${number}`,
    beat: '',
    prompt: '',
    continuityNotes: '',
    dialogue: '',
    durationSeconds: 3,
    shotSize: 'unspecified',
    cameraAngle: 'unspecified',
    cameraMovement: 'static',
    usePreviousPanel: false,
    referenceIds: [],
    takes: [],
    selectedTakeId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function getSelectedTake(shot: StoryboardShot | undefined): StoryboardTake | null {
  if (!shot?.selectedTakeId) return null;
  return shot.takes.find((take) => take.id === shot.selectedTakeId) ?? null;
}

function migrateProject(project: Partial<StoryboardProject> & Pick<StoryboardProject, 'id' | 'title'>): StoryboardProject {
  const now = Date.now();
  const existingScenes = Array.isArray(project.scenes) && project.scenes.length > 0
    ? project.scenes
    : [{
        id: `scene-${project.id}-1`,
        title: 'Scene 1',
        summary: project.logline ?? '',
        location: '',
        timeOfDay: '',
        referenceIds: [],
        createdAt: project.createdAt ?? now,
        updatedAt: project.updatedAt ?? now,
      }];
  const defaultSceneId = existingScenes[0].id;

  return {
    id: project.id,
    title: project.title,
    logline: project.logline ?? '',
    visualDirection: project.visualDirection ?? '',
    aspect: project.aspect ?? 'landscape_16_9',
    renderTier: project.renderTier ?? 'draft',
    references: project.references ?? [],
    scenes: existingScenes.map((scene, index) => ({
      id: scene.id ?? `scene-${project.id}-${index + 1}`,
      title: scene.title || `Scene ${index + 1}`,
      summary: scene.summary ?? '',
      location: scene.location ?? '',
      timeOfDay: scene.timeOfDay ?? '',
      referenceIds: scene.referenceIds ?? [],
      createdAt: scene.createdAt ?? now,
      updatedAt: scene.updatedAt ?? now,
    })),
    shots: (project.shots ?? []).map((shot, index) => ({
      ...shot,
      sceneId: shot.sceneId || defaultSceneId,
      title: shot.title || `Shot ${index + 1}`,
      beat: shot.beat ?? '',
      prompt: shot.prompt ?? '',
      continuityNotes: shot.continuityNotes ?? '',
      dialogue: shot.dialogue ?? '',
      durationSeconds: shot.durationSeconds ?? 3,
      shotSize: shot.shotSize ?? 'unspecified',
      cameraAngle: shot.cameraAngle ?? 'unspecified',
      cameraMovement: shot.cameraMovement ?? 'static',
      usePreviousPanel: shot.usePreviousPanel ?? false,
      referenceIds: shot.referenceIds ?? [],
      takes: shot.takes ?? [],
      selectedTakeId: shot.selectedTakeId ?? null,
      createdAt: shot.createdAt ?? now,
      updatedAt: shot.updatedAt ?? now,
    })),
    createdAt: project.createdAt ?? now,
    updatedAt: project.updatedAt ?? now,
  };
}

function normalizePersistedState(value: Partial<PersistedStoryboardState> | null | undefined): PersistedStoryboardState {
  const projects = (value?.projects ?? []).map((project) => migrateProject(project));
  const activeProjectId = projects.some((project) => project.id === value?.activeProjectId)
    ? value?.activeProjectId ?? null
    : projects[0]?.id ?? null;
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const selectedShotId = activeProject?.shots.some((shot) => shot.id === value?.selectedShotId)
    ? value?.selectedShotId ?? null
    : activeProject?.shots[0]?.id ?? null;

  return { version: 3, projects, activeProjectId, selectedShotId };
}

function readLegacyState(): PersistedStoryboardState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: Partial<PersistedStoryboardState> } & Partial<PersistedStoryboardState>;
    return normalizePersistedState(parsed.state ?? parsed);
  } catch (error) {
    console.error('Failed to read legacy storyboard storage:', error);
    return null;
  }
}

function persistedSnapshot(state: Pick<StoryboardStore, 'projects' | 'activeProjectId' | 'selectedShotId'>): PersistedStoryboardState {
  return {
    version: 3,
    projects: state.projects,
    activeProjectId: state.activeProjectId,
    selectedShotId: state.selectedShotId,
  };
}

export const useStoryboardStore = create<StoryboardStore>()(
  (set, get) => ({
      projects: [],
      activeProjectId: null,
      selectedShotId: null,
      isHydrated: false,
      storageStatus: 'loading',
      storagePersisted: null,
      lastSavedAt: null,

      hydrate: async () => {
        if (get().isHydrated) return;

        try {
          let stored = await getSharedStoryboardState<PersistedStoryboardState>();
          if (!stored) {
            const browserStored = await getStoryboardState<PersistedStoryboardState>();
            const legacy = browserStored ? null : readLegacyState();
            stored = browserStored ?? legacy;
            if (stored) await saveSharedStoryboardState(stored);
          }

          if (stored && readLegacyState()) {
            window.localStorage.removeItem(LEGACY_STORAGE_KEY);
          }

          const normalized = normalizePersistedState(stored);
          lastQueuedSnapshot = JSON.stringify(normalized);

          set({
            projects: normalized.projects,
            activeProjectId: normalized.activeProjectId,
            selectedShotId: normalized.selectedShotId,
            isHydrated: true,
            storageStatus: 'saved',
            storagePersisted: true,
            lastSavedAt: stored ? Date.now() : null,
          });
        } catch (error) {
          console.error('Failed to hydrate storyboards:', error);
          set({ isHydrated: true, storageStatus: 'error' });
        }
      },

      createProject: (input) => {
        const projectId = id('story');
        const firstScene = createScene(1);
        const firstShot = createShot(1, firstScene.id);
        const now = Date.now();
        const project: StoryboardProject = {
          id: projectId,
          title: input.title.trim() || 'Untitled story',
          logline: input.logline.trim(),
          visualDirection: input.visualDirection.trim(),
          aspect: input.aspect,
          renderTier: 'draft',
          references: [],
          scenes: [firstScene],
          shots: [firstShot],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ projects: [project, ...state.projects], activeProjectId: projectId, selectedShotId: firstShot.id }));
        return projectId;
      },

      updateProject: (projectId, changes) => set((state) => ({
        projects: state.projects.map((project) => project.id === projectId ? { ...project, ...changes, updatedAt: Date.now() } : project),
      })),

      deleteProject: (projectId) => {
        const remaining = get().projects.filter((project) => project.id !== projectId);
        set({ projects: remaining, activeProjectId: remaining[0]?.id ?? null, selectedShotId: remaining[0]?.shots[0]?.id ?? null });
      },

      setActiveProject: (projectId) => {
        const project = get().projects.find((candidate) => candidate.id === projectId);
        if (project) set({ activeProjectId: projectId, selectedShotId: project.shots[0]?.id ?? null });
      },

      addReference: (projectId, reference) => {
        const referenceId = id('ref');
        set((state) => ({
          projects: state.projects.map((project) => project.id === projectId
            ? { ...project, references: [...project.references, { ...reference, id: referenceId, createdAt: Date.now() }], updatedAt: Date.now() }
            : project),
        }));
        return referenceId;
      },

      updateReference: (projectId, referenceId, changes) => set((state) => ({
        projects: state.projects.map((project) => project.id === projectId ? {
          ...project,
          references: project.references.map((reference) => reference.id === referenceId ? { ...reference, ...changes } : reference),
          updatedAt: Date.now(),
        } : project),
      })),

      removeReference: (projectId, referenceId) => set((state) => ({
        projects: state.projects.map((project) => project.id === projectId ? {
          ...project,
          references: project.references.filter((reference) => reference.id !== referenceId),
          scenes: project.scenes.map((scene) => ({ ...scene, referenceIds: scene.referenceIds.filter((value) => value !== referenceId) })),
          shots: project.shots.map((shot) => ({ ...shot, referenceIds: shot.referenceIds.filter((value) => value !== referenceId) })),
          updatedAt: Date.now(),
        } : project),
      })),

      addScene: (projectId) => {
        const project = get().projects.find((candidate) => candidate.id === projectId);
        const scene = createScene((project?.scenes.length ?? 0) + 1);
        const shot = createShot((project?.shots.length ?? 0) + 1, scene.id);
        set((state) => ({
          projects: state.projects.map((candidate) => candidate.id === projectId
            ? { ...candidate, scenes: [...candidate.scenes, scene], shots: [...candidate.shots, shot], updatedAt: Date.now() }
            : candidate),
          selectedShotId: shot.id,
        }));
        return scene.id;
      },

      updateScene: (projectId, sceneId, changes) => set((state) => ({
        projects: state.projects.map((project) => project.id === projectId ? {
          ...project,
          scenes: project.scenes.map((scene) => scene.id === sceneId ? { ...scene, ...changes, updatedAt: Date.now() } : scene),
          updatedAt: Date.now(),
        } : project),
      })),

      addShot: (projectId, afterShotId, requestedSceneId) => {
        const project = get().projects.find((candidate) => candidate.id === projectId);
        const afterShot = project?.shots.find((shot) => shot.id === afterShotId);
        const sceneId = requestedSceneId || afterShot?.sceneId || project?.scenes[0]?.id || '';
        const nextShot = createShot((project?.shots.length ?? 0) + 1, sceneId);
        set((state) => ({
          projects: state.projects.map((candidate) => {
            if (candidate.id !== projectId) return candidate;
            const shots = [...candidate.shots];
            const afterIndex = afterShotId ? shots.findIndex((shot) => shot.id === afterShotId) : -1;
            if (afterIndex >= 0) shots.splice(afterIndex + 1, 0, nextShot);
            else shots.push(nextShot);
            return { ...candidate, shots, updatedAt: Date.now() };
          }),
          selectedShotId: nextShot.id,
        }));
        return nextShot.id;
      },

      updateShot: (projectId, shotId, changes) => set((state) => ({
        projects: state.projects.map((project) => project.id === projectId ? {
          ...project,
          shots: project.shots.map((shot) => shot.id === shotId ? { ...shot, ...changes, updatedAt: Date.now() } : shot),
          updatedAt: Date.now(),
        } : project),
      })),

      removeShot: (projectId, shotId) => {
        const project = get().projects.find((candidate) => candidate.id === projectId);
        if (!project || project.shots.length <= 1) return;
        const index = project.shots.findIndex((shot) => shot.id === shotId);
        const fallback = project.shots[index + 1] ?? project.shots[index - 1];
        set((state) => ({
          projects: state.projects.map((candidate) => candidate.id === projectId
            ? { ...candidate, shots: candidate.shots.filter((shot) => shot.id !== shotId), updatedAt: Date.now() }
            : candidate),
          selectedShotId: state.selectedShotId === shotId ? fallback?.id ?? null : state.selectedShotId,
        }));
      },

      moveShot: (projectId, shotId, direction) => set((state) => ({
        projects: state.projects.map((project) => {
          if (project.id !== projectId) return project;
          const shots = [...project.shots];
          const from = shots.findIndex((shot) => shot.id === shotId);
          const to = from + direction;
          if (from < 0 || to < 0 || to >= shots.length || shots[to].sceneId !== shots[from].sceneId) return project;
          [shots[from], shots[to]] = [shots[to], shots[from]];
          return { ...project, shots, updatedAt: Date.now() };
        }),
      })),

      selectShot: (shotId) => set({ selectedShotId: shotId }),

      addTake: (projectId, shotId, take) => {
        const takeId = id('take');
        set((state) => ({
          projects: state.projects.map((project) => project.id === projectId ? {
            ...project,
            shots: project.shots.map((shot) => shot.id === shotId ? {
              ...shot,
              takes: [...shot.takes, { ...take, id: takeId, createdAt: Date.now() }],
              selectedTakeId: shot.selectedTakeId ?? takeId,
              updatedAt: Date.now(),
            } : shot),
            updatedAt: Date.now(),
          } : project),
        }));
        return takeId;
      },

      selectTake: (projectId, shotId, takeId) => set((state) => ({
        projects: state.projects.map((project) => project.id === projectId ? {
          ...project,
          shots: project.shots.map((shot) => shot.id === shotId ? { ...shot, selectedTakeId: takeId, updatedAt: Date.now() } : shot),
          updatedAt: Date.now(),
        } : project),
      })),
    }),
);

let lastQueuedSnapshot = '';
let saveQueue: Promise<void> = Promise.resolve();

useStoryboardStore.subscribe((state) => {
  if (!state.isHydrated) return;

  const snapshot = persistedSnapshot(state);
  const serialized = JSON.stringify(snapshot);
  if (serialized === lastQueuedSnapshot) return;
  lastQueuedSnapshot = serialized;
  useStoryboardStore.setState({ storageStatus: 'saving' });

  saveQueue = saveQueue
    .catch(() => undefined)
    .then(async () => {
      const savedAt = await saveSharedStoryboardState(snapshot);
      if (lastQueuedSnapshot === serialized) {
        useStoryboardStore.setState({ storageStatus: 'saved', lastSavedAt: savedAt });
      }
    })
    .catch((error) => {
      console.error('Failed to save storyboards:', error);
      if (lastQueuedSnapshot === serialized) {
        useStoryboardStore.setState({ storageStatus: 'error' });
      }
    });
});

export function getStoryboardImageIds(projects: StoryboardProject[]): Set<string> {
  const ids = new Set<string>();
  for (const project of projects) {
    for (const reference of project.references) ids.add(reference.imageId);
    for (const shot of project.shots) {
      for (const take of shot.takes) ids.add(take.imageId);
    }
  }
  return ids;
}
