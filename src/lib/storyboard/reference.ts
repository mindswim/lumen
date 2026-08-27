import type {
  LegacyReferenceKind,
  ReferenceRole,
  ReferenceSourceType,
  StoryReference,
} from '@/lib/storyboard/types';

export const REFERENCE_ROLE_LABELS: Record<ReferenceRole, string> = {
  character: 'Character',
  wardrobe: 'Wardrobe',
  location: 'Location / set',
  prop: 'Prop',
  look: 'Look',
  composition: 'Composition',
};

export const REFERENCE_SOURCE_LABELS: Record<ReferenceSourceType, string> = {
  generated: 'Generated',
  imported: 'Imported',
  research: 'Research',
};

export function legacyReferenceKindToRoles(kind: LegacyReferenceKind): ReferenceRole[] {
  if (kind === 'character') return ['character'];
  if (kind === 'location') return ['location'];
  if (kind === 'object') return ['prop'];
  if (kind === 'style') return ['look'];
  return [];
}

export function inferReferenceRoles(value: string): ReferenceRole[] {
  const normalized = value.toLowerCase();
  const roles: ReferenceRole[] = [];

  if (/(character|portrait|face|person|people|man|woman|boy|girl|hero|subject|identity)/.test(normalized)) roles.push('character');
  if (/(wardrobe|costume|clothing|clothes|outfit|uniform|coat|dress|jacket|shirt|trouser|pants|hat|shoe|boot)/.test(normalized)) roles.push('wardrobe');
  if (/(place|room|house|street|location|city|hall|park|landscape|environment|exterior|interior|set|architecture)/.test(normalized)) roles.push('location');
  if (/(prop|object|car|vehicle|weapon|badge|club|bag|satchel|tool|furniture)/.test(normalized)) roles.push('prop');
  if (/(style|look|mood|palette|film|lighting|texture|cinematography|color|grade|rendering)/.test(normalized)) roles.push('look');
  if (/(composition|framing|blocking|camera|angle|shot|perspective|staging)/.test(normalized)) roles.push('composition');

  return roles;
}

export function inferReferenceSourceType(value: string): ReferenceSourceType {
  return /(archive|engraving|historical|research|source|museum|collection|library)/i.test(value)
    ? 'research'
    : 'imported';
}

export type ReferenceFilter = 'all' | ReferenceRole | 'research' | 'unclassified';

type ReferenceClassification = Pick<StoryReference, 'roles' | 'sourceType'>;

/** No roles and not research evidence: someone still has to decide what this image may contribute. */
export function isUnclassifiedReference(reference: ReferenceClassification): boolean {
  return reference.roles.length === 0 && reference.sourceType !== 'research';
}

export function referenceMatchesFilter(reference: ReferenceClassification | undefined, filter: ReferenceFilter): boolean {
  if (filter === 'all') return true;
  if (!reference) return false;
  if (filter === 'research') return reference.sourceType === 'research';
  if (filter === 'unclassified') return isUnclassifiedReference(reference);
  return reference.roles.includes(filter);
}

export function referenceRoleSummary(reference: ReferenceClassification): string {
  if (reference.roles.length > 0) {
    const [firstRole, ...remainingRoles] = reference.roles;
    return `${REFERENCE_ROLE_LABELS[firstRole]}${remainingRoles.length > 0 ? ` +${remainingRoles.length}` : ''}`;
  }
  return isUnclassifiedReference(reference) ? 'Unclassified' : 'Research';
}

export function referenceDisplayName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
