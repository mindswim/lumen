// Core types for the photo editor

export interface Point {
  x: number;
  y: number;
}

export type ColorRange =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'aqua'
  | 'blue'
  | 'purple'
  | 'magenta';

export interface HSLAdjustment {
  hue: number;        // -100 to 100
  saturation: number; // -100 to 100
  luminance: number;  // -100 to 100
}

export interface GrainSettings {
  amount: number;     // 0 to 100
  size: number;       // 0 to 100
  roughness: number;  // 0 to 100
}

export interface VignetteSettings {
  amount: number;     // -100 to 100
  midpoint: number;   // 0 to 100
  roundness: number;  // -100 to 100
  feather: number;    // 0 to 100
}

export interface SharpeningSettings {
  amount: number;     // 0 to 100
  radius: number;     // 0.5 to 3
  detail: number;     // 0 to 100 (threshold for detail preservation)
}

export interface NoiseReductionSettings {
  luminance: number;  // 0 to 100
  color: number;      // 0 to 100
  detail: number;     // 0 to 100 (detail preservation)
}

export interface SplitToneSettings {
  highlightHue: number;        // 0 to 360 (color wheel)
  highlightSaturation: number; // 0 to 100
  shadowHue: number;           // 0 to 360 (color wheel)
  shadowSaturation: number;    // 0 to 100
  balance: number;             // -100 to 100 (negative = more shadows, positive = more highlights)
}

export interface BlurSettings {
  amount: number;     // 0 to 100
  type: 'gaussian' | 'lens';  // blur type
}

export interface BorderSettings {
  size: number;       // 0 to 100 (percentage of image)
  color: string;      // hex color
  opacity: number;    // 0 to 100
}

export interface BloomSettings {
  amount: number;     // 0 to 100 (glow intensity)
  threshold: number;  // 0 to 100 (brightness threshold for bloom)
  radius: number;     // 0 to 100 (size of glow)
}

export interface HalationSettings {
  amount: number;     // 0 to 100 (effect intensity)
  threshold: number;  // 0 to 100 (brightness threshold)
  hue: number;        // 0 to 360 (color of halation, typically red-orange ~15)
}

export interface SkinToneSettings {
  hue: number;        // -100 to 100 (shift skin hue)
  saturation: number; // -100 to 100 (skin saturation)
  luminance: number;  // -100 to 100 (skin brightness)
}

// Camera Calibration - shifts RGB primaries (like Lightroom's Camera Calibration panel)
export interface CameraCalibrationSettings {
  redHue: number;         // -100 to 100 (shifts red primary hue)
  redSaturation: number;  // -100 to 100 (red saturation)
  greenHue: number;       // -100 to 100 (shifts green primary hue)
  greenSaturation: number; // -100 to 100 (green saturation)
  blueHue: number;        // -100 to 100 (shifts blue primary hue)
  blueSaturation: number; // -100 to 100 (blue saturation)
}

// Gray Mixer - controls how colors convert to B&W
export interface GrayMixerSettings {
  red: number;      // -100 to 100
  orange: number;   // -100 to 100
  yellow: number;   // -100 to 100
  green: number;    // -100 to 100
  aqua: number;     // -100 to 100
  blue: number;     // -100 to 100
  purple: number;   // -100 to 100
  magenta: number;  // -100 to 100
}

// Chromatic Aberration Removal
export interface ChromaticAberrationSettings {
  amount: number;  // 0 to 100 (how much to correct)
}

// Color Grading Wheels - 3-way color grading
export interface ColorWheelSettings {
  hue: number;        // 0 to 360
  saturation: number; // 0 to 100
  luminance: number;  // -100 to 100
}

export interface ColorGradingSettings {
  shadows: ColorWheelSettings;
  midtones: ColorWheelSettings;
  highlights: ColorWheelSettings;
  global: ColorWheelSettings;
  blending: number;   // 0 to 100, how much ranges overlap
}

export interface CropRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface CurveChannel {
  points: Point[];
}

export interface ToneCurve {
  rgb: Point[];
  red: Point[];
  green: Point[];
  blue: Point[];
}

export type MaskType = 'brush' | 'radial' | 'linear';

