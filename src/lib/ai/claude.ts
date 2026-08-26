import Anthropic from '@anthropic-ai/sdk';
import type { ContentBlockParam, MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { EditState } from '@/types/editor';

const anthropic = new Anthropic();
const AI_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

/**
 * System prompt that teaches Claude about the photo editor's parameters.
 * This gives Claude deep knowledge of photography aesthetics and how to
 * translate intent into parametric adjustments.
 */
const PHOTO_EDITOR_SYSTEM_PROMPT = `You are an expert photo editor assistant. You help users edit photos by returning JSON adjustments for a parametric photo editor.

## Available Parameters

### Basic Adjustments
- exposure: -5 to +5 (EV stops, 0 is neutral)
- contrast: -100 to +100 (0 is neutral)
- highlights: -100 to +100 (recover/boost bright areas)
- shadows: -100 to +100 (recover/boost dark areas)
- whites: -100 to +100 (white point adjustment)
- blacks: -100 to +100 (black point adjustment)

### White Balance
- temperature: -100 (cool/blue) to +100 (warm/orange)
- tint: -100 (green) to +100 (magenta)

### Presence
- clarity: -100 to +100 (midtone contrast/detail)
- texture: -100 to +100 (fine detail enhancement)
- dehaze: -100 to +100 (cut through haze, negative adds haze)
- vibrance: -100 to +100 (smart saturation, protects skin tones)
- saturation: -100 to +100 (overall color intensity)

### Tone Curve
- curve.rgb: array of {x, y} points (0-1 range) for luminosity
- curve.red/green/blue: per-channel curves
Common patterns:
  - Lift blacks (faded look): [{x:0, y:0.05}, {x:1, y:1}]
  - S-curve (contrast): [{x:0, y:0}, {x:0.25, y:0.2}, {x:0.75, y:0.8}, {x:1, y:1}]
  - Crushed highlights: [{x:0, y:0}, {x:1, y:0.95}]

### HSL (Hue/Saturation/Luminance by color)
Colors: red, orange, yellow, green, aqua, blue, purple, magenta
Each has: hue (-100 to +100), saturation (-100 to +100), luminance (-100 to +100)
Format: hsl.red.saturation, hsl.blue.hue, etc.

### Effects
- fade: 0 to 100 (lifts black point for faded/matte look)
- grain: { amount: 0-100, size: 0-100, roughness: 0-100 }
- vignette: { amount: -100 to +100, midpoint: 0-100, roundness: -100 to +100, feather: 0-100 }
- bloom: { amount: 0-100, threshold: 0-100, radius: 0-100 }
- halation: { amount: 0-100, threshold: 0-100, hue: 0-360 }

### Split Tone (color grading)
- splitTone: { highlightHue: 0-360, highlightSaturation: 0-100, shadowHue: 0-360, shadowSaturation: 0-100, balance: -100 to +100 }

### Detail
- sharpening: { amount: 0-100, radius: 0.5-3, detail: 0-100 }
- noiseReduction: { luminance: 0-100, color: 0-100, detail: 0-100 }

### B&W Conversion
- convertToGrayscale: boolean
- grayMixer: { red, orange, yellow, green, aqua, blue, purple, magenta } (all -100 to +100)

## Common Look Recipes

### Film Looks
- **Portra 400**: Warm shadows, slightly lifted blacks, desaturated highlights
  { temperature: 8, fade: 8, highlights: -10, hsl: { orange: { saturation: 5 } }, curve: { rgb: [{x:0, y:0.03}, {x:1, y:0.98}] } }

- **Kodak Gold**: Warm, saturated, golden tones
  { temperature: 15, saturation: 12, vibrance: 8, hsl: { yellow: { saturation: 15 }, orange: { saturation: 10 } } }

- **Fuji 400H**: Cool shadows, pastel highlights, soft contrast
  { temperature: -5, tint: 5, contrast: -10, fade: 12, hsl: { blue: { saturation: 8 } } }

### Cinematic Looks
- **Teal & Orange**: Classic Hollywood color grading
  { splitTone: { shadowHue: 200, shadowSaturation: 25, highlightHue: 35, highlightSaturation: 20, balance: 10 } }

- **Moody/Dark**: Low-key, desaturated, deep shadows
  { exposure: -0.3, contrast: 15, blacks: -20, saturation: -15, fade: 5 }

### Clean/Modern
- **Bright & Airy**: High key, lifted shadows, soft
  { exposure: 0.4, shadows: 30, highlights: -15, contrast: -10, fade: 8 }

- **Crisp**: Clear, punchy, detailed
  { clarity: 15, contrast: 10, vibrance: 10, dehaze: 10 }

## Response Format

Always respond with a valid JSON object containing two fields:
1. "adjustments" - the parameter changes to apply
2. "reasoning" - a brief (1-2 sentence) explanation of what you changed and why, written conversationally

Example response:
{"adjustments": {"temperature": 15, "contrast": 8, "fade": 10}, "reasoning": "Added warmth and a subtle fade to create that classic film look. Bumped contrast slightly to maintain punch."}

No markdown, no extra text outside the JSON.

## Guidelines

1. Make subtle adjustments - small values (5-20) often have significant impact
2. Consider relationships: if adding warmth, might reduce orange saturation to avoid skin going too orange
3. For "film look": lift blacks slightly (fade 5-15 or curve), reduce highlight contrast, add subtle grain
4. For "cinematic": use split toning, reduce saturation slightly, add vignette
5. Only return parameters that need to change - don't include values that stay at default (0)
6. If the request is vague, make tasteful professional choices`;

/**
 * Response from the AI with adjustments and reasoning
 */
export interface AIResponse {
  adjustments: Partial<EditState>;
  reasoning: string;
}

export interface AIDirection extends AIResponse {
  id: string;
  name: string;
  description: string;
}

function parseImageDataUrl(imageData?: string): ContentBlockParam | null {
  if (!imageData) return null;
  const match = imageData.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/);
  if (!match) return null;

  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
      data: match[2],
    },
  };
}

