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
  };
}