export interface LocalAdjustments {
  exposure: number;
  contrast: number;
  saturation: number;
  clarity: number;
}

export interface RadialMaskData {
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  feather: number;
  invert: boolean;
}

export interface LinearMaskData {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  feather: number;
}

export interface BrushMaskData {
  strokes: Array<{
    points: Point[];
    size: number;
    feather: number;
    erase: boolean;
  }>;
}

export type MaskData = RadialMaskData | LinearMaskData | BrushMaskData;

export interface Mask {
  id: string;
  type: MaskType;
  data: MaskData;
  adjustments: LocalAdjustments;
  opacity: number;
  visible: boolean;
  label?: string;  // Optional custom label (e.g., "Dodge", "Burn")
}

export interface EditState {
  // Basic adjustments
  exposure: number;      // -5 to +5
  contrast: number;      // -100 to +100
  highlights: number;    // -100 to +100
  shadows: number;       // -100 to +100
  whites: number;        // -100 to +100
  blacks: number;        // -100 to +100

  // White balance
  temperature: number;   // -100 to +100
  tint: number;          // -100 to +100

  // Presence
  clarity: number;       // -100 to +100
  texture: number;       // -100 to +100 (fine detail, smaller scale than clarity)
  dehaze: number;        // -100 to +100 (negative adds haze)
  vibrance: number;      // -100 to +100
  saturation: number;    // -100 to +100

  // Tone curve
  curve: ToneCurve;

  // HSL adjustments
  hsl: Record<ColorRange, HSLAdjustment>;

  // Effects
  fade: number;                // 0 to 100 (lifts blacks)
  grain: GrainSettings;
  vignette: VignetteSettings;
  splitTone: SplitToneSettings;
  colorGrading: ColorGradingSettings;
  blur: BlurSettings;
  border: BorderSettings;
  bloom: BloomSettings;
  halation: HalationSettings;

  // Color
  skinTone: SkinToneSettings;
  calibration: CameraCalibrationSettings;

  // B&W
  convertToGrayscale: boolean;
  grayMixer: GrayMixerSettings;

  // Detail
  sharpening: SharpeningSettings;
  noiseReduction: NoiseReductionSettings;
  chromaticAberration: ChromaticAberrationSettings;

  // LUT / Preset
  lutId: string | null;
  lutIntensity: number;  // 0 to 100

  // Transform
  crop: CropRect | null;
  rotation: number;      // degrees (-180 to 180, for 90-degree rotations)
  straighten: number;    // degrees (-45 to 45, fine angle adjustment)
  perspectiveX: number;  // -100 to 100 (horizontal keystone correction)
  perspectiveY: number;  // -100 to 100 (vertical keystone correction)
  flipH: boolean;
  flipV: boolean;

  // Local adjustments
  masks: Mask[];
}

export interface Preset {
  id: string;
  name: string;
  category: string;
  lutFile: string | null;
  baseAdjustments: Partial<EditState>;
}

export interface ImageData {
  original: HTMLImageElement;
  preview: HTMLImageElement;
  width: number;
  height: number;
  fileName: string;
}

// Default values
export const DEFAULT_HSL_ADJUSTMENT: HSLAdjustment = {
  hue: 0,
  saturation: 0,
  luminance: 0,
};

export const DEFAULT_CURVE_POINTS: Point[] = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
];

export const DEFAULT_GRAIN: GrainSettings = {
  amount: 0,
  size: 25,
  roughness: 50,
};

export const DEFAULT_VIGNETTE: VignetteSettings = {
  amount: 0,
  midpoint: 50,
  roundness: 0,
  feather: 50,
};

export const DEFAULT_SPLIT_TONE: SplitToneSettings = {
  highlightHue: 45,         // warm yellow-orange
  highlightSaturation: 0,
  shadowHue: 220,           // cool blue
  shadowSaturation: 0,
  balance: 0,
};

export const DEFAULT_BLUR: BlurSettings = {
  amount: 0,
  type: 'gaussian',
};

export const DEFAULT_BORDER: BorderSettings = {
  size: 0,
  color: '#ffffff',
  opacity: 100,
};

export const DEFAULT_BLOOM: BloomSettings = {
  amount: 0,
  threshold: 70,    // Only affect bright areas
  radius: 50,
};

