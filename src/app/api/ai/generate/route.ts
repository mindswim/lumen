import { NextRequest, NextResponse } from 'next/server';
import { generateImage, generateStoryboardFrame, FluxModel } from '@/lib/ai/fal';

export const maxDuration = 300;

const MAX_PROMPT_LENGTH = 12_000;
const MAX_REFERENCE_PAYLOAD = 18_000_000;

function validReference(value: unknown): value is string {
  return typeof value === 'string' && (
    value.startsWith('data:image/') ||
    value.startsWith('https://')
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, model, imageSize, numImages, engine, referenceImages, renderTier } = body;

    if (!process.env.FAL_KEY) {
      return NextResponse.json(
        { error: 'Image generation is not configured. Add FAL_KEY to .env.local.' },
        { status: 503 }
      );
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Prompt is too long. Keep it under ${MAX_PROMPT_LENGTH.toLocaleString()} characters.` },
        { status: 400 }
      );
    }

    if (engine === 'storyboard') {
      const references = Array.isArray(referenceImages)
        ? referenceImages.filter(validReference).slice(0, 10)
        : [];
      const payloadSize = references.reduce((total, reference) => total + reference.length, 0);
      if (payloadSize > MAX_REFERENCE_PAYLOAD) {
        return NextResponse.json(
          { error: 'The reference set is too large. Remove a reference or use smaller source images.' },
          { status: 413 }
        );
      }

      const result = await generateStoryboardFrame({
        prompt: prompt.trim(),
        imageSize,
        referenceImages: references,
        numImages,
        renderTier: renderTier === 'final' ? 'final' : 'draft',
      });
      return NextResponse.json(result);
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
