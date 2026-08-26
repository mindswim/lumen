import { NextRequest, NextResponse } from 'next/server';
import { readLocalStoryboards, writeLocalStoryboards } from '@/lib/storage/local-workspace-server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json({ state: await readLocalStoryboards() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not read storyboards.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || !('state' in body)) {
      return NextResponse.json({ error: 'Storyboard state is required.' }, { status: 400 });
    }
    return NextResponse.json({ updatedAt: await writeLocalStoryboards(body.state) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save storyboards.' }, { status: 500 });
  }
}
