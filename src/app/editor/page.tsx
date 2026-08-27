'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Editor } from '@/components/editor/Editor';
import { useEditorStore, type StoryboardEditorContext } from '@/lib/editor/state';
import { useGalleryStore } from '@/lib/gallery/store';
import { useStoryboardStore, type StoryboardPanelRole } from '@/lib/storyboard/store';

function isPanelRole(value: string | null): value is StoryboardPanelRole {
  return value === 'start' || value === 'middle' || value === 'end';
}

export default function EditorPage() {
  const router = useRouter();
  const [loadError, setLoadError] = useState<string | null>(null);
  const image = useEditorStore((state) => state.image);
  const setEditorImage = useEditorStore((state) => state.setImage);
  const setEditState = useEditorStore((state) => state.setEditState);
  const setStoryboardContext = useEditorStore((state) => state.setStoryboardContext);
  const imagesHydrated = useGalleryStore((state) => state.isHydrated);
  const hydrateImages = useGalleryStore((state) => state.hydrateFromIndexedDB);
  const getImage = useGalleryStore((state) => state.getImage);
  const setActiveImage = useGalleryStore((state) => state.setActiveImage);
  const storyboardsHydrated = useStoryboardStore((state) => state.isHydrated);
  const hydrateStoryboards = useStoryboardStore((state) => state.hydrate);
  const setActiveProject = useStoryboardStore((state) => state.setActiveProject);
  const selectShot = useStoryboardStore((state) => state.selectShot);

  useEffect(() => {
    if (!imagesHydrated) hydrateImages();
    if (!storyboardsHydrated) hydrateStoryboards();
  }, [hydrateImages, hydrateStoryboards, imagesHydrated, storyboardsHydrated]);

  useEffect(() => {
    if (image || !imagesHydrated || !storyboardsHydrated) return;
    let cancelled = false;

    const restoreEditor = async () => {
      const params = new URLSearchParams(window.location.search);
      const imageId = params.get('imageId');
      const galleryImage = imageId ? getImage(imageId) : null;
      if (!galleryImage) {
        router.replace('/');
        return;
      }

      const restoredImage = new Image();
      restoredImage.src = galleryImage.dataUrl;
      await new Promise<void>((resolve, reject) => {
        restoredImage.onload = () => resolve();
        restoredImage.onerror = () => reject(new Error('Could not restore this image.'));
      });
      if (cancelled) return;

      const projectId = params.get('projectId');
      const shotId = params.get('shotId');
      const panelRole = params.get('panelRole');
      const sourceTakeId = params.get('sourceTakeId');
      let context: StoryboardEditorContext | null = null;
      if (projectId && shotId && sourceTakeId && isPanelRole(panelRole)) {
        const project = useStoryboardStore.getState().projects.find((candidate) => candidate.id === projectId);
        const shot = project?.shots.find((candidate) => candidate.id === shotId);
        const take = shot?.takes.find((candidate) => candidate.id === sourceTakeId);
        if (take?.imageId === galleryImage.id && take.panelRole === panelRole) {
          context = { projectId, shotId, panelRole, sourceTakeId };
          setActiveProject(projectId);
          selectShot(shotId);
        }
      }

      setEditorImage({
        original: restoredImage,
        preview: restoredImage,
        width: galleryImage.width,
        height: galleryImage.height,
        fileName: galleryImage.fileName,
      });
      setEditState(galleryImage.editState);
      setActiveImage(galleryImage.id);
      setStoryboardContext(context);
    };

    restoreEditor().catch((error) => {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Could not restore the editor.');
    });
    return () => { cancelled = true; };
  }, [getImage, image, imagesHydrated, router, selectShot, setActiveImage, setActiveProject, setEditState, setEditorImage, setStoryboardContext, storyboardsHydrated]);

  if (!image) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: 'var(--editor-canvas-bg)' }}>
        <div className="text-center" style={{ color: 'var(--editor-text-muted)' }}>
          <p>{loadError ?? 'Restoring editor…'}</p>
          {loadError && <button type="button" onClick={() => router.replace('/')} className="mt-3 rounded-full border px-4 py-2 text-xs">Return to workspace</button>}
        </div>
      </div>
    );
  }

  return <Editor />;
}
