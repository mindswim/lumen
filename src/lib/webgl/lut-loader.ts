// LUT file parser for .cube format
// Supports 1D and 3D LUTs

export interface LUTData {
  size: number;
  data: Uint8Array;
  title?: string;
}

export async function parseCubeFile(content: string): Promise<LUTData> {
  const lines = content.split('\n');
  let size = 0;
  let title = '';
  const values: number[] = [];
  let domainMin = [0, 0, 0];
  let domainMax = [1, 1, 1];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Parse header
    if (trimmed.startsWith('TITLE')) {
      title = trimmed.replace('TITLE', '').trim().replace(/"/g, '');
      continue;
    }

    if (trimmed.startsWith('LUT_3D_SIZE')) {
      size = parseInt(trimmed.split(/\s+/)[1], 10);
      continue;
    }

    if (trimmed.startsWith('DOMAIN_MIN')) {
      const parts = trimmed.split(/\s+/).slice(1).map(parseFloat);
      domainMin = parts;
      continue;
    }

    if (trimmed.startsWith('DOMAIN_MAX')) {
      const parts = trimmed.split(/\s+/).slice(1).map(parseFloat);
      domainMax = parts;
      continue;
    }

    // Parse data values
    const parts = trimmed.split(/\s+/).map(parseFloat);
    if (parts.length >= 3 && !isNaN(parts[0])) {
      // Normalize to 0-1 range based on domain
      const r = (parts[0] - domainMin[0]) / (domainMax[0] - domainMin[0]);
      const g = (parts[1] - domainMin[1]) / (domainMax[1] - domainMin[1]);
      const b = (parts[2] - domainMin[2]) / (domainMax[2] - domainMin[2]);
      values.push(r, g, b);
    }
  }

  if (size === 0) {
    throw new Error('Invalid .cube file: LUT_3D_SIZE not found');
  }

  const expectedValues = size * size * size * 3;
  if (values.length !== expectedValues) {
    throw new Error(
      `Invalid .cube file: expected ${expectedValues} values, got ${values.length}`
    );
  }

  // Convert to RGBA Uint8Array for texture
  // LUT is stored as horizontal strips: [size x size] strips, [size] rows
  const data = new Uint8Array(size * size * size * 4);

  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        // .cube format ordering: R varies fastest, then G, then B
        const srcIdx = (b * size * size + g * size + r) * 3;
        // Output format: horizontal strips
        const dstIdx = (g * size * size + b * size + r) * 4;

        data[dstIdx + 0] = Math.round(Math.max(0, Math.min(1, values[srcIdx + 0])) * 255);
        data[dstIdx + 1] = Math.round(Math.max(0, Math.min(1, values[srcIdx + 1])) * 255);
        data[dstIdx + 2] = Math.round(Math.max(0, Math.min(1, values[srcIdx + 2])) * 255);
        data[dstIdx + 3] = 255;
      }
    }
  }

  return { size, data, title };
}