function parseResponse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid JSON response from AI');
    return JSON.parse(jsonMatch[0]);
  }
}

function clamp(value: unknown, minimum: number, maximum: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.min(maximum, Math.max(minimum, value));
}

function sanitizeNumberObject(
  value: unknown,
  ranges: Record<string, readonly [number, number]>
): Record<string, number> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  const result: Record<string, number> = {};

  for (const [key, [minimum, maximum]] of Object.entries(ranges)) {
    const nextValue = clamp(input[key], minimum, maximum);
    if (nextValue !== undefined) result[key] = nextValue;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function sanitizeAIAdjustments(value: unknown): Partial<EditState> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  const scalarRanges: Record<string, readonly [number, number]> = {
    exposure: [-5, 5],
    contrast: [-100, 100],
    highlights: [-100, 100],
    shadows: [-100, 100],
    whites: [-100, 100],
    blacks: [-100, 100],
    temperature: [-100, 100],
    tint: [-100, 100],
    clarity: [-100, 100],
    texture: [-100, 100],
    dehaze: [-100, 100],
    vibrance: [-100, 100],
    saturation: [-100, 100],
    fade: [0, 100],
  };

  for (const [key, [minimum, maximum]] of Object.entries(scalarRanges)) {
    const nextValue = clamp(input[key], minimum, maximum);
    if (nextValue !== undefined) result[key] = nextValue;
  }

  if (typeof input.convertToGrayscale === 'boolean') {
    result.convertToGrayscale = input.convertToGrayscale;
  }

  const curveInput = input.curve;
  if (curveInput && typeof curveInput === 'object' && !Array.isArray(curveInput)) {
    const curves: Record<string, Array<{ x: number; y: number }>> = {};
    for (const channel of ['rgb', 'red', 'green', 'blue']) {
      const points = (curveInput as Record<string, unknown>)[channel];
      if (!Array.isArray(points)) continue;
      const sanitizedPoints = points.slice(0, 16).flatMap((point) => {
        if (!point || typeof point !== 'object' || Array.isArray(point)) return [];
        const x = clamp((point as Record<string, unknown>).x, 0, 1);
        const y = clamp((point as Record<string, unknown>).y, 0, 1);
        return x === undefined || y === undefined ? [] : [{ x, y }];
      }).sort((a, b) => a.x - b.x);
      if (sanitizedPoints.length >= 2) curves[channel] = sanitizedPoints;
    }
    if (Object.keys(curves).length > 0) result.curve = curves;
  }

  const hslInput = input.hsl;
  if (hslInput && typeof hslInput === 'object' && !Array.isArray(hslInput)) {
    const hsl: Record<string, Record<string, number>> = {};
    for (const color of ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta']) {
      const channel = sanitizeNumberObject((hslInput as Record<string, unknown>)[color], {
        hue: [-100, 100], saturation: [-100, 100], luminance: [-100, 100],
      });
      if (channel) hsl[color] = channel;
    }
    if (Object.keys(hsl).length > 0) result.hsl = hsl;
  }

  const nestedRanges: Record<string, Record<string, readonly [number, number]>> = {
    grain: { amount: [0, 100], size: [0, 100], roughness: [0, 100] },
    vignette: { amount: [-100, 100], midpoint: [0, 100], roundness: [-100, 100], feather: [0, 100] },
    splitTone: { highlightHue: [0, 360], highlightSaturation: [0, 100], shadowHue: [0, 360], shadowSaturation: [0, 100], balance: [-100, 100] },
    bloom: { amount: [0, 100], threshold: [0, 100], radius: [0, 100] },
    halation: { amount: [0, 100], threshold: [0, 100], hue: [0, 360] },
    sharpening: { amount: [0, 100], radius: [0.5, 3], detail: [0, 100] },
    noiseReduction: { luminance: [0, 100], color: [0, 100], detail: [0, 100] },
    grayMixer: { red: [-100, 100], orange: [-100, 100], yellow: [-100, 100], green: [-100, 100], aqua: [-100, 100], blue: [-100, 100], purple: [-100, 100], magenta: [-100, 100] },
  };

  for (const [key, ranges] of Object.entries(nestedRanges)) {
    const sanitized = sanitizeNumberObject(input[key], ranges);
    if (sanitized) result[key] = sanitized;
  }

  return result as Partial<EditState>;
}

