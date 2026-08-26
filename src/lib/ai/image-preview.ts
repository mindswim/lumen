'use client';

const MAX_AI_PREVIEW_EDGE = 1280;

function drawPreview(source: CanvasImageSource, width: number, height: number): string {
  const scale = Math.min(1, MAX_AI_PREVIEW_EDGE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare this photo for visual analysis.');

  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.84);
}

export async function createAIImagePreview(source: HTMLImageElement | string): Promise<string> {
  if (typeof source !== 'string') {
    return drawPreview(source, source.naturalWidth || source.width, source.naturalHeight || source.height);
  }

  const image = new Image();
  image.src = source;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Could not load this photo for visual analysis.'));
  });

  return drawPreview(image, image.naturalWidth || image.width, image.naturalHeight || image.height);
}
