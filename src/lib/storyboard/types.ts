export type StoryboardAspect = 'landscape_16_9' | 'landscape_4_3' | 'portrait_16_9';
export type LegacyReferenceKind = 'character' | 'location' | 'object' | 'style' | 'research';
export type ReferenceRole = 'character' | 'wardrobe' | 'location' | 'prop' | 'look' | 'composition';
export type ReferenceSourceType = 'generated' | 'imported' | 'research';
export type StoryboardRenderTier = 'draft' | 'final';
export type StoryboardPanelRole = 'start' | 'middle' | 'end';
export type ShotSize = 'unspecified' | 'extreme-wide' | 'wide' | 'medium-wide' | 'medium' | 'medium-close-up' | 'close-up' | 'extreme-close-up';
export type CameraAngle = 'unspecified' | 'eye-level' | 'high-angle' | 'low-angle' | 'overhead' | 'dutch-angle';
export type CameraMovement = 'static' | 'pan' | 'tilt' | 'dolly' | 'tracking' | 'handheld' | 'crane' | 'zoom';
export type StoryboardStorageStatus = 'loading' | 'saving' | 'saved' | 'error';

export interface StoryReference {
  id: string;
  imageId: string;
  name: string;
  /** What visual information this image is allowed to contribute to a generation. */
  roles: ReferenceRole[];
  /** Flexible project vocabulary for people, places, periods, scenes, or any other grouping. */
  tags: string[];
  /** Where the asset came from. This is intentionally separate from its generation role. */
  sourceType: ReferenceSourceType;
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
  panelRole: StoryboardPanelRole;
  sourceTakeId?: string;
  sourceImageId?: string;
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
  panelRoles: StoryboardPanelRole[];
  panelDirections: Partial<Record<StoryboardPanelRole, string>>;
  takes: StoryboardTake[];
  selectedTakeId: string | null;
  selectedTakeIds: Partial<Record<StoryboardPanelRole, string>>;
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

export interface PersistedStoryboardState {
  version: 5;
  projects: StoryboardProject[];
  activeProjectId: string | null;
  selectedShotId: string | null;
}
