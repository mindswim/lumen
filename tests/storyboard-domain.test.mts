import assert from 'node:assert/strict';
import test from 'node:test';

import { getSelectedTake, normalizePersistedState } from '../src/lib/storyboard/domain.ts';

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

test('migrates v3 takes and selection to the Start panel without changing identity or ordering', () => {
  const migrated = normalizePersistedState(legacyState as never);
  const project = migrated.projects[0];
  const shot = project.shots[0];

  assert.equal(migrated.version, 4);
  assert.equal(migrated.activeProjectId, 'project-1');
  assert.equal(migrated.selectedShotId, 'shot-1');
  assert.deepEqual(project.references.map((reference) => reference.id), ['ref-1']);
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
