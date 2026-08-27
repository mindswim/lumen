'use client';

import { useRef, useState } from 'react';
import { Check, ChevronDown, Layers3, LockKeyhole, Sparkles, Trash2, Upload, X } from 'lucide-react';

import type { StoryboardEditorContext } from '@/lib/editor/state';
import { useGalleryStore } from '@/lib/gallery/store';
import { referenceRoleSummary } from '@/lib/storyboard/reference';
import {
  getSelectedTake,
  useStoryboardStore,
  type CameraAngle,
  type CameraMovement,
  type ShotSize,
  type StoryboardPanelRole,
  type StoryboardProject,
  type StoryboardShot,
} from '@/lib/storyboard/store';
import { VersionComparisonDialog } from '@/components/storyboard/VersionComparisonDialog';
import {
  CAMERA_ANGLES,
  CAMERA_MOVEMENTS,
  FIELD,
  LABEL,
  SHOT_SIZES,
} from '@/components/storyboard/storyboard-ui';

export function ShotInspector({
  project,
  shot,
  onOpenImage,
  onClose,
  onGenerate,
  initialPanelRole = 'start',
  onActivePanelRoleChange,
}: {
  project: StoryboardProject;
  shot: StoryboardShot;
  onOpenImage: (imageId: string, context?: StoryboardEditorContext) => void;
  onClose: () => void;
  onGenerate: (panelRole: StoryboardPanelRole) => void;
  initialPanelRole?: StoryboardPanelRole;
  onActivePanelRoleChange?: (panelRole: StoryboardPanelRole) => void;
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
  const [activePanelRole, setActivePanelRole] = useState<StoryboardPanelRole>(shot.panelRoles.includes(initialPanelRole) ? initialPanelRole : 'start');
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [confirmDeleteShot, setConfirmDeleteShot] = useState(false);

  const shotIndex = project.shots.findIndex((candidate) => candidate.id === shot.id);
  const scene = project.scenes.find((candidate) => candidate.id === shot.sceneId) ?? project.scenes[0];
  const sceneReferenceIds = scene?.referenceIds ?? [];
  const activeReferenceIds = Array.from(new Set([...sceneReferenceIds, ...shot.referenceIds]));
  const previousCandidate = shotIndex > 0 ? project.shots[shotIndex - 1] : null;
  const previousShot = previousCandidate?.sceneId === shot.sceneId ? previousCandidate : null;
  const previousTake = previousShot ? getSelectedTake(previousShot) : null;
  const panelTakes = shot.takes.filter((take) => (take.panelRole ?? 'start') === activePanelRole);
  const selectedPanelTake = getSelectedTake(shot, activePanelRole);
  const selectPanelRole = (panelRole: StoryboardPanelRole) => {
    setActivePanelRole(panelRole);
    onActivePanelRoleChange?.(panelRole);
  };

  const toggleReference = (referenceId: string) => {
    const next = shot.referenceIds.includes(referenceId)
      ? shot.referenceIds.filter((id) => id !== referenceId)
      : [...shot.referenceIds, referenceId];
    updateShot(project.id, shot.id, { referenceIds: next });
  };

  const togglePanelRole = (panelRole: StoryboardPanelRole) => {
    if (panelRole === 'start') return;
    const enabled = shot.panelRoles.includes(panelRole);
    const panelRoles = enabled
      ? shot.panelRoles.filter((role) => role !== panelRole)
      : (['start', 'middle', 'end'] as StoryboardPanelRole[]).filter((role) => shot.panelRoles.includes(role) || role === panelRole);
    updateShot(project.id, shot.id, { panelRoles });
    if (enabled && activePanelRole === panelRole) selectPanelRole('start');
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
          panelRole: activePanelRole,
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
          {confirmDeleteShot ? (
            <>
              <button type="button" onClick={() => setConfirmDeleteShot(false)} className="rounded-full px-2.5 py-1.5 text-[9px] font-medium">Cancel</button>
              <button type="button" onClick={() => { removeShot(project.id, shot.id); onClose(); }} className="rounded-full bg-red-600 px-2.5 py-1.5 text-[9px] font-medium text-white">Delete shot</button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDeleteShot(true)}
              disabled={project.shots.length <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-red-50 hover:text-red-600 disabled:opacity-20"
              aria-label="Delete shot"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100" aria-label="Close shot details">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <section className="mt-4 rounded-xl border p-2.5" style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-secondary)' }}>
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[10px] font-semibold">Panels in this shot</p><p className="mt-0.5 text-[9px]" style={{ color: 'var(--editor-text-muted)' }}>Add only when the shot needs another composition.</p></div>
          <span className="text-[9px] font-mono" style={{ color: 'var(--editor-text-muted)' }}>{shot.panelRoles.length}</span>
        </div>
        <div className="mt-2 flex gap-1">
          {(['start', 'middle', 'end'] as StoryboardPanelRole[]).map((panelRole) => {
            const enabled = shot.panelRoles.includes(panelRole);
            const versionCount = shot.takes.filter((take) => (take.panelRole ?? 'start') === panelRole).length;
            return (
              <div key={panelRole} className="min-w-0 flex-1">
                {enabled ? (
                  <button type="button" onClick={() => selectPanelRole(panelRole)} className="w-full rounded-lg border px-2 py-2 text-left" style={{ borderColor: activePanelRole === panelRole ? 'var(--editor-text-primary)' : 'var(--editor-border)', backgroundColor: activePanelRole === panelRole ? 'var(--editor-bg-primary)' : 'transparent' }}>
                    <span className="block text-[9px] font-semibold capitalize">{panelRole}</span>
                    <span className="mt-0.5 block text-[8px]" style={{ color: 'var(--editor-text-muted)' }}>{versionCount} version{versionCount === 1 ? '' : 's'}</span>
                  </button>
                ) : (
                  <button type="button" onClick={() => { togglePanelRole(panelRole); selectPanelRole(panelRole); }} className="w-full rounded-lg border border-dashed px-2 py-2 text-[9px] font-medium capitalize" style={{ borderColor: 'var(--editor-border)', color: 'var(--editor-text-muted)' }}>+ {panelRole}</button>
                )}
                {enabled && panelRole !== 'start' && activePanelRole === panelRole && (
                  <button type="button" onClick={() => togglePanelRole(panelRole)} className="mt-1 w-full text-center text-[8px] text-red-600">Remove panel</button>
                )}
              </div>
            );
          })}
        </div>
      </section>

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
        {activePanelRole !== 'start' && (
          <label className="block rounded-xl bg-neutral-100 p-3">
            <span className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>{activePanelRole} panel direction</span>
            <textarea
              value={shot.panelDirections[activePanelRole] ?? ''}
              onChange={(event) => updateShot(project.id, shot.id, { panelDirections: { ...shot.panelDirections, [activePanelRole]: event.target.value } })}
              rows={3}
              className={`${FIELD} resize-none bg-white text-xs leading-5`}
              style={{ borderColor: 'var(--editor-border)' }}
              placeholder={`What changes by the ${activePanelRole} of this same continuous shot?`}
            />
          </label>
        )}
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
                  <p className="mt-0.5 text-[9px]" style={{ color: 'var(--editor-text-muted)' }}>{inherited ? 'Scene default' : active ? 'This shot' : referenceRoleSummary(reference)}</p>
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
        onClick={() => onGenerate(activePanelRole)}
        disabled={!shot.prompt.trim()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-xs font-medium text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {panelTakes.length ? `Generate ${activePanelRole} alternative` : `Generate ${activePanelRole} panel`}
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

      {panelTakes.length > 0 && (
        <>
          <div className="my-5 h-px" style={{ backgroundColor: 'var(--editor-border)' }} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers3 className="h-3.5 w-3.5" />
              <p className="text-xs font-semibold capitalize">{activePanelRole} versions</p>
            </div>
            {panelTakes.length >= 2 && <button type="button" onClick={() => setComparisonOpen(true)} className="rounded-full border px-2.5 py-1 text-[9px] font-medium" style={{ borderColor: 'var(--editor-border)' }}>Compare</button>}
          </div>
          <div className="mt-3 space-y-2">
            {[...panelTakes].reverse().map((take, reverseIndex) => {
              const image = images.find((candidate) => candidate.id === take.imageId);
              const selected = selectedPanelTake?.id === take.id;
              const isBibleReference = project.references.some((reference) => reference.imageId === take.imageId);
              const takeNumber = panelTakes.length - reverseIndex;
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
                            onClick={() => onOpenImage(image.id, {
                              projectId: project.id,
                              shotId: shot.id,
                              panelRole: activePanelRole,
                              sourceTakeId: take.id,
                            })}
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
                                roles: [],
                                tags: [],
                                sourceType: 'generated',
                                description: `Visual reference established in ${shot.title}. Select only the roles this frame should carry into future images.`,
                                sourceTitle: image.sourceProvider,
                                sourceUrl: image.sourceUrl,
                                rightsNote: 'Generated storyboard frame promoted to the project reference library.',
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
      <VersionComparisonDialog
        key={`${shot.id}-${activePanelRole}-${panelTakes.length}`}
        open={comparisonOpen}
        onOpenChange={setComparisonOpen}
        project={project}
        shot={shot}
        panelRole={activePanelRole}
        onOpenImage={onOpenImage}
      />
    </aside>
  );
}
