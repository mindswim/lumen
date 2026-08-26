import { NextResponse } from 'next/server';
import { listGeneratedBundles } from '@/lib/storage/local-workspace-server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json({ bundles: await listGeneratedBundles() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not list generated bundles.' }, { status: 500 });
  }
}