export const DEFAULT_HALATION: HalationSettings = {
  amount: 0,
  threshold: 80,    // Only affect very bright areas
  hue: 15,          // Red-orange, typical film halation color
};

export const DEFAULT_SKIN_TONE: SkinToneSettings = {
  hue: 0,
  saturation: 0,
  luminance: 0,
};

export const DEFAULT_CALIBRATION: CameraCalibrationSettings = {
  redHue: 0,
  redSaturation: 0,
  greenHue: 0,
  greenSaturation: 0,
  blueHue: 0,
  blueSaturation: 0,
};

export const DEFAULT_GRAY_MIXER: GrayMixerSettings = {
  red: 0,
  orange: 0,
  yellow: 0,
  green: 0,
  aqua: 0,
  blue: 0,
  purple: 0,
  magenta: 0,
};

export const DEFAULT_SHARPENING: SharpeningSettings = {
  amount: 0,
  radius: 1,
  detail: 50,
};

export const DEFAULT_NOISE_REDUCTION: NoiseReductionSettings = {
  luminance: 0,
  color: 0,
  detail: 50,
};

export const DEFAULT_CHROMATIC_ABERRATION: ChromaticAberrationSettings = {
  amount: 0,
};

export const DEFAULT_COLOR_WHEEL: ColorWheelSettings = {
  hue: 0,
  saturation: 0,
  luminance: 0,
};

export const DEFAULT_COLOR_GRADING: ColorGradingSettings = {
  shadows: { ...DEFAULT_COLOR_WHEEL },
  midtones: { ...DEFAULT_COLOR_WHEEL },
  highlights: { ...DEFAULT_COLOR_WHEEL },
  global: { ...DEFAULT_COLOR_WHEEL },
  blending: 50,
};

export const DEFAULT_LOCAL_ADJUSTMENTS: LocalAdjustments = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
  clarity: 0,
};

export function createDefaultEditState(): EditState {
  return {
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    temperature: 0,
    tint: 0,
    clarity: 0,
    texture: 0,
    dehaze: 0,
    vibrance: 0,
    saturation: 0,
    curve: {
      rgb: [...DEFAULT_CURVE_POINTS],
      red: [...DEFAULT_CURVE_POINTS],
      green: [...DEFAULT_CURVE_POINTS],
      blue: [...DEFAULT_CURVE_POINTS],
    },
    hsl: {
      red: { ...DEFAULT_HSL_ADJUSTMENT },
      orange: { ...DEFAULT_HSL_ADJUSTMENT },
      yellow: { ...DEFAULT_HSL_ADJUSTMENT },
      green: { ...DEFAULT_HSL_ADJUSTMENT },
      aqua: { ...DEFAULT_HSL_ADJUSTMENT },
      blue: { ...DEFAULT_HSL_ADJUSTMENT },
      purple: { ...DEFAULT_HSL_ADJUSTMENT },
      magenta: { ...DEFAULT_HSL_ADJUSTMENT },
    },
    fade: 0,
    grain: { ...DEFAULT_GRAIN },
    vignette: { ...DEFAULT_VIGNETTE },
    splitTone: { ...DEFAULT_SPLIT_TONE },
    colorGrading: { ...DEFAULT_COLOR_GRADING },
    blur: { ...DEFAULT_BLUR },
    border: { ...DEFAULT_BORDER },
    bloom: { ...DEFAULT_BLOOM },
    halation: { ...DEFAULT_HALATION },
    skinTone: { ...DEFAULT_SKIN_TONE },
    calibration: { ...DEFAULT_CALIBRATION },
    convertToGrayscale: false,
    grayMixer: { ...DEFAULT_GRAY_MIXER },
    sharpening: { ...DEFAULT_SHARPENING },
    noiseReduction: { ...DEFAULT_NOISE_REDUCTION },
    chromaticAberration: { ...DEFAULT_CHROMATIC_ABERRATION },
    lutId: null,
    lutIntensity: 100,
    crop: null,
    rotation: 0,
    straighten: 0,
    perspectiveX: 0,
    perspectiveY: 0,
    flipH: false,
    flipV: false,
    masks: [],
  };
}
