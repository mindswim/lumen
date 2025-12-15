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

// Preset LUT generators (film-style looks without external files)
export const PRESET_LUTS = {
  // Warm vintage look
  warmVintage: () =>
    generateColorGradeLUT(17, (r, g, b) => {
      // Lift shadows, warm tones, reduced contrast
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
    generateColorGradeLUT(17, (r, g, b) => {
      // Crush blacks, teal shadows, orange highlights
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
    generateColorGradeLUT(17, (r, g, b) => {
      // Lifted blacks, desaturated, slight green tint
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
    generateColorGradeLUT(17, (r, g, b) => {
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      // S-curve for contrast
      const contrast = 1 / (1 + Math.exp(-10 * (lum - 0.5)));
      return [contrast, contrast, contrast];
    }),

  // Golden hour
  goldenHour: () =>
    generateColorGradeLUT(17, (r, g, b) => {
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
    generateColorGradeLUT(17, (r, g, b) => {
      // Crushed blacks, soft highlights
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
    generateColorGradeLUT(17, (r, g, b) => {
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
    generateColorGradeLUT(17, (r, g, b) => {
      // Blue shadows, yellow highlights
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      return [
        Math.pow(r, 0.9) + lum * 0.1,
        Math.pow(g, 1.1),
        Math.pow(b, 0.85) + (1 - lum) * 0.15,
      ];
    }),
};
