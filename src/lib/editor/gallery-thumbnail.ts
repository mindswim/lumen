'use client';

import { WebGLRenderer } from '@/lib/webgl/renderer';
import type { EditState } from '@/types/editor';

async function loadThumbnailSource(source: string, maxEdge = 560): Promise<HTMLImageElement> {
  const input = new Image();
  input.src = source;
  await new Promise<void>((resolve, reject) => {
    input.onload = () => resolve();
    input.onerror = () => reject(new Error('Could not load thumbnail source'));
  });

  const scale = Math.min(1, maxEdge / Math.max(input.naturalWidth, input.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(input.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(input.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare thumbnail source');
  context.drawImage(input, 0, 0, canvas.width, canvas.height);

  const resized = new Image();
  resized.src = canvas.toDataURL('image/jpeg', 0.86);
  await new Promise<void>((resolve, reject) => {
    resized.onload = () => resolve();
    resized.onerror = () => reject(new Error('Could not prepare thumbnail'));
  });
  return resized;
}

export async function renderGalleryThumbnail(source: string, editState: EditState): Promise<string> {
  const image = await loadThumbnailSource(source);
  const canvas = document.createElement('canvas');
  const renderer = new WebGLRenderer(canvas);

  try {
    renderer.setImage(image);
    renderer.updateCurveLut(editState.curve);
    renderer.render(editState);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    renderer.dispose();
  }
}