/**
 * Calls Claude API to get photo editing adjustments with reasoning
 */
export async function getAIAdjustments(
  prompt: string,
  currentState?: Partial<EditState>,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  imageData?: string
): Promise<AIResponse> {
  const userMessage = currentState
    ? `Current edit state context (non-default values): ${JSON.stringify(currentState, null, 2)}\n\nUser request: ${prompt}`
    : prompt;

  // Build messages array with conversation history for context
  const messages: MessageParam[] = [];

  if (conversationHistory && conversationHistory.length > 0) {
    messages.push(...conversationHistory);
  }

  const imageBlock = parseImageDataUrl(imageData);
  const content: ContentBlockParam[] = [];
  if (imageBlock) content.push(imageBlock);
  content.push({ type: 'text', text: userMessage });

  messages.push({ role: 'user', content });

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    system: PHOTO_EDITOR_SYSTEM_PROMPT,
    messages,
  });

  // Extract text content
  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from AI');
  }

  // Parse JSON response
  const parsed = parseResponse(textContent.text) as Partial<AIResponse> & Partial<EditState>;
  if ('adjustments' in parsed && parsed.adjustments) {
      return {
        adjustments: sanitizeAIAdjustments(parsed.adjustments),
        reasoning: parsed.reasoning || 'Adjustments applied.',
      };
  }

  return {
    adjustments: sanitizeAIAdjustments(parsed),
    reasoning: 'Adjustments applied.',
  };
}

export async function getAIDirections(
  currentState: Partial<EditState>,
  imageData: string
): Promise<AIDirection[]> {
  const imageBlock = parseImageDataUrl(imageData);
  if (!imageBlock) throw new Error('A valid image preview is required');

  const prompt = `Study this photo's subject, lighting, palette, dynamic range, and emotional tone. Propose exactly three genuinely different but tasteful creative directions.

Each direction must be achievable with the available parametric controls, preserve the subject's identity, and avoid generative changes. Return JSON only in this shape:
{"directions":[{"id":"short-id","name":"2-3 word name","description":"one sentence describing the mood","adjustments":{},"reasoning":"one sentence explaining why it suits this photo"}]}

Current edit state: ${JSON.stringify(currentState)}`;

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 1800,
    system: `${PHOTO_EDITOR_SYSTEM_PROMPT}\n\nFor the creative-directions request, follow the directions array response format in the user message instead of the usual single-adjustment response format.`,
    messages: [{ role: 'user', content: [imageBlock, { type: 'text', text: prompt }] }],
  });

  const textContent = response.content.find((content) => content.type === 'text');
  if (!textContent || textContent.type !== 'text') throw new Error('No text response from AI');

  const parsed = parseResponse(textContent.text) as { directions?: AIDirection[] };
  if (!Array.isArray(parsed.directions) || parsed.directions.length === 0) {
    throw new Error('AI did not return creative directions');
  }

  return parsed.directions.slice(0, 3).map((direction, index) => ({
    id: direction.id || `direction-${index + 1}`,
    name: direction.name || `Direction ${index + 1}`,
    description: direction.description || direction.reasoning || 'A tailored look for this photo.',
    reasoning: direction.reasoning || direction.description || 'Tailored to this photo.',
    adjustments: sanitizeAIAdjustments(direction.adjustments),
  }));
}

/**
 * Auto-enhance prompt that analyzes and optimizes the image
 */
export const AUTO_ENHANCE_PROMPT = `Analyze this photo and suggest optimal adjustments to enhance it professionally.

Consider:
1. Exposure - is the image properly exposed?
2. Dynamic range - are highlights/shadows recovered appropriately?
3. White balance - does the color temperature look natural?
4. Contrast - does it have good tonal separation?
5. Vibrance - are colors pleasing but not oversaturated?

Return subtle, professional adjustments. This is a one-click "auto" enhance, so:
- Keep changes moderate (exposure within -0.5 to +0.5)
- Don't add stylistic effects (no grain, vignette, etc.)
- Focus on technical correction, not creative style
- Make the image look its best while staying natural

In your reasoning, briefly explain what you corrected (e.g., "Brightened the exposure and recovered shadow detail for better balance.").`;
