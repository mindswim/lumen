import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getSelectedTake,
  normalizePersistedState,
  removeStoryboardReference,
  selectStoryboardTake,
} from '../src/lib/storyboard/domain.ts';
import { compilePanelPrompt, resolvePriorStoryboardTake, resolveShotReferenceIds } from '../src/lib/storyboard/generation-plan.ts';
import { composeStoryboardPrompt } from '../src/lib/storyboard/prompt.ts';
import { inferReferenceRoles, inferReferenceSourceType, referenceMatchesFilter, referenceRoleSummary } from '../src/lib/storyboard/reference.ts';
import type { StoryReference } from '../src/lib/storyboard/types.ts';

const legacyState = {
  version: 3,
  activeProjectId: 'project-1',
  selectedShotId: 'shot-1',
  projects: [{
    id: 'project-1',
    title: 'Legacy project',
    logline: 'Nothing should be lost.',
    visualDirection: 'Grainy winter daylight.',
    aspect: 'landscape_16_9',
    renderTier: 'draft',
    references: [{
      id: 'ref-1',
      imageId: 'image-ref-1',
      name: 'Courier',
      kind: 'character',
      description: 'Identity reference',
      createdAt: 10,
    }],
    scenes: [{
      id: 'scene-1',
      title: 'Station',
      summary: '',
      location: 'Lower platform',
      timeOfDay: 'Dawn',
      referenceIds: ['ref-1'],
      createdAt: 20,
      updatedAt: 20,
    }],
    shots: [{
      id: 'shot-1',
      sceneId: 'scene-1',
      title: 'Arrival',
      beat: 'The courier enters.',
      prompt: 'Wide shot of the courier entering the flooded station.',
      continuityNotes: '',
      dialogue: '',
      durationSeconds: 4,
      shotSize: 'wide',
      cameraAngle: 'eye-level',
      cameraMovement: 'tracking',
      usePreviousPanel: false,
      referenceIds: ['ref-1'],
      takes: [{
        id: 'take-1',
        imageId: 'image-1',
        prompt: 'Legacy prompt',
        referenceIds: ['ref-1'],
        model: 'legacy-model',
        seed: 42,
        createdAt: 30,
      }],
      selectedTakeId: 'take-1',
      createdAt: 25,
      updatedAt: 30,
    }],
    createdAt: 1,
    updatedAt: 30,
  }],
};

test('migrates legacy panels and references without changing identity or ordering', () => {
  const migrated = normalizePersistedState(legacyState as never);
  const project = migrated.projects[0];
  const shot = project.shots[0];

  assert.equal(migrated.version, 5);
  assert.equal(migrated.activeProjectId, 'project-1');
  assert.equal(migrated.selectedShotId, 'shot-1');
  assert.deepEqual(project.references.map((reference) => reference.id), ['ref-1']);
  assert.deepEqual(project.references[0].roles, ['character']);
  assert.deepEqual(project.references[0].tags, []);
  assert.equal(project.references[0].sourceType, 'imported');
  assert.deepEqual(project.scenes.map((scene) => scene.id), ['scene-1']);
  assert.deepEqual(project.shots.map((candidate) => candidate.id), ['shot-1']);
  assert.deepEqual(shot.panelRoles, ['start']);
  assert.deepEqual(shot.panelDirections, {});
  assert.equal(shot.takes[0].id, 'take-1');
  assert.equal(shot.takes[0].imageId, 'image-1');
  assert.equal(shot.takes[0].panelRole, 'start');
  assert.equal(shot.selectedTakeId, 'take-1');
  assert.equal(shot.selectedTakeIds.start, 'take-1');
  assert.equal(getSelectedTake(shot)?.id, 'take-1');
});

test('separates research provenance from semantic reference roles', () => {
  const withResearchReference = {
    ...legacyState,
    projects: [{
      ...legacyState.projects[0],
      references: [{
        id: 'ref-research',
        imageId: 'image-research',
        name: 'Mulberry Street archive plate',
        kind: 'research',
        description: 'Use the street materials and shopfront details.',
        sourceTitle: 'Municipal Archives',
        createdAt: 11,
      }],
    }],
  };
  const reference = normalizePersistedState(withResearchReference as never).projects[0].references[0];

  assert.deepEqual(reference.roles, []);
  assert.deepEqual(reference.tags, []);
  assert.equal(reference.sourceType, 'research');
  assert.equal(reference.sourceTitle, 'Municipal Archives');
});

test('preserves valid multi-role references and removes duplicate tags during normalization', () => {
  const withV5Reference = {
    ...legacyState,
    version: 5,
    projects: [{
      ...legacyState.projects[0],
      references: [{
        id: 'ref-v5',
        imageId: 'image-v5',
        name: 'Mara in travel coat',
        roles: ['character', 'wardrobe', 'character'],
        tags: ['Mara', ' 1857 ', 'Mara', ''],
        sourceType: 'generated',
        description: 'Preserve identity and the brown wool coat.',
        createdAt: 12,
      }],
    }],
  };
  const reference = normalizePersistedState(withV5Reference as never).projects[0].references[0];

  assert.deepEqual(reference.roles, ['character', 'wardrobe']);
  assert.deepEqual(reference.tags, ['Mara', '1857']);
  assert.equal(reference.sourceType, 'generated');
});

