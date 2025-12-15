import { Preset, EditState, createDefaultEditState } from '@/types/editor';

// Preset definitions
// Each preset can have a LUT file OR base adjustments OR both
export const PRESETS: Preset[] = [
  {
    id: 'original',
    name: 'Original',
    category: 'Basic',
    lutFile: null,
    baseAdjustments: {},
  },
  {
    id: 'warm-vintage',
    name: 'Warm Vintage',
    category: 'Film',
    lutFile: 'warmVintage', // References PRESET_LUTS
    baseAdjustments: {
      contrast: 5,
      saturation: -5,
      grain: { amount: 8, size: 25, roughness: 50 },
    },
  },
  {
    id: 'cool-cinematic',
    name: 'Cinematic',
    category: 'Film',
    lutFile: 'coolCinematic',
    baseAdjustments: {
      contrast: 8,
      blacks: -5,
      vignette: { amount: 12, midpoint: 50, roundness: 0, feather: 50 },
    },
  },
  {
    id: 'faded-film',
    name: 'Faded',
    category: 'Film',
    lutFile: 'fadedFilm',
    baseAdjustments: {
      contrast: -8,
      saturation: -10,
      grain: { amount: 10, size: 30, roughness: 60 },
    },
  },
  {
    id: 'high-contrast-bw',
    name: 'B&W High',
    category: 'B&W',
    lutFile: 'highContrastBW',
    baseAdjustments: {
      contrast: 18,
      grain: { amount: 12, size: 20, roughness: 70 },
    },
  },
  {
    id: 'golden-hour',
    name: 'Golden',
    category: 'Warm',
    lutFile: 'goldenHour',
    baseAdjustments: {
      temperature: 12,
      vibrance: 8,
    },
  },
  {
    id: 'matte-look',
    name: 'Matte',
    category: 'Film',
    lutFile: 'matteLook',
    baseAdjustments: {
      contrast: -5,
      highlights: -12,
    },
  },
  {
    id: 'vibrant-pop',
    name: 'Vibrant',
    category: 'Bold',
    lutFile: 'vibrantPop',
    baseAdjustments: {
      vibrance: 12,
      contrast: 5,
    },
  },
  {
    id: 'cross-process',
    name: 'Cross',
    category: 'Film',
    lutFile: 'crossProcess',
    baseAdjustments: {
      saturation: 5,
      contrast: 3,
    },
  },
  // Adjustment-only presets (no LUT)
  {
    id: 'soft-light',
    name: 'Soft Light',
    category: 'Light',
    lutFile: null,
    baseAdjustments: {
      exposure: 0.2,
      contrast: -12,
      highlights: -18,
      shadows: 12,
      saturation: -5,
    },
  },
  {
    id: 'moody',
    name: 'Moody',
    category: 'Dark',
    lutFile: null,
    baseAdjustments: {
      exposure: -0.2,
      contrast: 12,
      highlights: -12,
      shadows: -5,
      blacks: -8,
      saturation: -8,
      vignette: { amount: 18, midpoint: 40, roundness: 0, feather: 60 },
    },
  },
  {
    id: 'clean',
    name: 'Clean',
    category: 'Basic',
    lutFile: null,
    baseAdjustments: {
      contrast: 3,
      highlights: -5,
      shadows: 5,
      vibrance: 5,
      clarity: 5,
    },
  },
];

// Apply preset to get new edit state
export function applyPreset(preset: Preset): Partial<EditState> {
  const defaultState = createDefaultEditState();
  const result: Partial<EditState> = { ...preset.baseAdjustments };

  // Merge nested objects with defaults
  if (preset.baseAdjustments?.grain) {
    result.grain = { ...defaultState.grain, ...preset.baseAdjustments.grain };
  }
  if (preset.baseAdjustments?.vignette) {
    result.vignette = { ...defaultState.vignette, ...preset.baseAdjustments.vignette };
  }

  // Set LUT reference with softer default intensity
  result.lutId = preset.lutFile;
  result.lutIntensity = 75;

  return result;
}

// Get preset categories
export function getPresetCategories(): string[] {
  const categories = new Set(PRESETS.map((p) => p.category));
  return Array.from(categories);
}

// Get presets by category
export function getPresetsByCategory(category: string): Preset[] {
  return PRESETS.filter((p) => p.category === category);
}
