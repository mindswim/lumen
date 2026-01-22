import { NextRequest, NextResponse } from 'next/server';
import { getAIAdjustments, AUTO_ENHANCE_PROMPT } from '@/lib/ai/claude';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentState } = body;

    // Get AI-generated adjustments for auto-enhance
    const response = await getAIAdjustments(AUTO_ENHANCE_PROMPT, currentState);

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
