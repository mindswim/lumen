import { NextRequest, NextResponse } from 'next/server';
import { generateImage, FluxModel } from '@/lib/ai/fal';

export const maxDuration = 60; // Allow up to 60 seconds for generation

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, model, imageSize, numImages } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const result = await generateImage({
      prompt,
      model: model as FluxModel,
      imageSize,
      numImages,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