export async function loadLUTFromURL(url: string): Promise<LUTData> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load LUT: ${response.statusText}`);
  }
  const content = await response.text();
  return parseCubeFile(content);
}

// Generate a simple programmatic LUT (for presets without external files)
export function generateColorGradeLUT(
  size: number,
  transform: (r: number, g: number, b: number) => [number, number, number]
): LUTData {
  const data = new Uint8Array(size * size * size * 4);

  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const rNorm = r / (size - 1);
        const gNorm = g / (size - 1);
        const bNorm = b / (size - 1);

        const [rOut, gOut, bOut] = transform(rNorm, gNorm, bNorm);

        const dstIdx = (g * size * size + b * size + r) * 4;
        data[dstIdx + 0] = Math.round(Math.max(0, Math.min(1, rOut)) * 255);
        data[dstIdx + 1] = Math.round(Math.max(0, Math.min(1, gOut)) * 255);
        data[dstIdx + 2] = Math.round(Math.max(0, Math.min(1, bOut)) * 255);
        data[dstIdx + 3] = 255;
      }
    }
  }

  return { size, data };
}

// Helper: lift shadows (raise black point)
function liftShadows(x: number, amount: number): number {
  return x * (1 - amount) + amount;
}

// Helper: fade highlights (lower white point)
function fadeHighlights(x: number, amount: number): number {
  return x * (1 - amount);
}

// Helper: adjust saturation
function adjustSaturation(r: number, g: number, b: number, amount: number): [number, number, number] {
  const lum = r * 0.299 + g * 0.587 + b * 0.114;
  return [
    lum + (r - lum) * amount,
    lum + (g - lum) * amount,
    lum + (b - lum) * amount,
  ];
}

// Preset LUT generators - VSCO-inspired film looks
export const PRESET_LUTS = {
  // ============ A SERIES - Analog Film ============

  // A1: Classic analog - warm, faded, slightly desaturated
  a1: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const lift = 0.06;
      const [rs, gs, bs] = adjustSaturation(r, g, b, 0.85);
      return [
        liftShadows(Math.pow(rs, 0.95), lift) + 0.03,
        liftShadows(Math.pow(gs, 0.98), lift),
        liftShadows(Math.pow(bs, 1.05), lift) - 0.02,
      ];
    }),

  // A4: Cool pastel - lifted blacks, blue-ish shadows, soft
  a4: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      const lift = 0.08;
      const shadowTint = (1 - Math.pow(lum, 0.5)) * 0.04;
      const [rs, gs, bs] = adjustSaturation(r, g, b, 0.8);
      return [
        liftShadows(rs, lift) - shadowTint * 0.5,
        liftShadows(gs, lift) + shadowTint * 0.3,
        liftShadows(bs, lift) + shadowTint,
      ];
    }),

  // A6: Vivid analog - punchy with faded shadows
  a6: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const lift = 0.05;
      const [rs, gs, bs] = adjustSaturation(r, g, b, 1.15);
      return [
        liftShadows(Math.pow(rs, 0.92), lift),
        liftShadows(Math.pow(gs, 0.95), lift),
        liftShadows(Math.pow(bs, 1.0), lift),
      ];
    }),

  // ============ C SERIES - Chrome/Vivid ============

  // C1: Cool chrome - desaturated, lifted, slight blue cast
  c1: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const lift = 0.1;
      const [rs, gs, bs] = adjustSaturation(r, g, b, 0.75);
      return [
        liftShadows(rs, lift) - 0.02,
        liftShadows(gs, lift),
        liftShadows(bs, lift) + 0.03,
      ];
    }),

  // C3: Warm chrome - warm highlights, cool shadows
  c3: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      const lift = 0.07;
      const warmHighlight = Math.pow(lum, 2) * 0.08;
      const coolShadow = (1 - Math.pow(lum, 0.5)) * 0.06;
      return [
        liftShadows(r, lift) + warmHighlight - coolShadow * 0.3,
        liftShadows(g, lift) + warmHighlight * 0.5,
        liftShadows(b, lift) - warmHighlight * 0.3 + coolShadow,
      ];
    }),

  // ============ F SERIES - Film ============

  // F2: Filmic - contrasty, warm, classic film look
  f2: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const lift = 0.04;
      // Slight S-curve
      const rc = Math.pow(r, 0.9);
      const gc = Math.pow(g, 0.95);
      const bc = Math.pow(b, 1.05);
      return [
        liftShadows(rc, lift) + 0.02,
        liftShadows(gc, lift),
        liftShadows(bc, lift) - 0.03,
      ];
    }),

  // ============ G SERIES - Portrait ============

  // G3: Portrait - warm skin tones, soft contrast
  g3: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const lift = 0.05;
      // Detect skin tones (orange-ish) and warm them
      const isSkinTone = r > g && g > b && (r - b) > 0.1;
      const skinWarm = isSkinTone ? 0.03 : 0;
      return [
        liftShadows(Math.pow(r, 0.95), lift) + 0.02 + skinWarm,
        liftShadows(Math.pow(g, 0.98), lift) + skinWarm * 0.5,
        liftShadows(Math.pow(b, 1.02), lift) - 0.02,
      ];
    }),

  // ============ M SERIES - Moody ============

  // M3: Moody - desaturated, dramatic shadows
  m3: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const [rs, gs, bs] = adjustSaturation(r, g, b, 0.7);
      const crush = 0.03;
      return [
        Math.max(0, Math.pow(rs, 1.1) - crush),
        Math.max(0, Math.pow(gs, 1.1) - crush),
        Math.max(0, Math.pow(bs, 1.05) - crush) + 0.02,
      ];
    }),

  // M5: Faded moody - lifted blacks, cool, subdued
  m5: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const lift = 0.12;
      const [rs, gs, bs] = adjustSaturation(r, g, b, 0.65);
      return [
        fadeHighlights(liftShadows(rs, lift), 0.05),
        fadeHighlights(liftShadows(gs, lift), 0.05) + 0.01,
        fadeHighlights(liftShadows(bs, lift), 0.05) + 0.03,
      ];
    }),

  // ============ P SERIES - Pastel ============

  // P5: Soft pastel - washed out, airy, light
  p5: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const lift = 0.15;
      const [rs, gs, bs] = adjustSaturation(r, g, b, 0.6);
      return [
        fadeHighlights(liftShadows(rs, lift), 0.08) + 0.02,
        fadeHighlights(liftShadows(gs, lift), 0.08),
        fadeHighlights(liftShadows(bs, lift), 0.08) + 0.01,
      ];
    }),

  // ============ KS SERIES - Kodak Style ============

  // KS1: Kodak Portra inspired - natural, slightly warm
  ks1: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const lift = 0.03;
      return [
        liftShadows(Math.pow(r, 0.97), lift) + 0.015,
        liftShadows(Math.pow(g, 1.0), lift) + 0.005,
        liftShadows(Math.pow(b, 1.03), lift) - 0.01,
      ];
    }),

  // KS2: Kodak Gold inspired - warm, saturated
  ks2: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const lift = 0.02;
      const [rs, gs, bs] = adjustSaturation(r, g, b, 1.1);
      return [
        liftShadows(rs, lift) + 0.04,
        liftShadows(gs, lift) + 0.02,
        liftShadows(Math.pow(bs, 1.1), lift) - 0.03,
      ];
    }),

  // ============ FJ SERIES - Fuji Style ============

  // FJ1: Fuji Pro inspired - greens pop, natural skin
  fj1: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const lift = 0.03;
      // Boost greens slightly
      const greenBoost = g > r && g > b ? 0.04 : 0;
      return [
        liftShadows(r, lift),
        liftShadows(g, lift) + greenBoost,
        liftShadows(Math.pow(b, 1.02), lift) + 0.01,
      ];
    }),

  // FJ2: Fuji Velvia inspired - vivid, punchy
  fj2: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const [rs, gs, bs] = adjustSaturation(r, g, b, 1.25);
      return [
        Math.pow(rs, 0.92),
        Math.pow(gs, 0.95),
        Math.pow(bs, 0.98),
      ];
    }),

  // ============ HB SERIES - Urban/Hypebeast ============

  // HB1: Urban - teal shadows, orange highlights
  hb1: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      const tealAmount = (1 - Math.pow(lum, 0.5)) * 0.08;
      const orangeAmount = Math.pow(lum, 2) * 0.1;
      return [
        r - tealAmount * 0.5 + orangeAmount,
        g + tealAmount * 0.3 + orangeAmount * 0.3,
        b + tealAmount - orangeAmount * 0.5,
      ];
    }),

  // HB2: High contrast urban
  hb2: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const rc = Math.pow(r, 0.85);
      const gc = Math.pow(g, 0.88);
      const bc = Math.pow(b, 0.92);
      const lum = rc * 0.299 + gc * 0.587 + bc * 0.114;
      const teal = (1 - lum) * 0.05;
      return [
        rc - teal * 0.3,
        gc + teal * 0.2,
        bc + teal,
      ];
    }),

  // ============ CLASSIC PRESETS (kept for backwards compat) ============

  // Warm vintage look
  warmVintage: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const lift = 0.05;
      const warmth = 0.1;
      return [
        Math.pow(r, 0.95) * (1 - lift) + lift + warmth * 0.5,
        Math.pow(g, 1.0) * (1 - lift) + lift,
        Math.pow(b, 1.05) * (1 - lift * 0.5) + lift * 0.5 - warmth * 0.3,
      ];
    }),

  // Cool cinematic
  coolCinematic: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      const teal = [0.0, 0.1, 0.15];
      const orange = [0.15, 0.05, -0.1];
      const shadowMix = 1 - Math.pow(lum, 0.5);
      const highlightMix = Math.pow(lum, 2);
      return [
        r * 0.95 + teal[0] * shadowMix + orange[0] * highlightMix,
        g * 0.95 + teal[1] * shadowMix + orange[1] * highlightMix,
        b * 0.95 + teal[2] * shadowMix + orange[2] * highlightMix,
      ];
    }),

  // Faded film
  fadedFilm: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const lift = 0.1;
      const desat = 0.15;
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      return [
        (r * (1 - desat) + lum * desat) * (1 - lift) + lift,
        (g * (1 - desat) + lum * desat) * (1 - lift) + lift + 0.02,
        (b * (1 - desat) + lum * desat) * (1 - lift) + lift,
      ];
    }),

  // High contrast B&W
  highContrastBW: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      const contrast = 1 / (1 + Math.exp(-10 * (lum - 0.5)));
      return [contrast, contrast, contrast];
    }),

  // Soft B&W
  softBW: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      const lifted = liftShadows(lum, 0.08);
      const softened = fadeHighlights(lifted, 0.05);
      return [softened, softened, softened];
    }),

  // Golden hour
  goldenHour: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const warmth = 0.15;
      const satBoost = 1.1;
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      return [
        lum + (r - lum) * satBoost + warmth,
        lum + (g - lum) * satBoost + warmth * 0.5,
        lum + (b - lum) * satBoost - warmth * 0.3,
      ];
    }),

  // Matte look
  matteLook: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const lift = 0.08;
      const softHighlight = 0.95;
      return [
        Math.min(r * softHighlight + lift, 0.95),
        Math.min(g * softHighlight + lift, 0.95),
        Math.min(b * softHighlight + lift, 0.95),
      ];
    }),

  // Vibrant pop
  vibrantPop: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      const satBoost = 1.3;
      return [
        Math.pow(lum + (r - lum) * satBoost, 0.95),
        Math.pow(lum + (g - lum) * satBoost, 0.95),
        Math.pow(lum + (b - lum) * satBoost, 0.95),
      ];
    }),

  // Cross process
  crossProcess: () =>
    generateColorGradeLUT(33, (r, g, b) => {
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      return [
        Math.pow(r, 0.9) + lum * 0.1,
        Math.pow(g, 1.1),
        Math.pow(b, 0.85) + (1 - lum) * 0.15,
      ];
    }),
};
