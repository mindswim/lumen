import { NextRequest, NextResponse } from 'next/server';
import { getAIDirections } from '@/lib/ai/claude';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI editing is not configured. Add ANTHROPIC_API_KEY to .env.local.' },
        { status: 503 }
      );
    }

    const { currentState, imageData } = await request.json();
    if (!imageData || typeof imageData !== 'string') {
      return NextResponse.json({ error: 'An image preview is required.' }, { status: 400 });
    }

    const directions = await getAIDirections(currentState || {}, imageData);
    return NextResponse.json({ directions });
  } catch (error) {
    console.error('AI directions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not create directions.' },
      { status: 500 }
    );
  }
}
