import type { StoredImage } from '@/lib/storage/indexed-db';

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'The local workspace request failed.');
  }
  return body as T;
}

export async function getSharedStoryboardState<T>(): Promise<T | null> {
  const response = await fetch('/api/workspace/storyboards', { cache: 'no-store' });
  return (await parseResponse<{ state: T | null }>(response)).state;
}

export async function saveSharedStoryboardState<T>(state: T): Promise<number> {
  const response = await fetch('/api/workspace/storyboards', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  });
  return (await parseResponse<{ updatedAt: number }>(response)).updatedAt;
}

export async function getSharedImages(): Promise<{ images: StoredImage[]; initialized: boolean }> {
  const response = await fetch('/api/workspace/images', { cache: 'no-store' });
  return parseResponse<{ images: StoredImage[]; initialized: boolean }>(response);
}

export async function saveSharedImages(images: StoredImage[]): Promise<void> {
  const response = await fetch('/api/workspace/images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images }),
  });
  await parseResponse(response);
}

export async function saveSharedImage(image: StoredImage): Promise<void> {
  await saveSharedImages([image]);
}

export async function deleteSharedImages(ids: string[]): Promise<void> {
  const response = await fetch('/api/workspace/images', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  await parseResponse(response);
}

export async function uploadSharedImage(
  blob: Blob,
  id: string,
  fileName: string,
): Promise<string> {
  const form = new FormData();
  form.set('id', id);
  form.set('fileName', fileName);
  form.set('file', blob, fileName);
  const response = await fetch('/api/workspace/assets', { method: 'POST', body: form });
  return (await parseResponse<{ url: string }>(response)).url;
}
