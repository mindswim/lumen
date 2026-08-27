'use client';

import { useRef, useState } from 'react';
import { BookOpen, Clock3, ImagePlus, Link2, LockKeyhole, MapPin, Trash2, Upload, X } from 'lucide-react';

import { useGalleryStore } from '@/lib/gallery/store';
import { inferReferenceRoles, referenceDisplayName } from '@/lib/storyboard/reference';
import { useStoryboardStore, type ReferenceRole, type StoryboardProject } from '@/lib/storyboard/store';
import { FIELD, LABEL, REFERENCE_ROLES } from '@/components/storyboard/storyboard-ui';

export function ProjectPanel({ project, onClose }: { project: StoryboardProject; onClose: () => void }) {
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
  const [confirmRemoveReferenceId, setConfirmRemoveReferenceId] = useState<string | null>(null);
  const addImages = useGalleryStore((state) => state.addImages);
  const addImageFromUrl = useGalleryStore((state) => state.addImageFromUrl);
  const images = useGalleryStore((state) => state.images);
  const updateProject = useStoryboardStore((state) => state.updateProject);
  const addReference = useStoryboardStore((state) => state.addReference);
  const updateReference = useStoryboardStore((state) => state.updateReference);
  const removeReference = useStoryboardStore((state) => state.removeReference);
  const updateScene = useStoryboardStore((state) => state.updateScene);
  const updateShot = useStoryboardStore((state) => state.updateShot);
  const selectedShotId = useStoryboardStore((state) => state.selectedShotId);
  const selectedShot = project.shots.find((shot) => shot.id === selectedShotId) ?? project.shots[0];
  const activeScene = project.scenes.find((scene) => scene.id === selectedShot?.sceneId) ?? project.scenes[0];

  const toggleSceneReference = (referenceId: string) => {
    if (!activeScene) return;
    const removing = activeScene.referenceIds.includes(referenceId);
    const referenceIds = removing
      ? activeScene.referenceIds.filter((value) => value !== referenceId)
      : [...activeScene.referenceIds, referenceId];
    const referenceRoleOverrides = { ...activeScene.referenceRoleOverrides };
    if (removing) delete referenceRoleOverrides[referenceId];
    updateScene(project.id, activeScene.id, { referenceIds, referenceRoleOverrides });
    if (!removing) {
      project.shots
        .filter((shot) => shot.sceneId === activeScene.id && shot.referenceIds.includes(referenceId))
        .forEach((shot) => updateShot(project.id, shot.id, { referenceIds: shot.referenceIds.filter((value) => value !== referenceId) }));
    } else {
      project.shots
        .filter((shot) => shot.sceneId === activeScene.id && !shot.referenceIds.includes(referenceId) && referenceId in shot.referenceRoleOverrides)
        .forEach((shot) => {
          const nextOverrides = { ...shot.referenceRoleOverrides };
          delete nextOverrides[referenceId];
          updateShot(project.id, shot.id, { referenceRoleOverrides: nextOverrides });
        });
    }
  };

  const setSceneReferenceRole = (referenceId: string, role: ReferenceRole) => {
    if (!activeScene) return;
    const reference = project.references.find((candidate) => candidate.id === referenceId);
    if (!reference) return;
    const currentRoles = activeScene.referenceRoleOverrides[referenceId] ?? reference.roles;
    const nextRoles = currentRoles.includes(role)
      ? currentRoles.filter((value) => value !== role)
      : reference.roles.filter((value) => currentRoles.includes(value) || value === role);
    if (nextRoles.length === 0) return;
    const referenceRoleOverrides = { ...activeScene.referenceRoleOverrides };
    const usesAllLibraryRoles = nextRoles.length === reference.roles.length
      && reference.roles.every((value) => nextRoles.includes(value));
    if (usesAllLibraryRoles) delete referenceRoleOverrides[referenceId];
    else referenceRoleOverrides[referenceId] = nextRoles;
    updateScene(project.id, activeScene.id, { referenceRoleOverrides });
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
          roles: inferReferenceRoles(image.fileName),
          tags: [],
          sourceType: 'imported',
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
        roles: [],
        tags: [],
        sourceType: 'research',
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
                      aria-pressed={active}
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
              {project.references.some((reference) => activeScene.referenceIds.includes(reference.id) && reference.roles.length > 1) && (
                <div className="mt-3 space-y-2 rounded-xl border p-3" style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-secondary)' }}>
                  <div>
                    <p className="text-[10px] font-semibold">Use throughout this scene</p>
                    <p className="mt-0.5 text-[9px] leading-4" style={{ color: 'var(--editor-text-muted)' }}>Choose which details each multi-purpose reference should preserve by default.</p>
                  </div>
                  {project.references.filter((reference) => activeScene.referenceIds.includes(reference.id) && reference.roles.length > 1).map((reference) => {
                    const effectiveRoles = activeScene.referenceRoleOverrides[reference.id] ?? reference.roles;
                    const hasOverride = reference.id in activeScene.referenceRoleOverrides;
                    return (
                      <div key={reference.id} className="rounded-lg border p-2.5" style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-primary)' }}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[10px] font-semibold">{reference.name}</p>
                          {hasOverride && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextOverrides = { ...activeScene.referenceRoleOverrides };
                                delete nextOverrides[reference.id];
                                updateScene(project.id, activeScene.id, { referenceRoleOverrides: nextOverrides });
                              }}
                              className="shrink-0 text-[9px] font-medium underline underline-offset-2"
                            >
                              Use all roles
                            </button>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {REFERENCE_ROLES.filter((role) => reference.roles.includes(role.value)).map((role) => {
                            const activeRole = effectiveRoles.includes(role.value);
                            return (
                              <button
                                key={role.value}
                                type="button"
                                aria-pressed={activeRole}
                                onClick={() => setSceneReferenceRole(reference.id, role.value)}
                                className="rounded-full border px-2 py-1 text-[9px] font-medium"
                                style={{
                                  borderColor: activeRole ? 'var(--editor-text-primary)' : 'var(--editor-border)',
                                  backgroundColor: activeRole ? 'var(--editor-text-primary)' : 'transparent',
                                  color: activeRole ? 'var(--editor-bg-primary)' : 'var(--editor-text-tertiary)',
                                }}
                              >
                                {role.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
            Keep one recurring subject or production asset per reference, then select every role it should carry. Assign reusable defaults to the scene and exceptions to an individual shot.
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
                    <div className="mt-2 flex flex-wrap gap-1" aria-label="Reference roles">
                      {REFERENCE_ROLES.map((role) => {
                        const active = reference.roles.includes(role.value);
                        return (
                          <button
                            key={role.value}
                            type="button"
                            aria-pressed={active}
                            onClick={() => updateReference(project.id, reference.id, {
                              roles: active
                                ? reference.roles.filter((value) => value !== role.value)
                                : [...reference.roles, role.value],
                            })}
                            className="rounded-full border px-1.5 py-0.5 text-[8px] font-medium"
                            style={{
                              borderColor: active ? 'var(--editor-text-primary)' : 'var(--editor-border)',
                              backgroundColor: active ? 'var(--editor-text-primary)' : 'transparent',
                              color: active ? 'var(--editor-bg-primary)' : 'var(--editor-text-tertiary)',
                            }}
                          >
                            {role.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {confirmRemoveReferenceId === reference.id ? (
                    <div className="flex shrink-0 flex-col gap-1">
                      <button type="button" onClick={() => setConfirmRemoveReferenceId(null)} className="rounded-full px-2 py-1 text-[8px] font-medium">Cancel</button>
                      <button type="button" onClick={() => { removeReference(project.id, reference.id); setConfirmRemoveReferenceId(null); }} className="rounded-full bg-red-600 px-2 py-1 text-[8px] font-medium text-white">Remove</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRemoveReferenceId(reference.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full opacity-50 hover:bg-red-50 hover:text-red-600 hover:opacity-100"
                      aria-label={`Remove ${reference.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <input
                  value={reference.description}
                  onChange={(event) => updateReference(project.id, reference.id, { description: event.target.value })}
                  placeholder="Describe the visual details this reference should contribute…"
                  className="mt-2 w-full bg-transparent text-[10px] leading-4 outline-none"
                  style={{ color: 'var(--editor-text-tertiary)' }}
                  aria-label={`Notes for ${reference.name}`}
                />
                {reference.sourceType === 'research' && (
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
