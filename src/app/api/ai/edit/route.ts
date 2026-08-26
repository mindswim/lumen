import { NextRequest, NextResponse } from 'next/server';
import { getAIAdjustments } from '@/lib/ai/claude';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, currentState, conversationHistory, imageData } = body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI editing is not configured. Add ANTHROPIC_API_KEY to .env.local.' },
        { status: 503 }
      );
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Get AI-generated adjustments based on natural language prompt
    const response = await getAIAdjustments(prompt, currentState, conversationHistory, imageData);

    return NextResponse.json({
      adjustments: response.adjustments,
      reasoning: response.reasoning,
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
