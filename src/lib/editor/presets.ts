import { EditState, createDefaultEditState, Point } from '@/types/editor';

// Built-in preset type - same as user presets, just with category
export interface BuiltInPreset {
  id: string;
  name: string;
  category: string;
  editState: Partial<EditState>;
}

// Helper to create curve points for common patterns
const curves = {
  // Linear (no change)
  linear: (): Point[] => [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ],

  // S-curve for contrast (adjustable strength)
  sCurve: (strength: number = 0.1): Point[] => [
    { x: 0, y: 0 },
    { x: 0.25, y: 0.25 - strength },
    { x: 0.75, y: 0.75 + strength },
    { x: 1, y: 1 },
  ],

  // Lifted blacks (faded film look)
  liftedBlacks: (lift: number = 0.05): Point[] => [
    { x: 0, y: lift },
    { x: 1, y: 1 },
  ],

  // Crushed blacks (deep shadows)
  crushedBlacks: (crush: number = 0.05): Point[] => [
    { x: 0, y: 0 },
    { x: crush, y: 0 },
    { x: 1, y: 1 },
  ],

  // Faded with S-curve (classic film)
  fadedFilm: (lift: number = 0.06, strength: number = 0.08): Point[] => [
    { x: 0, y: lift },
    { x: 0.25, y: 0.22 + lift * 0.5 },
    { x: 0.75, y: 0.78 },
    { x: 1, y: 0.97 },
  ],

  // Matte look (lifted blacks, compressed highlights)
  matte: (lift: number = 0.08): Point[] => [
    { x: 0, y: lift },
    { x: 0.5, y: 0.5 },
    { x: 1, y: 0.95 },
  ],

  // High contrast S
  highContrast: (): Point[] => [
    { x: 0, y: 0 },
    { x: 0.2, y: 0.1 },
    { x: 0.8, y: 0.9 },
    { x: 1, y: 1 },
  ],

  // Low contrast (flat)
  lowContrast: (): Point[] => [
    { x: 0, y: 0.1 },
    { x: 0.5, y: 0.5 },
    { x: 1, y: 0.9 },
  ],
};

