import type { GalleryImage } from '@/lib/gallery/store';
import {
  getSelectedTake,
  type CameraAngle,
  type CameraMovement,
  type ReferenceRole,
  type ReferenceSourceType,
  type ShotSize,
  type StoryboardAspect,
  type StoryboardPanelRole,
  type StoryboardShot,
} from '@/lib/storyboard/store';

export const FIELD = 'w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none transition focus:border-neutral-500';
export const LABEL = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em]';

export const ASPECTS: Array<{ value: StoryboardAspect; label: string }> = [
  { value: 'landscape_16_9', label: '16:9' },
  { value: 'landscape_4_3', label: '4:3' },
  { value: 'portrait_16_9', label: '9:16' },
];

export const REFERENCE_ROLES: Array<{ value: ReferenceRole; label: string }> = [
  { value: 'character', label: 'Character' },
  { value: 'wardrobe', label: 'Wardrobe' },
  { value: 'location', label: 'Location' },
  { value: 'prop', label: 'Prop' },
  { value: 'look', label: 'Look' },
  { value: 'composition', label: 'Composition' },
];

export const REFERENCE_SOURCE_TYPES: Array<{ value: ReferenceSourceType; label: string }> = [
  { value: 'imported', label: 'Imported' },
  { value: 'generated', label: 'Generated' },
  { value: 'research', label: 'Research' },
];

export const SHOT_SIZES: Array<{ value: ShotSize; label: string }> = [
  { value: 'unspecified', label: 'Shot size' },
  { value: 'extreme-wide', label: 'Extreme wide' },
  { value: 'wide', label: 'Wide' },
  { value: 'medium-wide', label: 'Medium wide' },
  { value: 'medium', label: 'Medium' },
  { value: 'medium-close-up', label: 'Medium close-up' },
  { value: 'close-up', label: 'Close-up' },
  { value: 'extreme-close-up', label: 'Extreme close-up' },
];

export const CAMERA_ANGLES: Array<{ value: CameraAngle; label: string }> = [
  { value: 'unspecified', label: 'Camera angle' },
  { value: 'eye-level', label: 'Eye level' },
  { value: 'high-angle', label: 'High angle' },
  { value: 'low-angle', label: 'Low angle' },
  { value: 'overhead', label: 'Overhead' },
  { value: 'dutch-angle', label: 'Dutch angle' },
];

export const CAMERA_MOVEMENTS: Array<{ value: CameraMovement; label: string }> = [
  { value: 'static', label: 'Static' },
  { value: 'pan', label: 'Pan' },
  { value: 'tilt', label: 'Tilt' },
  { value: 'dolly', label: 'Dolly' },
  { value: 'tracking', label: 'Tracking' },
  { value: 'handheld', label: 'Handheld' },
  { value: 'crane', label: 'Crane' },
  { value: 'zoom', label: 'Zoom' },
];

export type StoryboardWorkspaceView = 'board' | 'shot-list' | 'timing';

export function aspectClass(aspect: StoryboardAspect): string {
  if (aspect === 'portrait_16_9') return 'aspect-[9/16]';
  if (aspect === 'landscape_4_3') return 'aspect-[4/3]';
  return 'aspect-video';
}

export function imageForTake(shot: StoryboardShot, images: GalleryImage[], panelRole: StoryboardPanelRole = 'start'): GalleryImage | null {
  const selected = getSelectedTake(shot, panelRole);
  return selected ? images.find((image) => image.id === selected.imageId) ?? null : null;
}