test('infers multiple useful roles without classifying an unknown image as a character', () => {
  assert.deepEqual(inferReferenceRoles('Mara portrait in a wool coat, low-angle framing'), ['character', 'wardrobe', 'composition']);
  assert.deepEqual(inferReferenceRoles('IMG_4821.png'), []);
  assert.equal(inferReferenceSourceType('Municipal archive engraving'), 'research');
  assert.equal(inferReferenceSourceType('camera-roll-photo.jpg'), 'imported');
});

test('filters the library by role, research provenance, or missing classification', () => {
  const wardrobeCharacter: Pick<StoryReference, 'roles' | 'sourceType'> = { roles: ['character', 'wardrobe'], sourceType: 'generated' };
  const archivePlate: Pick<StoryReference, 'roles' | 'sourceType'> = { roles: [], sourceType: 'research' };
  const promotedFrame: Pick<StoryReference, 'roles' | 'sourceType'> = { roles: [], sourceType: 'generated' };

  assert.equal(referenceMatchesFilter(wardrobeCharacter, 'all'), true);
  assert.equal(referenceMatchesFilter(wardrobeCharacter, 'wardrobe'), true);
  assert.equal(referenceMatchesFilter(wardrobeCharacter, 'look'), false);
  assert.equal(referenceMatchesFilter(wardrobeCharacter, 'unclassified'), false);
  assert.equal(referenceMatchesFilter(archivePlate, 'research'), true);
  assert.equal(referenceMatchesFilter(archivePlate, 'unclassified'), false);
  assert.equal(referenceMatchesFilter(promotedFrame, 'unclassified'), true);
  assert.equal(referenceMatchesFilter(promotedFrame, 'research'), false);
  assert.equal(referenceMatchesFilter(undefined, 'character'), false);
  assert.equal(referenceMatchesFilter(undefined, 'all'), true);
  assert.equal(referenceRoleSummary(wardrobeCharacter), 'Character +1');
  assert.equal(referenceRoleSummary(archivePlate), 'Research');
  assert.equal(referenceRoleSummary(promotedFrame), 'Unclassified');
});

test('compiles role ownership and research provenance into the generation prompt', () => {
  const project = normalizePersistedState(legacyState as never).projects[0];
  const reference = {
    ...project.references[0],
    roles: ['character', 'wardrobe'] as const,
    tags: ['Elias', '1857'],
    sourceType: 'research' as const,
    sourceTitle: 'Municipal Archives',
  };
  const prompt = composeStoryboardPrompt(project, project.shots[0], 0, [{ reference: reference as never, label: reference.name }]);

  assert.match(prompt, /CHARACTER IDENTITY/);
  assert.match(prompt, /WARDROBE/);
  assert.match(prompt, /Tags: Elias, 1857/);
  assert.match(prompt, /RESEARCH PROVENANCE \(Municipal Archives\)/);
  assert.match(prompt, /Use each reference only for its labeled roles/);
  assert.match(prompt, /Look and Composition references guide treatment and framing only/);
});

test('normalization is idempotent', () => {
  const once = normalizePersistedState(legacyState as never);
  const twice = normalizePersistedState(once);
  assert.deepEqual(twice, once);
});

test('falls back to the first valid project and shot when persisted selection is stale', () => {
  const migrated = normalizePersistedState({
    ...(legacyState as never),
    activeProjectId: 'missing-project',
    selectedShotId: 'missing-shot',
  });
  assert.equal(migrated.activeProjectId, 'project-1');
  assert.equal(migrated.selectedShotId, 'shot-1');
});

test('resolves selection independently for Start, Middle, and End panels', () => {
  const shot = {
    ...normalizePersistedState(legacyState as never).projects[0].shots[0],
    panelRoles: ['start', 'middle', 'end'] as const,
    takes: [
      { id: 'start-take', imageId: 'start-image', prompt: '', referenceIds: [], model: 'test', seed: null, panelRole: 'start' as const, createdAt: 1 },
      { id: 'middle-take', imageId: 'middle-image', prompt: '', referenceIds: [], model: 'test', seed: null, panelRole: 'middle' as const, createdAt: 2 },
      { id: 'end-take', imageId: 'end-image', prompt: '', referenceIds: [], model: 'test', seed: null, panelRole: 'end' as const, createdAt: 3 },
    ],
    selectedTakeId: 'start-take',
    selectedTakeIds: { start: 'start-take', middle: 'middle-take', end: 'end-take' },
  };

  assert.equal(getSelectedTake(shot, 'start')?.id, 'start-take');
  assert.equal(getSelectedTake(shot, 'middle')?.id, 'middle-take');
  assert.equal(getSelectedTake(shot, 'end')?.id, 'end-take');
});

