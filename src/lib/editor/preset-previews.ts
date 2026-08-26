'use client';

import { WebGLRenderer } from '@/lib/webgl/renderer';
import { BuiltInPreset, createPresetEditState } from '@/lib/editor/presets';
import { createDefaultEditState } from '@/types/editor';

async function createSmallImage(source: HTMLImageElement | string): Promise<HTMLImageElement> {
  const input = typeof source === 'string' ? new Image() : source;
  if (typeof source === 'string') {
    input.src = source;
    await new Promise<void>((resolve, reject) => {
      input.onload = () => resolve();
      input.onerror = () => reject(new Error('Could not load preset preview image'));
    });
  }

  const width = input.naturalWidth || input.width;
  const height = input.naturalHeight || input.height;
  const scale = Math.min(1, 320 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext('2d')?.drawImage(input, 0, 0, canvas.width, canvas.height);

  const result = new Image();
  result.src = canvas.toDataURL('image/jpeg', 0.82);
  await new Promise<void>((resolve, reject) => {
    result.onload = () => resolve();
    result.onerror = () => reject(new Error('Could not create preset preview image'));
  });
  return result;
}

export async function renderPresetPreviews(
  source: HTMLImageElement | string,
  presets: BuiltInPreset[]
): Promise<Record<string, string>> {
  const image = await createSmallImage(source);
  const canvas = document.createElement('canvas');
  const renderer = new WebGLRenderer(canvas);
  const previews: Record<string, string> = {};
  const base = createDefaultEditState();

  try {
    renderer.setImage(image);
    for (let index = 0; index < presets.length; index += 1) {
      const preset = presets[index];
      const state = createPresetEditState(preset, base);
      renderer.updateCurveLut(state.curve);
      renderer.render(state);
      previews[preset.id] = canvas.toDataURL('image/jpeg', 0.76);

      if (index > 0 && index % 8 === 0) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
    }
  } finally {
    renderer.dispose();
  }

  return previews;
}
