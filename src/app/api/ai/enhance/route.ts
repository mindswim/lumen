import { NextRequest, NextResponse } from 'next/server';
import { getAIAdjustments, AUTO_ENHANCE_PROMPT } from '@/lib/ai/claude';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentState, imageData } = body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI editing is not configured. Add ANTHROPIC_API_KEY to .env.local.' },
        { status: 503 }
      );
    }

    if (!imageData || typeof imageData !== 'string') {
      return NextResponse.json({ error: 'An image preview is required.' }, { status: 400 });
    }

    // Get AI-generated adjustments for auto-enhance
    const response = await getAIAdjustments(AUTO_ENHANCE_PROMPT, currentState, undefined, imageData);

    return NextResponse.json({
      adjustments: response.adjustments,
      reasoning: response.reasoning,
    });
  } catch (error) {
    console.error('AI enhance error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Enhancement failed' },
      { status: 500 }
    );
  }
}