test('does not resolve a selected take from the wrong panel role', () => {
  const shot = normalizePersistedState(legacyState as never).projects[0].shots[0];
  const invalid = { ...shot, selectedTakeIds: { middle: 'take-1' } };
  assert.equal(getSelectedTake(invalid, 'middle'), null);
});

test('selects a take only for its own panel and ignores stale take IDs', () => {
  const project = normalizePersistedState(legacyState as never).projects[0];
  const startTake = project.shots[0].takes[0];
  const middleTake = { ...startTake, id: 'middle-take', imageId: 'middle-image', panelRole: 'middle' as const };
  const shot = {
    ...project.shots[0],
    panelRoles: ['start', 'middle'] as const,
    takes: [startTake, middleTake],
    selectedTakeIds: { start: startTake.id },
  };
  const withMiddle = { ...project, shots: [shot] };

  const selected = selectStoryboardTake(withMiddle, shot.id, middleTake.id, 100);
  assert.equal(selected.shots[0].selectedTakeId, startTake.id);
  assert.deepEqual(selected.shots[0].selectedTakeIds, { start: startTake.id, middle: middleTake.id });
  assert.equal(selected.shots[0].updatedAt, 100);
  assert.equal(selected.updatedAt, 100);
  assert.equal(selectStoryboardTake(selected, shot.id, 'missing-take', 200), selected);
});

test('removing a reference also removes scene and shot assignments', () => {
  const project = normalizePersistedState(legacyState as never).projects[0];
  const withUnrelatedAssignments = {
    ...project,
    references: [
      ...project.references,
      { ...project.references[0], id: 'ref-2', imageId: 'image-ref-2', name: 'Station' },
    ],
    scenes: [{ ...project.scenes[0], referenceIds: ['ref-1', 'ref-2'] }],
    shots: [{ ...project.shots[0], referenceIds: ['ref-2', 'ref-1'] }],
  };

  const removed = removeStoryboardReference(withUnrelatedAssignments, 'ref-1', 100);
  assert.deepEqual(removed.references.map((reference) => reference.id), ['ref-2']);
  assert.deepEqual(removed.scenes[0].referenceIds, ['ref-2']);
  assert.deepEqual(removed.shots[0].referenceIds, ['ref-2']);
  assert.equal(removed.updatedAt, 100);
  assert.equal(removeStoryboardReference(removed, 'missing-reference', 200), removed);
});

test('resolves only scene and shot references and removes duplicate assignments', () => {
  const project = normalizePersistedState(legacyState as never).projects[0];
  const scene = { ...project.scenes[0], referenceIds: ['scene-ref', 'shared-ref'] };
  const shot = { ...project.shots[0], referenceIds: ['shared-ref', 'shot-ref'] };
  assert.deepEqual(resolveShotReferenceIds({ ...project, scenes: [scene], shots: [shot] }, shot), ['scene-ref', 'shared-ref', 'shot-ref']);
});

test('uses a previous shot only for opted-in continuous action in the same scene', () => {
  const project = normalizePersistedState(legacyState as never).projects[0];
  const previous = project.shots[0];
  const current = { ...previous, id: 'shot-2', title: 'Follow', usePreviousPanel: true };
  const withPrevious = { ...project, shots: [previous, current] };
  assert.equal(resolvePriorStoryboardTake(withPrevious, current, 'start')?.take.id, 'take-1');
  assert.equal(resolvePriorStoryboardTake(withPrevious, { ...current, usePreviousPanel: false }, 'start'), null);
  assert.equal(resolvePriorStoryboardTake(withPrevious, { ...current, sceneId: 'another-scene' }, 'start'), null);
});

test('uses earlier panels inside a shot without turning them into new cuts', () => {
  const project = normalizePersistedState(legacyState as never).projects[0];
  const startTake = project.shots[0].takes[0];
  const middleTake = { ...startTake, id: 'middle-take', imageId: 'middle-image', panelRole: 'middle' as const };
  const shot = {
    ...project.shots[0],
    panelRoles: ['start', 'middle', 'end'] as const,
    takes: [startTake, middleTake],
    selectedTakeIds: { start: startTake.id, middle: middleTake.id },
  };
  const updatedProject = { ...project, shots: [shot] };
  assert.equal(resolvePriorStoryboardTake(updatedProject, shot, 'middle')?.take.id, startTake.id);
  assert.equal(resolvePriorStoryboardTake(updatedProject, shot, 'end')?.take.id, middleTake.id);
});

test('compiles panel-specific direction only for additional panels', () => {
  const project = normalizePersistedState(legacyState as never).projects[0];
  const shot = { ...project.shots[0], panelDirections: { middle: 'The courier reaches the platform edge.' } };
  assert.equal(compilePanelPrompt('Base prompt', shot, 'start'), 'Base prompt');
  const middlePrompt = compilePanelPrompt('Base prompt', shot, 'middle');
  assert.match(middlePrompt, /PANEL WITHIN SHOT: MIDDLE/);
  assert.match(middlePrompt, /PANEL-SPECIFIC DIRECTION: The courier reaches the platform edge\./);
});