// Preset definitions - all parametric with curves and HSL
export const PRESETS: BuiltInPreset[] = [
  // ============ BASIC ============
  {
    id: 'original',
    name: 'Original',
    category: 'Basic',
    editState: {}, // Reset to defaults
  },
  {
    id: 'auto-enhance',
    name: 'Auto',
    category: 'Basic',
    editState: {
      contrast: 8,
      highlights: -15,
      shadows: 15,
      vibrance: 10,
      clarity: 5,
      curve: {
        rgb: curves.sCurve(0.05),
        red: curves.linear(),
        green: curves.linear(),
        blue: curves.linear(),
      },
    },
  },

  // ============ FILM ============
  {
    id: 'film-portra',
    name: 'Portra',
    category: 'Film',
    editState: {
      temperature: 8,
      exposure: 0.1,
      contrast: -5,
      highlights: -10,
      shadows: 15,
      saturation: -8,
      vibrance: 5,
      curve: {
        rgb: curves.fadedFilm(0.04, 0.06),
        red: [{ x: 0, y: 0.02 }, { x: 0.5, y: 0.52 }, { x: 1, y: 1 }],
        green: curves.linear(),
        blue: [{ x: 0, y: 0 }, { x: 0.5, y: 0.48 }, { x: 1, y: 0.98 }],
      },
      hsl: {
        red: { hue: 5, saturation: -5, luminance: 0 },
        orange: { hue: 5, saturation: 10, luminance: 5 },
        yellow: { hue: -5, saturation: -10, luminance: 5 },
        green: { hue: 10, saturation: -20, luminance: 0 },
        aqua: { hue: 0, saturation: -15, luminance: 0 },
        blue: { hue: 0, saturation: -10, luminance: 0 },
        purple: { hue: 0, saturation: -10, luminance: 0 },
        magenta: { hue: 0, saturation: -5, luminance: 0 },
      },
      grain: { amount: 8, size: 25, roughness: 50 },
    },
  },
  {
    id: 'film-fuji',
    name: 'Fuji 400H',
    category: 'Film',
    editState: {
      temperature: -5,
      tint: 5,
      contrast: 5,
      highlights: -8,
      shadows: 10,
      saturation: 5,
      curve: {
        rgb: curves.fadedFilm(0.03, 0.05),
        red: curves.linear(),
        green: [{ x: 0, y: 0.02 }, { x: 0.5, y: 0.52 }, { x: 1, y: 1 }],
        blue: [{ x: 0, y: 0.03 }, { x: 0.5, y: 0.53 }, { x: 1, y: 1 }],
      },
      hsl: {
        red: { hue: 0, saturation: 5, luminance: 0 },
        orange: { hue: -5, saturation: 5, luminance: 5 },
        yellow: { hue: -10, saturation: 0, luminance: 5 },
        green: { hue: 15, saturation: 20, luminance: 5 },
        aqua: { hue: 10, saturation: 15, luminance: 0 },
        blue: { hue: -10, saturation: 10, luminance: -5 },
        purple: { hue: 0, saturation: 0, luminance: 0 },
        magenta: { hue: 5, saturation: 10, luminance: 0 },
      },
      grain: { amount: 6, size: 22, roughness: 45 },
    },
  },
  {
    id: 'film-kodak-gold',
    name: 'Gold 200',
    category: 'Film',
    editState: {
      temperature: 18,
      tint: 5,
      contrast: 10,
      highlights: -5,
      shadows: 5,
      saturation: 15,
      vibrance: 10,
      curve: {
        rgb: curves.sCurve(0.08),
        red: [{ x: 0, y: 0 }, { x: 0.5, y: 0.54 }, { x: 1, y: 1 }],
        green: curves.linear(),
        blue: [{ x: 0, y: 0 }, { x: 0.5, y: 0.46 }, { x: 1, y: 0.95 }],
      },
      hsl: {
        red: { hue: 5, saturation: 15, luminance: 0 },
        orange: { hue: 10, saturation: 25, luminance: 5 },
        yellow: { hue: 5, saturation: 20, luminance: 10 },
        green: { hue: 15, saturation: 5, luminance: 0 },
        aqua: { hue: 0, saturation: -10, luminance: 0 },
        blue: { hue: 0, saturation: -15, luminance: -5 },
        purple: { hue: 0, saturation: 0, luminance: 0 },
        magenta: { hue: 0, saturation: 10, luminance: 0 },
      },
      grain: { amount: 10, size: 28, roughness: 55 },
    },
  },
  {
    id: 'film-velvia',
    name: 'Velvia',
    category: 'Film',
    editState: {
      temperature: 5,
      contrast: 20,
      highlights: -10,
      shadows: -5,
      blacks: -5,
      saturation: 25,
      vibrance: 15,
      clarity: 10,
      curve: {
        rgb: curves.highContrast(),
        red: curves.sCurve(0.05),
        green: curves.sCurve(0.05),
        blue: curves.sCurve(0.05),
      },
      hsl: {
        red: { hue: 0, saturation: 20, luminance: -5 },
        orange: { hue: 5, saturation: 25, luminance: 0 },
        yellow: { hue: 0, saturation: 20, luminance: 5 },
        green: { hue: 5, saturation: 30, luminance: -5 },
        aqua: { hue: -5, saturation: 25, luminance: -5 },
        blue: { hue: 5, saturation: 30, luminance: -10 },
        purple: { hue: 0, saturation: 15, luminance: 0 },
        magenta: { hue: 0, saturation: 20, luminance: 0 },
      },
      grain: { amount: 4, size: 18, roughness: 40 },
    },
  },
  {
    id: 'film-faded',
    name: 'Faded',
    category: 'Film',
    editState: {
      contrast: -10,
      highlights: -15,
      shadows: 10,
      fade: 15,
      saturation: -15,
      curve: {
        rgb: curves.matte(0.1),
        red: [{ x: 0, y: 0.05 }, { x: 1, y: 0.98 }],
        green: [{ x: 0, y: 0.05 }, { x: 1, y: 0.97 }],
        blue: [{ x: 0, y: 0.08 }, { x: 1, y: 0.95 }],
      },
      hsl: {
        red: { hue: 0, saturation: -10, luminance: 0 },
        orange: { hue: 0, saturation: -5, luminance: 5 },
        yellow: { hue: 0, saturation: -10, luminance: 5 },
        green: { hue: 0, saturation: -15, luminance: 0 },
        aqua: { hue: 0, saturation: -15, luminance: 0 },
        blue: { hue: 0, saturation: -20, luminance: 0 },
        purple: { hue: 0, saturation: -10, luminance: 0 },
        magenta: { hue: 0, saturation: -10, luminance: 0 },
      },
      grain: { amount: 12, size: 30, roughness: 60 },
    },
  },

  // ============ ANALOG ============
  // Classic analog-inspired color grades
  {
    id: 'analog-dawn',
    name: 'Dawn',
    category: 'Analog',
    editState: {
      // Classic balanced split tone - cyan shadows, warm highlights
      fade: 2,
      curve: {
        rgb: [
          { x: 0, y: 0.016 },
          { x: 0.25, y: 0.231 },
          { x: 0.5, y: 0.588 },
          { x: 0.75, y: 0.839 },
          { x: 1, y: 0.973 },
        ],
        red: [
          { x: 0, y: 0.008 },
          { x: 0.25, y: 0.192 },
          { x: 0.5, y: 0.588 },
          { x: 0.75, y: 0.898 },
          { x: 1, y: 0.984 },
        ],
        green: curves.linear(),
        blue: [
          { x: 0, y: 0.027 },
          { x: 0.25, y: 0.243 },
          { x: 0.5, y: 0.557 },
          { x: 0.75, y: 0.831 },
          { x: 1, y: 0.976 },
        ],
      },
      splitTone: {
        shadowHue: 200,
        shadowSaturation: 24,
        highlightHue: 350,
        highlightSaturation: 16,
        balance: 0,
      },
      hsl: {
        red: { hue: 0, saturation: -5, luminance: 0 },
        orange: { hue: 5, saturation: 10, luminance: 5 },
        yellow: { hue: -5, saturation: -5, luminance: 5 },
        green: { hue: 15, saturation: -15, luminance: 0 },
        aqua: { hue: 10, saturation: 10, luminance: 0 },
        blue: { hue: 0, saturation: 5, luminance: -5 },
        purple: { hue: 5, saturation: 10, luminance: 0 },
        magenta: { hue: 0, saturation: -5, luminance: 0 },
      },
      grain: { amount: 5, size: 25, roughness: 50 },
    },
  },
  {
    id: 'analog-arctic',
    name: 'Arctic',
    category: 'Analog',
    editState: {
      // Cool/blue throughout - strong blue shadows and highlights
      fade: 4,
      curve: {
        rgb: [
          { x: 0, y: 0.035 },
          { x: 0.25, y: 0.259 },
          { x: 0.5, y: 0.576 },
          { x: 0.75, y: 0.820 },
          { x: 1, y: 0.941 },
        ],
        red: [
          { x: 0, y: 0.004 },
          { x: 0.25, y: 0.173 },
          { x: 0.5, y: 0.482 },
          { x: 0.75, y: 0.788 },
          { x: 1, y: 0.898 },
        ],
        green: curves.linear(),
        blue: [
          { x: 0, y: 0.067 },
          { x: 0.25, y: 0.310 },
          { x: 0.5, y: 0.616 },
          { x: 0.75, y: 0.863 },
          { x: 1, y: 0.973 },
        ],
      },
      splitTone: {
        shadowHue: 210,
        shadowSaturation: 35,
        highlightHue: 210,
        highlightSaturation: 20,
        balance: 0,
      },
      hsl: {
        red: { hue: 0, saturation: -10, luminance: 0 },
        orange: { hue: 0, saturation: -5, luminance: 5 },
        yellow: { hue: -10, saturation: -15, luminance: 5 },
        green: { hue: 20, saturation: -20, luminance: 0 },
        aqua: { hue: 0, saturation: 0, luminance: 0 },
        blue: { hue: 0, saturation: 10, luminance: -5 },
        purple: { hue: -5, saturation: 5, luminance: 0 },
        magenta: { hue: -5, saturation: -10, luminance: 0 },
      },
      grain: { amount: 6, size: 25, roughness: 50 },
    },
  },
  {
    id: 'analog-cream',
    name: 'Cream',
    category: 'Analog',
    editState: {
      // Classic film - teal shadows, very warm cream highlights
      fade: 2,
      curve: {
        rgb: [
          { x: 0, y: 0.024 },
          { x: 0.25, y: 0.227 },
          { x: 0.5, y: 0.569 },
          { x: 0.75, y: 0.812 },
          { x: 1, y: 0.918 },
        ],
        red: [
          { x: 0, y: 0.020 },
          { x: 0.25, y: 0.192 },
          { x: 0.5, y: 0.612 },
          { x: 0.75, y: 0.882 },
          { x: 1, y: 0.941 },
        ],
        green: curves.linear(),
        blue: [
          { x: 0, y: 0.024 },
          { x: 0.25, y: 0.216 },
          { x: 0.5, y: 0.498 },
          { x: 0.75, y: 0.722 },
          { x: 1, y: 0.831 },
        ],
      },
      splitTone: {
        shadowHue: 185,
        shadowSaturation: 15,
        highlightHue: 40,
        highlightSaturation: 35,
        balance: 10,
      },
      hsl: {
        red: { hue: 0, saturation: -5, luminance: 0 },
        orange: { hue: 5, saturation: 0, luminance: 5 },
        yellow: { hue: -10, saturation: -15, luminance: 5 },
        green: { hue: 25, saturation: -10, luminance: 0 },
        aqua: { hue: 15, saturation: -15, luminance: 0 },
        blue: { hue: 0, saturation: -10, luminance: -10 },
        purple: { hue: 5, saturation: -5, luminance: 0 },
        magenta: { hue: 0, saturation: -10, luminance: 0 },
      },
      grain: { amount: 5, size: 25, roughness: 50 },
    },
  },
  {
    id: 'analog-ember',
    name: 'Ember',
    category: 'Analog',
    editState: {
      // Inverted - warm sepia shadows, cooler highlights
      fade: 2,
      curve: {
        rgb: [
          { x: 0, y: 0.024 },
          { x: 0.25, y: 0.204 },
          { x: 0.5, y: 0.541 },
          { x: 0.75, y: 0.820 },
          { x: 1, y: 0.976 },
        ],
        red: [
          { x: 0, y: 0.039 },
          { x: 0.25, y: 0.275 },
          { x: 0.5, y: 0.561 },
          { x: 0.75, y: 0.784 },
          { x: 1, y: 0.969 },
        ],
        green: curves.linear(),
        blue: [
          { x: 0, y: 0.008 },
          { x: 0.25, y: 0.169 },
          { x: 0.5, y: 0.529 },
          { x: 0.75, y: 0.816 },
          { x: 1, y: 0.973 },
        ],
      },
      splitTone: {
        shadowHue: 35,
        shadowSaturation: 25,
        highlightHue: 200,
        highlightSaturation: 10,
        balance: -10,
      },
      hsl: {
        red: { hue: 0, saturation: -5, luminance: 0 },
        orange: { hue: 5, saturation: 5, luminance: 5 },
        yellow: { hue: 0, saturation: -5, luminance: 5 },
        green: { hue: 20, saturation: -5, luminance: 0 },
        aqua: { hue: 10, saturation: -10, luminance: 0 },
        blue: { hue: 10, saturation: 5, luminance: -5 },
        purple: { hue: 5, saturation: 10, luminance: 0 },
        magenta: { hue: -5, saturation: -10, luminance: 0 },
      },
      grain: { amount: 5, size: 25, roughness: 50 },
    },
  },
  {
    id: 'analog-dusk',
    name: 'Dusk',
    category: 'Analog',
    editState: {
      // Heavy fade, deep blue - moody preset
      fade: 8,
      curve: {
        rgb: [
          { x: 0, y: 0.078 },
          { x: 0.25, y: 0.192 },
          { x: 0.5, y: 0.549 },
          { x: 0.75, y: 0.824 },
          { x: 1, y: 0.980 },
        ],
        red: [
          { x: 0, y: 0.047 },
          { x: 0.25, y: 0.157 },
          { x: 0.5, y: 0.545 },
          { x: 0.75, y: 0.816 },
          { x: 1, y: 0.976 },
        ],
        green: curves.linear(),
        blue: [
          { x: 0, y: 0.149 },
          { x: 0.25, y: 0.286 },
          { x: 0.5, y: 0.569 },
          { x: 0.75, y: 0.871 },
          { x: 1, y: 0.988 },
        ],
      },
      splitTone: {
        shadowHue: 220,
        shadowSaturation: 40,
        highlightHue: 210,
        highlightSaturation: 15,
        balance: -15,
      },
      hsl: {
        red: { hue: 0, saturation: -15, luminance: 0 },
        orange: { hue: 0, saturation: -10, luminance: 5 },
        yellow: { hue: -5, saturation: -15, luminance: 5 },
        green: { hue: 30, saturation: -15, luminance: 0 },
        aqua: { hue: 15, saturation: 5, luminance: 0 },
        blue: { hue: 5, saturation: 15, luminance: -10 },
        purple: { hue: 10, saturation: 15, luminance: 0 },
        magenta: { hue: 0, saturation: -10, luminance: 0 },
      },
      grain: { amount: 7, size: 26, roughness: 52 },
    },
  },
  {
    id: 'analog-mist',
    name: 'Mist',
    category: 'Analog',
    editState: {
      // Most neutral/clean - subtle fade, minimal toning
      fade: 4,
      curve: {
        rgb: [
          { x: 0, y: 0.039 },
          { x: 0.25, y: 0.208 },
          { x: 0.5, y: 0.573 },
          { x: 0.75, y: 0.827 },
          { x: 1, y: 0.984 },
        ],
        red: [
          { x: 0, y: 0.027 },
          { x: 0.25, y: 0.188 },
          { x: 0.5, y: 0.580 },
          { x: 0.75, y: 0.831 },
          { x: 1, y: 0.992 },
        ],
        green: curves.linear(),
        blue: [
          { x: 0, y: 0.047 },
          { x: 0.25, y: 0.220 },
          { x: 0.5, y: 0.553 },
          { x: 0.75, y: 0.816 },
          { x: 1, y: 0.984 },
        ],
      },
      splitTone: {
        shadowHue: 200,
        shadowSaturation: 10,
        highlightHue: 40,
        highlightSaturation: 5,
        balance: 0,
      },
      hsl: {
        red: { hue: 0, saturation: -5, luminance: 0 },
        orange: { hue: 0, saturation: 5, luminance: 5 },
        yellow: { hue: -5, saturation: -5, luminance: 5 },
        green: { hue: 20, saturation: -10, luminance: 0 },
        aqua: { hue: 10, saturation: 0, luminance: 0 },
        blue: { hue: 5, saturation: 0, luminance: -5 },
        purple: { hue: 5, saturation: 5, luminance: 0 },
        magenta: { hue: 0, saturation: -5, luminance: 0 },
      },
      grain: { amount: 4, size: 24, roughness: 48 },
    },
  },

  // ============ CINEMATIC ============
  {
    id: 'cine-teal-orange',
    name: 'Teal & Orange',
    category: 'Cinematic',
    editState: {
      contrast: 15,
      highlights: -12,
      shadows: -8,
      saturation: -5,
      curve: {
        rgb: curves.sCurve(0.1),
        red: [{ x: 0, y: 0 }, { x: 0.5, y: 0.52 }, { x: 1, y: 1 }],
        green: curves.linear(),
        blue: [{ x: 0, y: 0.05 }, { x: 0.5, y: 0.48 }, { x: 1, y: 0.95 }],
      },
      hsl: {
        red: { hue: 10, saturation: 15, luminance: 0 },
        orange: { hue: 10, saturation: 30, luminance: 5 },
        yellow: { hue: 15, saturation: 20, luminance: 5 },
        green: { hue: -60, saturation: -20, luminance: -5 },
        aqua: { hue: -10, saturation: 30, luminance: -10 },
        blue: { hue: -15, saturation: 25, luminance: -15 },
        purple: { hue: -10, saturation: 10, luminance: -5 },
        magenta: { hue: 0, saturation: 5, luminance: 0 },
      },
      splitTone: {
        highlightHue: 35,
        highlightSaturation: 25,
        shadowHue: 195,
        shadowSaturation: 30,
        balance: 0,
      },
      vignette: { amount: 18, midpoint: 50, roundness: 0, feather: 55 },
    },
  },
  {
    id: 'cine-blockbuster',
    name: 'Blockbuster',
    category: 'Cinematic',
    editState: {
      contrast: 20,
      highlights: -15,
      shadows: -10,
      blacks: -8,
      saturation: -10,
      clarity: 10,
      curve: {
        rgb: curves.highContrast(),
        red: curves.sCurve(0.05),
        green: curves.linear(),
        blue: [{ x: 0, y: 0.03 }, { x: 0.5, y: 0.5 }, { x: 1, y: 0.97 }],
      },
      hsl: {
        red: { hue: 5, saturation: 10, luminance: -5 },
        orange: { hue: 5, saturation: 15, luminance: 0 },
        yellow: { hue: 0, saturation: 0, luminance: 0 },
        green: { hue: -30, saturation: -25, luminance: -10 },
        aqua: { hue: -5, saturation: 20, luminance: -10 },
        blue: { hue: -10, saturation: 15, luminance: -15 },
        purple: { hue: 0, saturation: 5, luminance: -5 },
        magenta: { hue: 0, saturation: 0, luminance: 0 },
      },
      splitTone: {
        highlightHue: 45,
        highlightSaturation: 15,
        shadowHue: 210,
        shadowSaturation: 20,
        balance: -10,
      },
      vignette: { amount: 22, midpoint: 45, roundness: 0, feather: 50 },
    },
  },
  {
    id: 'cine-indie',
    name: 'Indie',
    category: 'Cinematic',
    editState: {
      temperature: -10,
      contrast: 5,
      highlights: -20,
      shadows: 15,
      fade: 12,
      saturation: -25,
      curve: {
        rgb: curves.matte(0.08),
        red: curves.linear(),
        green: [{ x: 0, y: 0.02 }, { x: 1, y: 1 }],
        blue: [{ x: 0, y: 0.05 }, { x: 1, y: 1 }],
      },
      hsl: {
        red: { hue: 0, saturation: -15, luminance: 0 },
        orange: { hue: -5, saturation: -10, luminance: 5 },
        yellow: { hue: -10, saturation: -15, luminance: 5 },
        green: { hue: 0, saturation: -25, luminance: 0 },
        aqua: { hue: 5, saturation: -10, luminance: 0 },
        blue: { hue: 0, saturation: -5, luminance: -5 },
        purple: { hue: 0, saturation: -10, luminance: 0 },
        magenta: { hue: 0, saturation: -15, luminance: 0 },
      },
      grain: { amount: 18, size: 28, roughness: 55 },
      vignette: { amount: 15, midpoint: 55, roundness: 0, feather: 60 },
    },
  },
  {
    id: 'cine-noir',
    name: 'Neo Noir',
    category: 'Cinematic',
    editState: {
      exposure: -0.15,
      contrast: 25,
      highlights: -10,
      shadows: -20,
      blacks: -15,
      saturation: -40,
      curve: {
        rgb: curves.highContrast(),
        red: curves.linear(),
        green: curves.linear(),
        blue: [{ x: 0, y: 0.05 }, { x: 0.5, y: 0.52 }, { x: 1, y: 1 }],
      },
      hsl: {
        red: { hue: 0, saturation: 20, luminance: -10 },
        orange: { hue: 0, saturation: -20, luminance: 0 },
        yellow: { hue: 0, saturation: -30, luminance: 0 },
        green: { hue: 0, saturation: -40, luminance: -10 },
        aqua: { hue: 0, saturation: -30, luminance: -5 },
        blue: { hue: 10, saturation: 30, luminance: -15 },
        purple: { hue: 10, saturation: 20, luminance: -10 },
        magenta: { hue: 0, saturation: -10, luminance: -5 },
      },
      splitTone: {
        highlightHue: 220,
        highlightSaturation: 10,
        shadowHue: 240,
        shadowSaturation: 15,
        balance: -20,
      },
      vignette: { amount: 35, midpoint: 35, roundness: 0, feather: 45 },
    },
  },

  // ============ PORTRAIT ============
  {
    id: 'portrait-soft',
    name: 'Soft Glow',
    category: 'Portrait',
    editState: {
      exposure: 0.15,
      contrast: -15,
      highlights: -25,
      shadows: 20,
      clarity: -15,
      saturation: -8,
      curve: {
        rgb: curves.lowContrast(),
        red: [{ x: 0, y: 0.05 }, { x: 0.5, y: 0.52 }, { x: 1, y: 0.98 }],
        green: curves.linear(),
        blue: [{ x: 0, y: 0.03 }, { x: 1, y: 0.97 }],
      },
      hsl: {
        red: { hue: 5, saturation: -10, luminance: 5 },
        orange: { hue: 5, saturation: 5, luminance: 8 },
        yellow: { hue: 0, saturation: -10, luminance: 5 },
        green: { hue: 0, saturation: -15, luminance: 0 },
        aqua: { hue: 0, saturation: -10, luminance: 0 },
        blue: { hue: 0, saturation: -15, luminance: 0 },
        purple: { hue: 0, saturation: -10, luminance: 0 },
        magenta: { hue: 5, saturation: -5, luminance: 0 },
      },
      skinTone: { hue: 5, saturation: -10, luminance: 8 },
      bloom: { amount: 15, threshold: 80, radius: 40 },
    },
  },
  {
    id: 'portrait-warm',
    name: 'Warm Portrait',
    category: 'Portrait',
    editState: {
      temperature: 15,
      exposure: 0.1,
      contrast: 5,
      highlights: -15,
      shadows: 10,
      vibrance: -5,
      curve: {
        rgb: curves.sCurve(0.05),
        red: [{ x: 0, y: 0 }, { x: 0.5, y: 0.53 }, { x: 1, y: 1 }],
        green: curves.linear(),
        blue: [{ x: 0, y: 0 }, { x: 0.5, y: 0.47 }, { x: 1, y: 0.97 }],
      },
      hsl: {
        red: { hue: 5, saturation: 5, luminance: 0 },
        orange: { hue: 8, saturation: 15, luminance: 8 },
        yellow: { hue: 5, saturation: 10, luminance: 5 },
        green: { hue: 10, saturation: -15, luminance: 0 },
        aqua: { hue: 0, saturation: -20, luminance: 0 },
        blue: { hue: 0, saturation: -15, luminance: -5 },
        purple: { hue: 0, saturation: -10, luminance: 0 },
        magenta: { hue: 5, saturation: 5, luminance: 0 },
      },
      skinTone: { hue: 8, saturation: 10, luminance: 10 },
      vignette: { amount: 12, midpoint: 55, roundness: 0, feather: 65 },
    },
  },
  {
    id: 'portrait-clean',
    name: 'Clean',
    category: 'Portrait',
    editState: {
      exposure: 0.1,
      contrast: 8,
      highlights: -12,
      shadows: 8,
      whites: 5,
      clarity: 8,
      vibrance: 10,
      curve: {
        rgb: curves.sCurve(0.04),
        red: curves.linear(),
        green: curves.linear(),
        blue: curves.linear(),
      },
      hsl: {
        red: { hue: 0, saturation: 5, luminance: 0 },
        orange: { hue: 3, saturation: 8, luminance: 5 },
        yellow: { hue: 0, saturation: 0, luminance: 3 },
        green: { hue: 5, saturation: 5, luminance: 0 },
        aqua: { hue: 0, saturation: 5, luminance: 0 },
        blue: { hue: 0, saturation: 5, luminance: 0 },
        purple: { hue: 0, saturation: 0, luminance: 0 },
        magenta: { hue: 0, saturation: 5, luminance: 0 },
      },
      skinTone: { hue: 0, saturation: -5, luminance: 5 },
      sharpening: { amount: 25, radius: 1, detail: 50 },
    },
  },

  // ============ MOODY ============
  {
    id: 'moody-dark',
    name: 'Dark',
    category: 'Moody',
    editState: {
      exposure: -0.3,
      contrast: 18,
      highlights: -20,
      shadows: -18,
      blacks: -12,
      saturation: -20,
      curve: {
        rgb: curves.crushedBlacks(0.08),
        red: curves.linear(),
        green: curves.linear(),
        blue: [{ x: 0, y: 0.03 }, { x: 1, y: 1 }],
      },
      hsl: {
        red: { hue: 0, saturation: -10, luminance: -10 },
        orange: { hue: 0, saturation: -15, luminance: -5 },
        yellow: { hue: 0, saturation: -20, luminance: -5 },
        green: { hue: 0, saturation: -25, luminance: -10 },
        aqua: { hue: 5, saturation: -15, luminance: -5 },
        blue: { hue: 5, saturation: 10, luminance: -15 },
        purple: { hue: 0, saturation: 5, luminance: -10 },
        magenta: { hue: 0, saturation: -10, luminance: -5 },
      },
      vignette: { amount: 28, midpoint: 40, roundness: 0, feather: 50 },
    },
  },
  {
    id: 'moody-fog',
    name: 'Fog',
    category: 'Moody',
    editState: {
      contrast: -25,
      highlights: -30,
      shadows: 25,
      fade: 25,
      saturation: -30,
      clarity: -20,
      curve: {
        rgb: [{ x: 0, y: 0.15 }, { x: 0.5, y: 0.52 }, { x: 1, y: 0.88 }],
        red: curves.linear(),
        green: curves.linear(),
        blue: [{ x: 0, y: 0.05 }, { x: 1, y: 1 }],
      },
      hsl: {
        red: { hue: 0, saturation: -20, luminance: 0 },
        orange: { hue: -5, saturation: -25, luminance: 5 },
        yellow: { hue: -5, saturation: -30, luminance: 5 },
        green: { hue: 0, saturation: -35, luminance: 0 },
        aqua: { hue: 5, saturation: -20, luminance: 0 },
        blue: { hue: 5, saturation: -15, luminance: 0 },
        purple: { hue: 0, saturation: -20, luminance: 0 },
        magenta: { hue: 0, saturation: -25, luminance: 0 },
      },
      splitTone: {
        highlightHue: 200,
        highlightSaturation: 12,
        shadowHue: 220,
        shadowSaturation: 15,
        balance: 0,
      },
    },
  },
  {
    id: 'moody-cold',
    name: 'Cold',
    category: 'Moody',
    editState: {
      temperature: -20,
      tint: -5,
      exposure: -0.15,
      contrast: 12,
      highlights: -15,
      shadows: -10,
      saturation: -15,
      curve: {
        rgb: curves.sCurve(0.08),
        red: [{ x: 0, y: 0 }, { x: 0.5, y: 0.47 }, { x: 1, y: 0.97 }],
        green: curves.linear(),
        blue: [{ x: 0, y: 0.05 }, { x: 0.5, y: 0.55 }, { x: 1, y: 1 }],
      },
      hsl: {
        red: { hue: -10, saturation: -20, luminance: -5 },
        orange: { hue: -10, saturation: -25, luminance: 0 },
        yellow: { hue: -15, saturation: -30, luminance: 0 },
        green: { hue: 10, saturation: -15, luminance: -5 },
        aqua: { hue: 5, saturation: 15, luminance: 0 },
        blue: { hue: 5, saturation: 20, luminance: -5 },
        purple: { hue: 5, saturation: 10, luminance: 0 },
        magenta: { hue: -5, saturation: -10, luminance: 0 },
      },
      splitTone: {
        highlightHue: 210,
        highlightSaturation: 15,
        shadowHue: 230,
        shadowSaturation: 20,
        balance: -15,
      },
      vignette: { amount: 20, midpoint: 45, roundness: 0, feather: 55 },
    },
  },

  // ============ VIBRANT ============
  {
    id: 'vibrant-pop',
    name: 'Pop',
    category: 'Vibrant',
    editState: {
      contrast: 18,
      highlights: -10,
      shadows: 8,
      vibrance: 35,
      saturation: 15,
      clarity: 15,
      curve: {
        rgb: curves.sCurve(0.12),
        red: curves.sCurve(0.05),
        green: curves.sCurve(0.05),
        blue: curves.sCurve(0.05),
      },
      hsl: {
        red: { hue: 0, saturation: 15, luminance: 0 },
        orange: { hue: 5, saturation: 20, luminance: 5 },
        yellow: { hue: 0, saturation: 20, luminance: 5 },
        green: { hue: 5, saturation: 25, luminance: 0 },
        aqua: { hue: 0, saturation: 25, luminance: -5 },
        blue: { hue: 0, saturation: 25, luminance: -5 },
        purple: { hue: 0, saturation: 15, luminance: 0 },
        magenta: { hue: 0, saturation: 20, luminance: 0 },
      },
    },
  },
  {
    id: 'vibrant-golden',
    name: 'Golden Hour',
    category: 'Vibrant',
    editState: {
      temperature: 25,
      exposure: 0.1,
      contrast: 10,
      highlights: -15,
      shadows: 15,
      vibrance: 20,
      saturation: 12,
      curve: {
        rgb: curves.sCurve(0.06),
        red: [{ x: 0, y: 0 }, { x: 0.5, y: 0.55 }, { x: 1, y: 1 }],
        green: [{ x: 0, y: 0 }, { x: 0.5, y: 0.52 }, { x: 1, y: 1 }],
        blue: [{ x: 0, y: 0 }, { x: 0.5, y: 0.45 }, { x: 1, y: 0.95 }],
      },
      hsl: {
        red: { hue: 5, saturation: 15, luminance: 0 },
        orange: { hue: 10, saturation: 30, luminance: 8 },
        yellow: { hue: 5, saturation: 25, luminance: 10 },
        green: { hue: 10, saturation: 10, luminance: 5 },
        aqua: { hue: 0, saturation: -10, luminance: 0 },
        blue: { hue: 0, saturation: -15, luminance: -5 },
        purple: { hue: 10, saturation: 10, luminance: 0 },
        magenta: { hue: 10, saturation: 15, luminance: 0 },
      },
      splitTone: {
        highlightHue: 50,
        highlightSaturation: 25,
        shadowHue: 35,
        shadowSaturation: 20,
        balance: 20,
      },
    },
  },
  {
    id: 'vibrant-summer',
    name: 'Summer',
    category: 'Vibrant',
    editState: {
      temperature: 12,
      exposure: 0.15,
      contrast: 8,
      highlights: -12,
      shadows: 12,
      vibrance: 25,
      saturation: 10,
      curve: {
        rgb: curves.sCurve(0.05),
        red: curves.linear(),
        green: [{ x: 0, y: 0 }, { x: 0.5, y: 0.52 }, { x: 1, y: 1 }],
        blue: curves.linear(),
      },
      hsl: {
        red: { hue: 0, saturation: 10, luminance: 0 },
        orange: { hue: 5, saturation: 20, luminance: 5 },
        yellow: { hue: 0, saturation: 25, luminance: 8 },
        green: { hue: 5, saturation: 20, luminance: 5 },
        aqua: { hue: -5, saturation: 25, luminance: 0 },
        blue: { hue: 0, saturation: 20, luminance: -5 },
        purple: { hue: 0, saturation: 10, luminance: 0 },
        magenta: { hue: 5, saturation: 15, luminance: 0 },
      },
    },
  },

  // ============ B&W ============
  {
    id: 'bw-classic',
    name: 'Classic',
    category: 'B&W',
    editState: {
      convertToGrayscale: true,
      contrast: 15,
      highlights: -10,
      shadows: 8,
      curve: {
        rgb: curves.sCurve(0.08),
        red: curves.linear(),
        green: curves.linear(),
        blue: curves.linear(),
      },
      grayMixer: {
        red: 10,
        orange: 15,
        yellow: 10,
        green: -10,
        aqua: -15,
        blue: -20,
        purple: -10,
        magenta: 5,
      },
      grain: { amount: 12, size: 22, roughness: 55 },
    },
  },
  {
    id: 'bw-high-contrast',
    name: 'High Contrast',
    category: 'B&W',
    editState: {
      convertToGrayscale: true,
      contrast: 35,
      highlights: -8,
      shadows: -20,
      blacks: -15,
      clarity: 20,
      curve: {
        rgb: curves.highContrast(),
        red: curves.linear(),
        green: curves.linear(),
        blue: curves.linear(),
      },
      grayMixer: {
        red: 20,
        orange: 25,
        yellow: 15,
        green: -5,
        aqua: -20,
        blue: -30,
        purple: -15,
        magenta: 10,
      },
      grain: { amount: 8, size: 18, roughness: 45 },
    },
  },
  {
    id: 'bw-soft',
    name: 'Soft',
    category: 'B&W',
    editState: {
      convertToGrayscale: true,
      contrast: -10,
      highlights: -25,
      shadows: 25,
      fade: 12,
      curve: {
        rgb: curves.lowContrast(),
        red: curves.linear(),
        green: curves.linear(),
        blue: curves.linear(),
      },
      grayMixer: {
        red: 5,
        orange: 10,
        yellow: 10,
        green: 5,
        aqua: 0,
        blue: -5,
        purple: 0,
        magenta: 5,
      },
      grain: { amount: 15, size: 28, roughness: 60 },
    },
  },
  {
    id: 'bw-noir',
    name: 'Noir',
    category: 'B&W',
    editState: {
      convertToGrayscale: true,
      exposure: -0.2,
      contrast: 30,
      highlights: -15,
      shadows: -30,
      blacks: -20,
      curve: {
        rgb: [{ x: 0, y: 0 }, { x: 0.15, y: 0.02 }, { x: 0.85, y: 0.95 }, { x: 1, y: 1 }],
        red: curves.linear(),
        green: curves.linear(),
        blue: curves.linear(),
      },
      grayMixer: {
        red: 30,
        orange: 20,
        yellow: 10,
        green: -20,
        aqua: -30,
        blue: -40,
        purple: -20,
        magenta: 15,
      },
      vignette: { amount: 40, midpoint: 30, roundness: 0, feather: 40 },
      grain: { amount: 18, size: 25, roughness: 65 },
    },
  },

  // ============ VINTAGE ============
  {
    id: 'vintage-70s',
    name: '70s',
    category: 'Vintage',
    editState: {
      temperature: 18,
      contrast: -10,
      highlights: -18,
      shadows: 10,
      fade: 18,
      saturation: -12,
      curve: {
        rgb: curves.matte(0.08),
        red: [{ x: 0, y: 0.05 }, { x: 0.5, y: 0.55 }, { x: 1, y: 1 }],
        green: [{ x: 0, y: 0.03 }, { x: 0.5, y: 0.5 }, { x: 1, y: 0.97 }],
        blue: [{ x: 0, y: 0 }, { x: 0.5, y: 0.45 }, { x: 1, y: 0.9 }],
      },
      hsl: {
        red: { hue: 5, saturation: -5, luminance: 0 },
        orange: { hue: 10, saturation: 15, luminance: 5 },
        yellow: { hue: 10, saturation: 10, luminance: 10 },
        green: { hue: 20, saturation: -20, luminance: -5 },
        aqua: { hue: 10, saturation: -25, luminance: -5 },
        blue: { hue: 0, saturation: -30, luminance: -10 },
        purple: { hue: 10, saturation: -15, luminance: -5 },
        magenta: { hue: 5, saturation: -10, luminance: 0 },
      },
      splitTone: {
        highlightHue: 55,
        highlightSaturation: 25,
        shadowHue: 35,
        shadowSaturation: 30,
        balance: 5,
      },
      grain: { amount: 22, size: 32, roughness: 65 },
      vignette: { amount: 20, midpoint: 45, roundness: 0, feather: 50 },
    },
  },
  {
    id: 'vintage-polaroid',
    name: 'Polaroid',
    category: 'Vintage',
    editState: {
      temperature: 12,
      tint: -8,
      contrast: -8,
      highlights: -15,
      shadows: 15,
      fade: 12,
      saturation: -10,
      curve: {
        rgb: curves.matte(0.06),
        red: [{ x: 0, y: 0.03 }, { x: 0.5, y: 0.53 }, { x: 1, y: 0.98 }],
        green: [{ x: 0, y: 0.02 }, { x: 0.5, y: 0.5 }, { x: 1, y: 0.97 }],
        blue: [{ x: 0, y: 0 }, { x: 0.5, y: 0.48 }, { x: 1, y: 0.95 }],
      },
      hsl: {
        red: { hue: 5, saturation: 5, luminance: 0 },
        orange: { hue: 5, saturation: 10, luminance: 5 },
        yellow: { hue: 0, saturation: -5, luminance: 8 },
        green: { hue: 30, saturation: -15, luminance: 0 },
        aqua: { hue: 20, saturation: -10, luminance: 0 },
        blue: { hue: -10, saturation: 10, luminance: -5 },
        purple: { hue: -5, saturation: 5, luminance: 0 },
        magenta: { hue: 5, saturation: 10, luminance: 0 },
      },
      splitTone: {
        highlightHue: 50,
        highlightSaturation: 15,
        shadowHue: 180,
        shadowSaturation: 18,
        balance: -10,
      },
      grain: { amount: 18, size: 30, roughness: 55 },
      border: { size: 6, color: '#f5f0e6', opacity: 100 },
    },
  },
  {
    id: 'vintage-sepia',
    name: 'Sepia',
    category: 'Vintage',
    editState: {
      temperature: 25,
      saturation: -50,
      contrast: 5,
      highlights: -10,
      fade: 8,
      curve: {
        rgb: curves.sCurve(0.05),
        red: [{ x: 0, y: 0.02 }, { x: 0.5, y: 0.55 }, { x: 1, y: 1 }],
        green: [{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }, { x: 1, y: 0.97 }],
        blue: [{ x: 0, y: 0 }, { x: 0.5, y: 0.42 }, { x: 1, y: 0.88 }],
      },
      splitTone: {
        highlightHue: 45,
        highlightSaturation: 30,
        shadowHue: 35,
        shadowSaturation: 40,
        balance: 0,
      },
      grain: { amount: 15, size: 25, roughness: 55 },
      vignette: { amount: 15, midpoint: 50, roundness: 0, feather: 55 },
    },
  },

  // ============ CLEAN ============
  {
    id: 'clean-bright',
    name: 'Bright',
    category: 'Clean',
    editState: {
      exposure: 0.25,
      contrast: -10,
      highlights: -30,
      shadows: 25,
      whites: 12,
      vibrance: 8,
      curve: {
        rgb: [{ x: 0, y: 0.03 }, { x: 0.25, y: 0.28 }, { x: 0.75, y: 0.78 }, { x: 1, y: 1 }],
        red: curves.linear(),
        green: curves.linear(),
        blue: curves.linear(),
      },
      hsl: {
        red: { hue: 0, saturation: 5, luminance: 3 },
        orange: { hue: 0, saturation: 5, luminance: 5 },
        yellow: { hue: 0, saturation: 5, luminance: 5 },
        green: { hue: 0, saturation: 5, luminance: 3 },
        aqua: { hue: 0, saturation: 5, luminance: 3 },
        blue: { hue: 0, saturation: 5, luminance: 0 },
        purple: { hue: 0, saturation: 0, luminance: 0 },
        magenta: { hue: 0, saturation: 5, luminance: 0 },
      },
    },
  },
  {
    id: 'clean-crisp',
    name: 'Crisp',
    category: 'Clean',
    editState: {
      contrast: 12,
      highlights: -15,
      shadows: 10,
      clarity: 18,
      vibrance: 10,
      curve: {
        rgb: curves.sCurve(0.06),
        red: curves.linear(),
        green: curves.linear(),
        blue: curves.linear(),
      },
      hsl: {
        red: { hue: 0, saturation: 5, luminance: 0 },
        orange: { hue: 0, saturation: 8, luminance: 0 },
        yellow: { hue: 0, saturation: 5, luminance: 0 },
        green: { hue: 0, saturation: 8, luminance: 0 },
        aqua: { hue: 0, saturation: 8, luminance: 0 },
        blue: { hue: 0, saturation: 10, luminance: -3 },
        purple: { hue: 0, saturation: 5, luminance: 0 },
        magenta: { hue: 0, saturation: 5, luminance: 0 },
      },
      sharpening: { amount: 35, radius: 1, detail: 50 },
    },
  },
  {
    id: 'clean-minimal',
    name: 'Minimal',
    category: 'Clean',
    editState: {
      contrast: -8,
      highlights: -20,
      shadows: 15,
      saturation: -25,
      fade: 10,
      curve: {
        rgb: curves.lowContrast(),
        red: curves.linear(),
        green: curves.linear(),
        blue: curves.linear(),
      },
      hsl: {
        red: { hue: 0, saturation: -15, luminance: 0 },
        orange: { hue: 0, saturation: -15, luminance: 3 },
        yellow: { hue: 0, saturation: -20, luminance: 3 },
        green: { hue: 0, saturation: -20, luminance: 0 },
        aqua: { hue: 0, saturation: -15, luminance: 0 },
        blue: { hue: 0, saturation: -15, luminance: 0 },
        purple: { hue: 0, saturation: -10, luminance: 0 },
        magenta: { hue: 0, saturation: -15, luminance: 0 },
      },
    },
  },
];

