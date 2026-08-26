import { fal } from '@fal-ai/client';

// Configure fal client - uses FAL_KEY from environment
fal.config({
  credentials: process.env.FAL_KEY,
});

export type FluxModel = 'schnell' | 'dev' | 'pro';

export interface GenerateImageParams {
  prompt: string;
  model?: FluxModel;
  imageSize?: 'square' | 'landscape_4_3' | 'landscape_16_9' | 'portrait_4_3' | 'portrait_16_9';
  numImages?: number;
}

export interface GeneratedImage {
  url: string;
  width: number;
  height: number;
  contentType: string;
}

export interface GenerateImageResult {
  images: GeneratedImage[];
  prompt: string;
  seed: number;
  model?: string;
}

const MODEL_IDS: Record<FluxModel, string> = {
  schnell: 'fal-ai/flux/schnell',
  dev: 'fal-ai/flux/dev',
  pro: 'fal-ai/flux-pro',
};

const IMAGE_SIZES: Record<string, { width: number; height: number }> = {
  square: { width: 1024, height: 1024 },
  landscape_4_3: { width: 1024, height: 768 },
  landscape_16_9: { width: 1024, height: 576 },
  portrait_4_3: { width: 768, height: 1024 },
  portrait_16_9: { width: 576, height: 1024 },
};

export async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  const {
    prompt,
    model = 'schnell',
    imageSize = 'landscape_4_3',
    numImages = 1,
  } = params;

  const modelId = MODEL_IDS[model];
  const size = IMAGE_SIZES[imageSize];

  const result = await fal.subscribe(modelId, {
    input: {
      prompt,
      image_size: size,
      num_images: numImages,
      enable_safety_checker: true,
    },
  });

  // Type the response data
  const data = result.data as {
    images: Array<{ url: string; width: number; height: number; content_type: string }>;
    prompt: string;
    seed: number;
  };

  return {
    images: data.images.map((img) => ({
      url: img.url,
      width: img.width,
      height: img.height,
      contentType: img.content_type,
    })),
    prompt: data.prompt,
    seed: data.seed,
    model: modelId,
  };
}

export interface GenerateStoryboardFrameParams {
  prompt: string;
  imageSize?: GenerateImageParams['imageSize'];
  referenceImages?: string[];
  numImages?: number;
  renderTier?: 'draft' | 'final';
}

const STORY_DRAFT_TEXT_MODEL = 'fal-ai/flux-2/flash';
const STORY_DRAFT_EDIT_MODEL = 'fal-ai/flux-2/flash/edit';
const STORY_TEXT_MODEL = 'fal-ai/bytedance/seedream/v4.5/text-to-image';
const STORY_EDIT_MODEL = 'fal-ai/bytedance/seedream/v4.5/edit';

/**
 * Generate one or more complete storyboard frames. Each render tier keeps
 * text generation and reference-conditioned editing in the same model family:
 * FLUX.2 Flash for inexpensive drafts and Seedream 4.5 for final frames.
 */
export async function generateStoryboardFrame(
  params: GenerateStoryboardFrameParams,
): Promise<GenerateImageResult> {
  const {
    prompt,
    imageSize = 'landscape_16_9',
    referenceImages = [],
    numImages = 1,
    renderTier = 'draft',
  } = params;
  const isDraft = renderTier === 'draft';
  const modelId = isDraft
    ? referenceImages.length > 0 ? STORY_DRAFT_EDIT_MODEL : STORY_DRAFT_TEXT_MODEL
    : referenceImages.length > 0 ? STORY_EDIT_MODEL : STORY_TEXT_MODEL;
  const input: Record<string, unknown> = {
    prompt,
    image_size: imageSize,
    num_images: Math.min(4, Math.max(1, numImages)),
    enable_safety_checker: true,
  };
  if (isDraft) {
    input.enable_prompt_expansion = false;
    input.output_format = 'jpeg';
  } else {
    input.max_images = 1;
  }
  if (referenceImages.length > 0) input.image_urls = referenceImages.slice(0, isDraft ? 4 : 10);

  const result = await fal.subscribe(modelId, { input });
  const data = result.data as {
    images: Array<{
      url: string;
      width?: number;
      height?: number;
      content_type?: string;
    }>;
    seed?: number;
  };
  const fallbackSize = IMAGE_SIZES[imageSize] ?? IMAGE_SIZES.landscape_16_9;

  return {
    images: data.images.map((image) => ({
      url: image.url,
      width: image.width ?? fallbackSize.width,
      height: image.height ?? fallbackSize.height,
      contentType: image.content_type ?? 'image/jpeg',
    })),
    prompt,
    seed: data.seed ?? 0,
    model: modelId,
  };
}
