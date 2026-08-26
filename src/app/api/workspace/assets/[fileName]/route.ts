import { NextResponse } from 'next/server';
import { readLocalAsset } from '@/lib/storage/local-workspace-server';

export const runtime = 'nodejs';

const CONTENT_TYPES: Record<string, string> = {
  avif: 'image/avif',
  gif: 'image/gif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileName: string }> },
) {
  const { fileName } = await context.params;
  const bytes = await readLocalAsset(fileName);
  if (!bytes) return NextResponse.json({ error: 'Image not found.' }, { status: 404 });
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Type': CONTENT_TYPES[extension] ?? 'application/octet-stream',
    },
  });
}
