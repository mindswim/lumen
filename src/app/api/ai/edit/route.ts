import { NextRequest, NextResponse } from 'next/server';
import { getAIAdjustments } from '@/lib/ai/claude';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, currentState } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Get AI-generated adjustments based on natural language prompt
    const adjustments = await getAIAdjustments(prompt, currentState);

    return NextResponse.json({
      adjustments,
      prompt,
    });
  } catch (error) {
    console.error('AI edit error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Edit failed' },
      { status: 500 }
    );
  }
}