// Apply preset to get new edit state
export function applyPreset(preset: BuiltInPreset): Partial<EditState> {
  const defaultState = createDefaultEditState();
  const result: Partial<EditState> = { ...preset.editState };

  // Merge nested objects with defaults if partially specified
  if (preset.editState.grain) {
    result.grain = { ...defaultState.grain, ...preset.editState.grain };
  }
  if (preset.editState.vignette) {
    result.vignette = { ...defaultState.vignette, ...preset.editState.vignette };
  }
  if (preset.editState.splitTone) {
    result.splitTone = { ...defaultState.splitTone, ...preset.editState.splitTone };
  }
  if (preset.editState.sharpening) {
    result.sharpening = { ...defaultState.sharpening, ...preset.editState.sharpening };
  }
  if (preset.editState.skinTone) {
    result.skinTone = { ...defaultState.skinTone, ...preset.editState.skinTone };
  }
  if (preset.editState.border) {
    result.border = { ...defaultState.border, ...preset.editState.border };
  }
  if (preset.editState.bloom) {
    result.bloom = { ...defaultState.bloom, ...preset.editState.bloom };
  }
  if (preset.editState.grayMixer) {
    result.grayMixer = { ...defaultState.grayMixer, ...preset.editState.grayMixer };
  }
  if (preset.editState.curve) {
    result.curve = { ...defaultState.curve, ...preset.editState.curve };
  }
  if (preset.editState.hsl) {
    result.hsl = { ...defaultState.hsl };
    for (const color of Object.keys(preset.editState.hsl) as Array<keyof typeof preset.editState.hsl>) {
      result.hsl[color] = { ...defaultState.hsl[color], ...preset.editState.hsl[color] };
    }
  }

  // Clear any LUT reference (we're fully parametric now)
  result.lutId = null;
  result.lutIntensity = 100;

  return result;
}

// Get preset categories
export function getPresetCategories(): string[] {
  const categories = new Set(PRESETS.map((p) => p.category));
  return Array.from(categories);
}

// Get presets by category
export function getPresetsByCategory(category: string): BuiltInPreset[] {
  return PRESETS.filter((p) => p.category === category);
}

// Legacy type alias for backwards compatibility
export type Preset = BuiltInPreset;
