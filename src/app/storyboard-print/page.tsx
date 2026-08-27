'use client';

import { useEffect } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';

import { useGalleryStore } from '@/lib/gallery/store';
import { getSelectedTake, useStoryboardStore } from '@/lib/storyboard/store';

export default function StoryboardPrintPage() {
  const requestedProjectId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('projectId')
    : null;
  const images = useGalleryStore((state) => state.images);
  const imagesHydrated = useGalleryStore((state) => state.isHydrated);
  const hydrateImages = useGalleryStore((state) => state.hydrateFromIndexedDB);
  const projects = useStoryboardStore((state) => state.projects);
  const activeProjectId = useStoryboardStore((state) => state.activeProjectId);
  const storyboardsHydrated = useStoryboardStore((state) => state.isHydrated);
  const hydrateStoryboards = useStoryboardStore((state) => state.hydrate);

  useEffect(() => {
    if (!imagesHydrated) hydrateImages();
    if (!storyboardsHydrated) hydrateStoryboards();
  }, [hydrateImages, hydrateStoryboards, imagesHydrated, storyboardsHydrated]);

  const project = projects.find((candidate) => candidate.id === requestedProjectId)
    ?? projects.find((candidate) => candidate.id === activeProjectId)
    ?? projects[0];

  if (!imagesHydrated || !storyboardsHydrated) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-neutral-500">Preparing storyboard…</main>;
  }

  if (!project) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-neutral-500">Storyboard not found.</main>;
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950 print:bg-white print:p-0">
      <style jsx global>{`
        @page { size: landscape; margin: 12mm; }
        @media print {
          .story-scene { break-before: page; }
          .story-scene:first-of-type { break-before: auto; }
          .story-card { break-inside: avoid; }
        }
      `}</style>

      <div className="mx-auto mb-5 flex max-w-7xl items-center justify-between print:hidden">
        <button type="button" onClick={() => window.close()} className="flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-xs font-medium"><ArrowLeft className="h-3.5 w-3.5" /> Back</button>
        <button type="button" onClick={() => window.print()} className="flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-xs font-medium text-white"><Printer className="h-3.5 w-3.5" /> Print / Save as PDF</button>
      </div>

      <article className="mx-auto max-w-7xl bg-white p-8 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="border-b border-neutral-300 pb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Lumen storyboard</p>
          <div className="mt-2 flex items-end justify-between gap-8">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{project.title}</h1>
              {project.logline && <p className="mt-3 max-w-4xl text-sm leading-6 text-neutral-600">{project.logline}</p>}
            </div>
            <div className="shrink-0 text-right text-[10px] leading-5 text-neutral-500">
              <p>{project.scenes.length} scenes · {project.shots.length} shots</p>
              <p>{project.shots.reduce((sum, shot) => sum + shot.durationSeconds, 0).toFixed(1)} seconds · {project.aspect.replaceAll('_', ' ')}</p>
            </div>
          </div>
          {project.visualDirection && <div className="mt-5 rounded-lg bg-neutral-100 px-4 py-3"><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-400">Visual direction</p><p className="mt-1.5 text-xs leading-5 text-neutral-700">{project.visualDirection}</p></div>}
        </header>

        <div>
          {project.scenes.map((scene, sceneIndex) => {
            const sceneShots = project.shots.filter((shot) => shot.sceneId === scene.id);
            return (
              <section key={scene.id} className="story-scene pt-7">
                <div className="mb-4 flex items-end justify-between border-b border-neutral-200 pb-3">
                  <div><p className="font-mono text-[9px] text-neutral-400">SCENE {String(sceneIndex + 1).padStart(2, '0')}</p><h2 className="mt-1 text-lg font-semibold">{scene.title}</h2></div>
                  <p className="text-[10px] text-neutral-500">{[scene.location, scene.timeOfDay].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="grid grid-cols-2 gap-5 xl:grid-cols-3">
                  {sceneShots.flatMap((shot) => shot.panelRoles.map((panelRole) => {
                    const shotIndex = project.shots.findIndex((candidate) => candidate.id === shot.id);
                    const take = getSelectedTake(shot, panelRole);
                    const image = take ? images.find((candidate) => candidate.id === take.imageId) : null;
                    const panelDescription = panelRole === 'start'
                      ? shot.beat || shot.prompt
                      : shot.panelDirections[panelRole] || shot.beat || shot.prompt;
                    return (
                      <article key={`${shot.id}-${panelRole}`} className="story-card overflow-hidden rounded-lg border border-neutral-300">
                        <div className="aspect-video bg-neutral-950">
                          {image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={image.dataUrl} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-center justify-between gap-3"><p className="font-mono text-[9px] text-neutral-400">SHOT {String(shotIndex + 1).padStart(2, '0')} · {panelRole.toUpperCase()}</p><p className="text-[9px] text-neutral-400">{shot.durationSeconds}s</p></div>
                          <h3 className="mt-1.5 text-xs font-semibold">{shot.title}</h3>
                          <p className="mt-1.5 text-[10px] leading-4 text-neutral-600">{panelDescription || 'No action specified.'}</p>
                          <div className="mt-3 flex flex-wrap gap-x-2 text-[8px] uppercase tracking-wide text-neutral-400"><span>{shot.shotSize}</span><span>{shot.cameraAngle}</span><span>{shot.cameraMovement}</span></div>
                          {shot.dialogue && <p className="mt-2 border-t border-neutral-200 pt-2 text-[9px] italic leading-4 text-neutral-600">“{shot.dialogue}”</p>}
                        </div>
                      </article>
                    );
                  }))}
                </div>
              </section>
            );
          })}
        </div>
      </article>
    </main>
  );
}
