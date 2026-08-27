import type {
  LegacyReferenceKind,
  PersistedStoryboardState,
  ReferenceRole,
  ReferenceSourceType,
  StoryboardPanelRole,
  StoryboardProject,
  StoryReference,
  StoryboardShot,
  StoryboardTake,
} from './types.ts';

const REFERENCE_ROLES = new Set<ReferenceRole>(['character', 'wardrobe', 'location', 'prop', 'look', 'composition']);
const REFERENCE_SOURCE_TYPES = new Set<ReferenceSourceType>(['generated', 'imported', 'research']);

type LegacyStoryReference = Partial<StoryReference> & Pick<StoryReference, 'id' | 'imageId' | 'name'> & {
  kind?: LegacyReferenceKind;
};

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean)));
}

function legacyReferenceRoles(kind: LegacyReferenceKind | undefined): ReferenceRole[] {
  if (kind === 'character') return ['character'];
  if (kind === 'location') return ['location'];
  if (kind === 'object') return ['prop'];
  if (kind === 'style') return ['look'];
  return [];
}

function migrateReference(reference: LegacyStoryReference): StoryReference {
  const suppliedRoles = uniqueStrings(reference.roles).filter((role): role is ReferenceRole => REFERENCE_ROLES.has(role as ReferenceRole));
  const sourceType = reference.sourceType && REFERENCE_SOURCE_TYPES.has(reference.sourceType)
    ? reference.sourceType
    : reference.kind === 'research'
      ? 'research'
      : /ai[- ]generated/i.test(reference.rightsNote ?? '')
        ? 'generated'
        : 'imported';

  return {
    id: reference.id,
    imageId: reference.imageId,
    name: reference.name,
    roles: suppliedRoles.length > 0 ? suppliedRoles : legacyReferenceRoles(reference.kind),
    tags: uniqueStrings(reference.tags),
    sourceType,
    description: reference.description ?? '',
    ...(reference.sourceUrl ? { sourceUrl: reference.sourceUrl } : {}),
    ...(reference.sourceTitle ? { sourceTitle: reference.sourceTitle } : {}),
    ...(reference.rightsNote ? { rightsNote: reference.rightsNote } : {}),
    createdAt: reference.createdAt ?? Date.now(),
  };
}

export function getSelectedTake(shot: StoryboardShot | undefined, panelRole: StoryboardPanelRole = 'start'): StoryboardTake | null {
  const selectedTakeId = panelRole === 'start'
    ? shot?.selectedTakeIds?.start ?? shot?.selectedTakeId
    : shot?.selectedTakeIds?.[panelRole];
  if (!shot || !selectedTakeId) return null;
  return shot.takes.find((take) => take.id === selectedTakeId && (take.panelRole ?? 'start') === panelRole) ?? null;
}

export function removeStoryboardReference(
  project: StoryboardProject,
  referenceId: string,
  updatedAt = Date.now(),
): StoryboardProject {
  const hasReference = project.references.some((reference) => reference.id === referenceId);
  const hasSceneAssignment = project.scenes.some((scene) => scene.referenceIds.includes(referenceId));
  const hasShotAssignment = project.shots.some((shot) => shot.referenceIds.includes(referenceId));
  if (!hasReference && !hasSceneAssignment && !hasShotAssignment) return project;

  return {
    ...project,
    references: project.references.filter((reference) => reference.id !== referenceId),
    scenes: project.scenes.map((scene) => scene.referenceIds.includes(referenceId)
      ? { ...scene, referenceIds: scene.referenceIds.filter((value) => value !== referenceId) }
      : scene),
    shots: project.shots.map((shot) => shot.referenceIds.includes(referenceId)
      ? { ...shot, referenceIds: shot.referenceIds.filter((value) => value !== referenceId) }
      : shot),
    updatedAt,
  };
}

export function selectStoryboardTake(
  project: StoryboardProject,
  shotId: string,
  takeId: string,
  updatedAt = Date.now(),
): StoryboardProject {
  const shot = project.shots.find((candidate) => candidate.id === shotId);
  const take = shot?.takes.find((candidate) => candidate.id === takeId);
  if (!shot || !take) return project;

  const panelRole = take.panelRole ?? 'start';
  return {
    ...project,
    shots: project.shots.map((candidate) => candidate.id === shotId ? {
      ...candidate,
      selectedTakeId: panelRole === 'start' ? takeId : candidate.selectedTakeId,
      selectedTakeIds: { ...candidate.selectedTakeIds, [panelRole]: takeId },
      updatedAt,
    } : candidate),
    updatedAt,
  };
}

export function migrateProject(project: Partial<StoryboardProject> & Pick<StoryboardProject, 'id' | 'title'>): StoryboardProject {
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
    references: ((project.references ?? []) as LegacyStoryReference[]).map(migrateReference),
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
    shots: (project.shots ?? []).map((shot, index) => {
      const panelRoles = Array.from(new Set<StoryboardPanelRole>([
        'start',
        ...((shot.panelRoles ?? []) as StoryboardPanelRole[]).filter((role) => role === 'start' || role === 'middle' || role === 'end'),
      ]));
      const takes = (shot.takes ?? []).map((take) => ({ ...take, panelRole: take.panelRole ?? 'start' }));
      const selectedTakeIds = {
        ...(shot.selectedTakeIds ?? {}),
        ...(shot.selectedTakeId ? { start: shot.selectedTakeIds?.start ?? shot.selectedTakeId } : {}),
      };
      return {
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
        panelRoles,
        panelDirections: shot.panelDirections ?? {},
        takes,
        selectedTakeId: selectedTakeIds.start ?? null,
        selectedTakeIds,
        createdAt: shot.createdAt ?? now,
        updatedAt: shot.updatedAt ?? now,
      };
    }),
    createdAt: project.createdAt ?? now,
    updatedAt: project.updatedAt ?? now,
  };
}

export function normalizePersistedState(value: Partial<PersistedStoryboardState> | null | undefined): PersistedStoryboardState {
  const projects = (value?.projects ?? []).map((project) => migrateProject(project));
  const activeProjectId = projects.some((project) => project.id === value?.activeProjectId)
    ? value?.activeProjectId ?? null
    : projects[0]?.id ?? null;
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const selectedShotId = activeProject?.shots.some((shot) => shot.id === value?.selectedShotId)
    ? value?.selectedShotId ?? null
    : activeProject?.shots[0]?.id ?? null;

  return { version: 5, projects, activeProjectId, selectedShotId };
}
