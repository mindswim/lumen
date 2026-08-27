import { getSelectedTake } from './domain.ts';
import type { StoryboardPanelRole, StoryboardProject, StoryboardShot, StoryboardTake } from './types.ts';

export function resolveShotReferenceIds(project: StoryboardProject, shot: StoryboardShot): string[] {
  const scene = project.scenes.find((candidate) => candidate.id === shot.sceneId);
  return Array.from(new Set([...(scene?.referenceIds ?? []), ...shot.referenceIds]));
}

export function resolvePriorStoryboardTake(
  project: StoryboardProject,
  shot: StoryboardShot,
  panelRole: StoryboardPanelRole,
): { take: StoryboardTake; label: string } | null {
  const shotIndex = project.shots.findIndex((candidate) => candidate.id === shot.id);
  if (panelRole !== 'start') {
    const priorRole: StoryboardPanelRole = panelRole === 'end' && getSelectedTake(shot, 'middle') ? 'middle' : 'start';
    const take = getSelectedTake(shot, priorRole);
    return take ? {
      take,
      label: `${priorRole.toUpperCase()} PANEL IN THIS SHOT — preserve subjects and world state while advancing the action into the ${panelRole} composition.`,
    } : null;
  }

  const previousShot = shotIndex > 0 ? project.shots[shotIndex - 1] : null;
  const previousTake = previousShot?.sceneId === shot.sceneId && shot.usePreviousPanel
    ? getSelectedTake(previousShot)
    : null;
  return previousShot && previousTake ? {
    take: previousTake,
    label: `PREVIOUS SELECTED SHOT — ${previousShot.title}. Preserve identities, wardrobe, world state, and screen direction without copying its composition.`,
  } : null;
}

export function compilePanelPrompt(basePrompt: string, shot: StoryboardShot, panelRole: StoryboardPanelRole): string {
  if (panelRole === 'start') return basePrompt;
  const panelDirection = shot.panelDirections[panelRole]?.trim();
  return `${basePrompt}\n\nPANEL WITHIN SHOT: ${panelRole.toUpperCase()}. This is an additional composition inside the same continuous shot. Advance the action and camera path from the earlier panel without treating it as a new cut.${panelDirection ? `\nPANEL-SPECIFIC DIRECTION: ${panelDirection}` : ''}`;
}
