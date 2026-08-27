'use client';

import { useState } from 'react';
import { ArrowLeft, CircleCheck, Sparkles, X } from 'lucide-react';

import { createAIImagePreview } from '@/lib/ai/image-preview';
import { useGalleryStore, type GalleryImage } from '@/lib/gallery/store';
import { composeStoryboardPrompt, type PromptReference } from '@/lib/storyboard/prompt';
import { compilePanelPrompt, resolvePriorStoryboardTake, resolveShotReferenceIds } from '@/lib/storyboard/generation-plan';
import {
  getSelectedTake,
  useStoryboardStore,
  type StoryboardPanelRole,
  type StoryboardProject,
  type StoryboardShot,
} from '@/lib/storyboard/store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { imageForTake } from '@/components/storyboard/storyboard-ui';

export function StoryboardGenerationDialog({
  open,
  onOpenChange,
  project,
  shot,
  initialPanelRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: StoryboardProject;
  shot: StoryboardShot;
  initialPanelRole: StoryboardPanelRole;
}) {
  const images = useGalleryStore((state) => state.images);
  const addImageFromUrl = useGalleryStore((state) => state.addImageFromUrl);
  const updateProject = useStoryboardStore((state) => state.updateProject);
  const addTake = useStoryboardStore((state) => state.addTake);
  const [scope, setScope] = useState<'current' | 'scene' | 'missing'>('current');
  const [panelRole] = useState<StoryboardPanelRole>(initialPanelRole);
  const [excludedShotIds, setExcludedShotIds] = useState<Set<string>>(new Set());
  const [refineSelected, setRefineSelected] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const [runResults, setRunResults] = useState<Record<string, 'running' | 'success' | 'error'>>({});
  const [runErrors, setRunErrors] = useState<Record<string, string>>({});

  const currentTake = getSelectedTake(shot, panelRole);
  const renderTier = project.renderTier ?? 'draft';
  const referenceLimit = renderTier === 'draft' ? 4 : 10;
  const scopeCandidates = scope === 'current'
    ? [shot]
    : scope === 'scene'
      ? project.shots.filter((candidate) => candidate.sceneId === shot.sceneId)
      : project.shots.filter((candidate) => !getSelectedTake(candidate, 'start'));
  const targetShots = scopeCandidates.filter((candidate) => !excludedShotIds.has(candidate.id));
  const draftMegapixels = project.aspect === 'landscape_4_3'
    ? (1024 * 768) / 1_000_000
    : (1024 * 576) / 1_000_000;
  const estimatedUnitCost = renderTier === 'draft' ? draftMegapixels * 0.005 : 0.04;

  const targetPanelRole = (targetShot: StoryboardShot): StoryboardPanelRole => (
    scope === 'current' && targetShot.id === shot.id ? panelRole : 'start'
  );

  const referenceIdsForShot = (targetShot: StoryboardShot) => {
    return resolveShotReferenceIds(project, targetShot);
  };

  const priorContextForShot = (targetShot: StoryboardShot, role: StoryboardPanelRole) => {
    return resolvePriorStoryboardTake(project, targetShot, role);
  };

  const inputCountForShot = (targetShot: StoryboardShot) => {
    const role = targetPanelRole(targetShot);
    const inputImageIds = new Set<string>();
    for (const referenceId of referenceIdsForShot(targetShot)) {
      const reference = project.references.find((candidate) => candidate.id === referenceId);
      if (reference && images.some((image) => image.id === reference.imageId)) inputImageIds.add(reference.imageId);
    }
    const priorContext = priorContextForShot(targetShot, role);
    if (priorContext && images.some((image) => image.id === priorContext.take.imageId)) inputImageIds.add(priorContext.take.imageId);
    const selectedTake = getSelectedTake(targetShot, role);
    if (scope === 'current' && refineSelected && selectedTake && images.some((image) => image.id === selectedTake.imageId)) {
      inputImageIds.add(selectedTake.imageId);
    }
    return inputImageIds.size;
  };

  const invalidReasonForShot = (targetShot: StoryboardShot) => {
    if (!targetShot.prompt.trim()) return 'Missing shot description';
    const inputCount = inputCountForShot(targetShot);
    if (inputCount > referenceLimit) return `${inputCount - referenceLimit} references over provider limit`;
    return null;
  };
  const estimatedOutputCount = targetShots.filter((targetShot) => !invalidReasonForShot(targetShot)).length;
  const estimatedTotal = estimatedUnitCost * estimatedOutputCount;

  const assignedReferences = referenceIdsForShot(shot)
    .map((referenceId) => project.references.find((reference) => reference.id === referenceId))
    .filter((reference): reference is NonNullable<typeof reference> => Boolean(reference));
  const sceneReferenceIds = project.scenes.find((candidate) => candidate.id === shot.sceneId)?.referenceIds ?? [];
  const inputCount = inputCountForShot(shot);

  const closeDialog = (nextOpen: boolean) => {
    if (!nextOpen && isGenerating) return;
    if (!nextOpen) {
      setError(null);
      setGenerated(false);
      setRefineSelected(false);
      setRunResults({});
      setRunErrors({});
    }
    onOpenChange(nextOpen);
  };

  const generateShot = async (targetShot: StoryboardShot) => {
      const role = targetPanelRole(targetShot);
      const targetIndex = project.shots.findIndex((candidate) => candidate.id === targetShot.id);
      const activeReferenceIds = referenceIdsForShot(targetShot);
      const inputs: Array<{ image: GalleryImage; promptReference: PromptReference; referenceId?: string }> = [];
      for (const referenceId of activeReferenceIds) {
        const reference = project.references.find((candidate) => candidate.id === referenceId);
        const image = reference ? images.find((candidate) => candidate.id === reference.imageId) : null;
        if (reference && image) inputs.push({ image, promptReference: { reference, label: reference.name }, referenceId });
      }

      const priorContext = priorContextForShot(targetShot, role);
      if (priorContext) {
        const image = images.find((candidate) => candidate.id === priorContext.take.imageId);
        if (image) inputs.push({
          image,
          promptReference: { reference: null, label: priorContext.label },
        });
      }

      const selectedTargetTake = getSelectedTake(targetShot, role);
      if (scope === 'current' && refineSelected && selectedTargetTake) {
        const image = images.find((candidate) => candidate.id === selectedTargetTake.imageId);
        if (image) inputs.push({
          image,
          promptReference: { reference: null, label: 'CURRENT SELECTED VERSION — refine this frame while preserving its successful composition and continuity.' },
        });
      }

      const uniqueInputs = inputs.filter((input, index, all) => (
        all.findIndex((candidate) => candidate.image.id === input.image.id) === index
      ));
      if (uniqueInputs.length > referenceLimit) {
        throw new Error(`${renderTier === 'draft' ? 'Draft' : 'Final'} generation supports ${referenceLimit} reference images. Remove or re-scope ${uniqueInputs.length - referenceLimit} before running.`);
      }

      const basePrompt = composeStoryboardPrompt(
        project,
        targetShot,
        targetIndex,
        uniqueInputs.map((input) => input.promptReference),
      );
      const prompt = compilePanelPrompt(basePrompt, targetShot, role);
      const referenceImages = await Promise.all(
        uniqueInputs.map((input) => createAIImagePreview(input.image.dataUrl)),
      );
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: 'storyboard',
          prompt,
          imageSize: project.aspect,
          numImages: 1,
          referenceImages,
          renderTier,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The frame could not be generated.');

      for (const [index, output] of (result.images as Array<{ url: string }>).entries()) {
        const safeTitle = targetShot.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `shot-${targetIndex + 1}`;
        const roleTakeCount = targetShot.takes.filter((take) => (take.panelRole ?? 'start') === role).length;
        const image = await addImageFromUrl(output.url, `${String(targetIndex + 1).padStart(2, '0')}-${safeTitle}-${role}-v${roleTakeCount + index + 1}.jpg`);
        addTake(project.id, targetShot.id, {
          imageId: image.id,
          prompt,
          referenceIds: uniqueInputs.flatMap((input) => input.referenceId ? [input.referenceId] : []),
          model: result.model || 'fal-ai/bytedance/seedream/v4.5',
          seed: typeof result.seed === 'number' ? result.seed : null,
          panelRole: role,
        });
      }
  };

  const runTargets = async (shotsToRun: StoryboardShot[], resetResults: boolean) => {
    if (shotsToRun.length === 0 || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    if (resetResults) setGenerated(false);
    const nextResults: Record<string, 'running' | 'success' | 'error'> = resetResults ? {} : { ...runResults };
    const nextErrors: Record<string, string> = resetResults ? {} : { ...runErrors };
    if (resetResults) {
      setRunResults({});
      setRunErrors({});
    }

    for (const targetShot of shotsToRun) {
      const invalidReason = invalidReasonForShot(targetShot);
      if (invalidReason) {
        nextResults[targetShot.id] = 'error';
        nextErrors[targetShot.id] = invalidReason;
        setRunResults({ ...nextResults });
        setRunErrors({ ...nextErrors });
        continue;
      }
      nextResults[targetShot.id] = 'running';
      delete nextErrors[targetShot.id];
      setRunResults({ ...nextResults });
      setRunErrors({ ...nextErrors });
      try {
        await generateShot(targetShot);
        nextResults[targetShot.id] = 'success';
      } catch (caught) {
        nextResults[targetShot.id] = 'error';
        nextErrors[targetShot.id] = caught instanceof Error ? caught.message : 'Generation failed';
      }
      setRunResults({ ...nextResults });
      setRunErrors({ ...nextErrors });
    }

    const successes = Object.values(nextResults).filter((result) => result === 'success').length;
    const failures = Object.values(nextResults).filter((result) => result === 'error').length;
    setGenerated(successes > 0);
    setError(failures > 0 ? `${successes} completed · ${failures} need attention. Successful versions were kept.` : null);
    setIsGenerating(false);
  };

  const generate = () => runTargets(targetShots, true);
  const retryTargets = targetShots.filter((targetShot) => runResults[targetShot.id] === 'error' && !invalidReasonForShot(targetShot));
  const retryFailed = () => runTargets(retryTargets, false);

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-5" style={{ borderColor: 'var(--editor-border)' }}>
          <DialogTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> Generation plan</DialogTitle>
          <DialogDescription>Choose the target shots, then review each shot&apos;s own references and validation before starting paid runs.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[68vh] overflow-y-auto">
          <section className="border-b px-6 py-5" style={{ borderColor: 'var(--editor-border)' }}>
            <div className="mb-3 flex items-center justify-between">
              <div><p className="text-xs font-semibold">Targets</p><p className="mt-0.5 text-[10px]" style={{ color: 'var(--editor-text-muted)' }}>{targetShots.length} selected · 1 version each</p></div>
              {scope === 'current' && <span className="font-mono text-[10px] uppercase" style={{ color: 'var(--editor-text-muted)' }}>{panelRole} panel</span>}
            </div>
            <div className="mb-3 flex rounded-lg bg-neutral-100 p-0.5">
              {([
                { value: 'current' as const, label: 'Current panel' },
                { value: 'scene' as const, label: 'Current scene' },
                { value: 'missing' as const, label: 'Missing starts' },
              ]).map((option) => (
                <button key={option.value} type="button" onClick={() => { setScope(option.value); setExcludedShotIds(new Set()); setRunResults({}); setRunErrors({}); setGenerated(false); setError(null); }} className="flex-1 rounded-md px-2 py-2 text-[10px] font-medium" style={{ backgroundColor: scope === option.value ? 'white' : 'transparent', boxShadow: scope === option.value ? '0 1px 2px rgba(0,0,0,.08)' : 'none' }}>{option.label}</button>
              ))}
            </div>
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {scopeCandidates.map((targetShot) => {
                const targetIndex = project.shots.findIndex((candidate) => candidate.id === targetShot.id);
                const targetImage = imageForTake(targetShot, images, targetPanelRole(targetShot));
                const invalidReason = invalidReasonForShot(targetShot);
                const result = runResults[targetShot.id];
                const referenceNames = referenceIdsForShot(targetShot).flatMap((referenceId) => project.references.find((reference) => reference.id === referenceId)?.name ?? []);
                return (
                  <label key={targetShot.id} className="flex cursor-pointer items-center gap-3 rounded-xl border p-2.5" style={{ borderColor: invalidReason ? '#fbbf24' : 'var(--editor-border)', backgroundColor: 'var(--editor-bg-secondary)' }}>
                    <input type="checkbox" checked={!excludedShotIds.has(targetShot.id)} onChange={() => setExcludedShotIds((current) => { const next = new Set(current); if (next.has(targetShot.id)) next.delete(targetShot.id); else next.add(targetShot.id); return next; })} disabled={isGenerating} />
                    <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-900">{targetImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={targetImage.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    )}</div>
                    <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold">{String(targetIndex + 1).padStart(2, '0')} · {targetShot.title}</p><p className="mt-0.5 truncate text-[9px]" title={runErrors[targetShot.id]} style={{ color: runErrors[targetShot.id] ? '#b91c1c' : invalidReason ? '#a16207' : 'var(--editor-text-muted)' }}>{runErrors[targetShot.id] || invalidReason || `${inputCountForShot(targetShot)} inputs · ${referenceNames.join(', ') || 'written direction only'}`}</p></div>
                    {result === 'running' && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />}
                    {result === 'success' && <CircleCheck className="h-4 w-4" />}
                    {result === 'error' && <X className="h-4 w-4 text-red-600" />}
                  </label>
                );
              })}
              {scopeCandidates.length === 0 && <p className="rounded-lg border border-dashed px-3 py-5 text-center text-[10px]" style={{ borderColor: 'var(--editor-border)', color: 'var(--editor-text-muted)' }}>No missing Start panels. This storyboard is fully covered.</p>}
            </div>
          </section>

          {scope === 'current' && <section className="border-b px-6 py-5" style={{ borderColor: 'var(--editor-border)' }}>
            <div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold">Reference assignments</p><span className="text-[10px]" style={{ color: inputCount > referenceLimit ? 'var(--editor-error)' : 'var(--editor-text-muted)' }}>{inputCount} of {referenceLimit} inputs</span></div>
            {assignedReferences.length > 0 ? (
              <div className="space-y-2">
                {assignedReferences.map((reference) => {
                  const image = images.find((candidate) => candidate.id === reference.imageId);
                  const inherited = sceneReferenceIds.includes(reference.id);
                  const role = reference.kind === 'character' ? 'Subject identity' : reference.kind === 'location' ? 'Environment' : reference.kind === 'object' ? 'Prop' : reference.kind === 'style' ? 'Look' : 'Research';
                  return (
                    <div key={reference.id} className="flex items-center gap-3 rounded-lg border p-2.5" style={{ borderColor: 'var(--editor-border)' }}>
                      <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                        {image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{reference.name}</p><p className="mt-0.5 text-[9px]" style={{ color: 'var(--editor-text-muted)' }}>{role} · {inherited ? 'Scene default' : 'This shot'}</p></div>
                      <CircleCheck className="h-4 w-4 text-neutral-500" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed px-3 py-4 text-[10px] leading-4" style={{ borderColor: 'var(--editor-border)', color: 'var(--editor-text-muted)' }}>No project references are assigned. The model will use only the written shot and project direction.</p>
            )}

            {priorContextForShot(shot, panelRole) && (
              <div className="mt-2 flex items-center gap-3 rounded-lg border p-2.5" style={{ borderColor: 'var(--editor-border)' }}>
                <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-neutral-100"><ArrowLeft className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">Earlier continuity panel</p><p className="mt-0.5 text-[9px]" style={{ color: 'var(--editor-text-muted)' }}>{panelRole === 'start' ? 'Previous shot · continuous action' : `Earlier panel in ${shot.title}`}</p></div>
                <CircleCheck className="h-4 w-4 text-neutral-500" />
              </div>
            )}

            {currentTake && (
              <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg bg-neutral-100 p-3">
                <input type="checkbox" checked={refineSelected} onChange={(event) => setRefineSelected(event.target.checked)} className="mt-0.5" />
                <span><span className="block text-[10px] font-semibold">Refine the selected version</span><span className="mt-0.5 block text-[9px] leading-4" style={{ color: 'var(--editor-text-muted)' }}>Include the current composition as an additional input. Leave this off for a genuinely different alternative.</span></span>
              </label>
            )}
            <p className="mt-3 text-[10px] leading-4" style={{ color: 'var(--editor-text-muted)' }}>Only references assigned to this scene or shot are sent. Other project references are excluded.</p>
          </section>}

          <section className="px-6 py-5">
            <p className="mb-3 text-xs font-semibold">Provider and quality</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3" style={{ borderColor: 'var(--editor-border)' }}><p className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--editor-text-muted)' }}>Provider</p><p className="mt-1 text-xs font-medium">fal.ai</p></div>
              {([
                { value: 'draft' as const, label: 'Draft', note: 'FLUX.2 Flash' },
                { value: 'final' as const, label: 'Final', note: 'Seedream 4.5' },
              ]).map((tier) => (
                <button
                  key={tier.value}
                  type="button"
                  onClick={() => updateProject(project.id, { renderTier: tier.value })}
                  className="rounded-lg border p-3 text-left"
                  style={{ borderColor: renderTier === tier.value ? 'var(--editor-text-primary)' : 'var(--editor-border)', backgroundColor: renderTier === tier.value ? 'var(--editor-bg-secondary)' : 'transparent' }}
                >
                  <p className="text-xs font-semibold">{tier.label}</p><p className="mt-1 text-[9px]" style={{ color: 'var(--editor-text-muted)' }}>{tier.note}</p>
                </button>
              ))}
            </div>
          </section>

          {error && <p className="mx-6 mb-5 rounded-lg bg-red-50 px-3 py-2.5 text-[10px] leading-4 text-red-700" role="alert">{error}</p>}
          {generated && <p className="mx-6 mb-5 rounded-lg bg-neutral-100 px-3 py-2.5 text-[10px] leading-4">Completed versions were added to their target panels. Open Shot details to compare or select them.</p>}
        </div>

        <DialogFooter className="items-center border-t px-6 py-4 sm:justify-between" style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-secondary)' }}>
          <p className="text-[9px]" style={{ color: 'var(--editor-text-muted)' }}>{renderTier === 'draft' ? 'FLUX.2 Flash · $0.005/MP' : 'Seedream 4.5 · $0.04/image'} · estimated ${estimatedTotal.toFixed(estimatedTotal < 0.01 ? 3 : 2)} total · {estimatedOutputCount} payable output{estimatedOutputCount === 1 ? '' : 's'}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => closeDialog(false)} disabled={isGenerating} className="rounded-full border px-4 py-2 text-xs font-medium disabled:opacity-40" style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-primary)' }}>{generated ? 'Done' : 'Cancel'}</button>
            {retryTargets.length > 0 && <button type="button" onClick={retryFailed} disabled={isGenerating} className="rounded-full border px-4 py-2 text-xs font-medium disabled:opacity-40" style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-primary)' }}>Retry failed ({retryTargets.length})</button>}
            <button type="button" onClick={generate} disabled={targetShots.length === 0 || isGenerating || generated} className="flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-xs font-medium text-white disabled:opacity-40">
              {isGenerating ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Sparkles className="h-3.5 w-3.5" />}
              {isGenerating ? 'Running plan…' : generated ? 'Versions added' : `Generate ${targetShots.length} ${renderTier}`}
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
