import { NextRequest, NextResponse } from 'next/server';
import { writeLocalAsset } from '@/lib/storage/local-workspace-server';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_ASSET_BYTES = 30 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const id = form.get('id');
    const requestedName = form.get('fileName');
    if (!(file instanceof File) || typeof id !== 'string' || !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'A valid image file and id are required.' }, { status: 400 });
    }
    if (file.size > MAX_ASSET_BYTES) {
      return NextResponse.json({ error: 'Images must be 30 MB or smaller.' }, { status: 413 });
    }
    const stored = await writeLocalAsset({
      id,
      fileName: typeof requestedName === 'string' ? requestedName : file.name,
      contentType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    return NextResponse.json(stored);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not store the image.' }, { status: 500 });
  }
}
