import { NextRequest, NextResponse } from 'next/server';
import { localImagesInitialized, readLocalImages, writeLocalImages } from '@/lib/storage/local-workspace-server';

export const runtime = 'nodejs';

interface ImageRecord {
  id: string;
  [key: string]: unknown;
}

function validImages(value: unknown): value is ImageRecord[] {
  return Array.isArray(value) && value.every((image) => image && typeof image === 'object' && typeof image.id === 'string');
}

export async function GET() {
  try {
    const [images, initialized] = await Promise.all([readLocalImages(), localImagesInitialized()]);
    return NextResponse.json({ images, initialized });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not read images.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!validImages(body?.images)) {
      return NextResponse.json({ error: 'A valid image list is required.' }, { status: 400 });
    }
    const existing = await readLocalImages<ImageRecord>();
    const incoming = new Map(body.images.map((image: ImageRecord) => [image.id, image]));
    const next = [...body.images, ...existing.filter((image) => !incoming.has(image.id))];
    return NextResponse.json({ updatedAt: await writeLocalImages(next) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save images.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown): id is string => typeof id === 'string') : [];
    if (ids.length === 0) return NextResponse.json({ updatedAt: Date.now() });
    const removed = new Set(ids);
    const next = (await readLocalImages<ImageRecord>()).filter((image) => !removed.has(image.id));
    return NextResponse.json({ updatedAt: await writeLocalImages(next) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not delete images.' }, { status: 500 });
  }
}
