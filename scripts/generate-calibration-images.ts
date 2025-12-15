import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = join(process.cwd(), 'public', 'calibration');
const SIZE = 1024; // 1024x1024 images

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Generate a grayscale gradient (black to white, left to right)
async function generateGrayscaleGradient() {
  const width = SIZE;
  const height = SIZE;
  const channels = 3;
  const data = Buffer.alloc(width * height * channels);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const value = Math.round((x / (width - 1)) * 255);
      data[idx] = value;     // R
      data[idx + 1] = value; // G
      data[idx + 2] = value; // B
    }
  }

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(join(OUTPUT_DIR, '01-grayscale-gradient.png'));

  console.log('Created: 01-grayscale-gradient.png');
}

// Generate RGB channel gradients (3 horizontal strips)
async function generateRGBGradients() {
  const width = SIZE;
  const height = SIZE;
  const channels = 3;
  const data = Buffer.alloc(width * height * channels);
  const stripHeight = Math.floor(height / 3);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const value = Math.round((x / (width - 1)) * 255);

      if (y < stripHeight) {
        // Red gradient
        data[idx] = value;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
      } else if (y < stripHeight * 2) {
        // Green gradient
        data[idx] = 0;
        data[idx + 1] = value;
        data[idx + 2] = 0;
      } else {
        // Blue gradient
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = value;
      }
    }
  }

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(join(OUTPUT_DIR, '02-rgb-gradients.png'));

  console.log('Created: 02-rgb-gradients.png');
}

// Generate color checker (grid of pure colors)
async function generateColorChecker() {
  const width = SIZE;
  const height = SIZE;
  const channels = 3;
  const data = Buffer.alloc(width * height * channels);

  // 4x4 grid of colors
  const colors = [
    // Row 1: Primary and secondary colors
    [255, 0, 0],     // Red
    [0, 255, 0],     // Green
    [0, 0, 255],     // Blue
    [255, 255, 0],   // Yellow

    // Row 2: More colors
    [255, 0, 255],   // Magenta
    [0, 255, 255],   // Cyan
    [255, 128, 0],   // Orange
    [128, 0, 255],   // Purple

    // Row 3: Skin tones and naturals
    [255, 200, 170], // Light skin
    [200, 140, 100], // Medium skin
    [100, 70, 50],   // Dark skin
    [100, 150, 50],  // Foliage green

    // Row 4: Grayscale reference
    [0, 0, 0],       // Black
    [85, 85, 85],    // Dark gray
    [170, 170, 170], // Light gray
    [255, 255, 255], // White
  ];

  const cellWidth = width / 4;
  const cellHeight = height / 4;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const cellX = Math.min(Math.floor(x / cellWidth), 3);
      const cellY = Math.min(Math.floor(y / cellHeight), 3);
      const colorIdx = cellY * 4 + cellX;
      const color = colors[colorIdx];

      data[idx] = color[0];
      data[idx + 1] = color[1];
      data[idx + 2] = color[2];
    }
  }

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(join(OUTPUT_DIR, '03-color-checker.png'));

  console.log('Created: 03-color-checker.png');
}

// Generate hue wheel gradient
async function generateHueWheel() {
  const width = SIZE;
  const height = SIZE;
  const channels = 3;
  const data = Buffer.alloc(width * height * channels);

  // HSL to RGB conversion
  function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const hue = x / width; // 0 to 1 across width
      const lightness = 1 - (y / height); // 1 at top, 0 at bottom
      const saturation = 1;

      const [r, g, b] = hslToRgb(hue, saturation, lightness);
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
    }
  }

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(join(OUTPUT_DIR, '04-hue-lightness.png'));

  console.log('Created: 04-hue-lightness.png');
}

// Generate saturation test (hue wheel with varying saturation)
async function generateSaturationTest() {
  const width = SIZE;
  const height = SIZE;
  const channels = 3;
  const data = Buffer.alloc(width * height * channels);

  function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const hue = x / width;
      const saturation = 1 - (y / height); // 1 at top, 0 at bottom
      const lightness = 0.5; // Middle lightness

      const [r, g, b] = hslToRgb(hue, saturation, lightness);
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
    }
  }

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(join(OUTPUT_DIR, '05-hue-saturation.png'));

  console.log('Created: 05-hue-saturation.png');
}

// Generate shadow/highlight test (gradient with color in middle)
async function generateShadowHighlightTest() {
  const width = SIZE;
  const height = SIZE;
  const channels = 3;
  const data = Buffer.alloc(width * height * channels);

  // Vertical strips: shadows -> midtones -> highlights
  // With warm and cool tints to see split toning

  const stripWidth = width / 6;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const luminance = y / height; // 0 at top (dark), 1 at bottom (bright)
      const value = Math.round(luminance * 255);

      const strip = Math.floor(x / stripWidth);

      switch (strip) {
        case 0: // Pure grayscale
          data[idx] = value;
          data[idx + 1] = value;
          data[idx + 2] = value;
          break;
        case 1: // Warm tint (for seeing how warm tones shift)
          data[idx] = Math.min(255, value + 20);
          data[idx + 1] = value;
          data[idx + 2] = Math.max(0, value - 20);
          break;
        case 2: // Cool tint (for seeing how cool tones shift)
          data[idx] = Math.max(0, value - 20);
          data[idx + 1] = value;
          data[idx + 2] = Math.min(255, value + 20);
          break;
        case 3: // Red channel gradient
          data[idx] = value;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          break;
        case 4: // Green channel gradient
          data[idx] = 0;
          data[idx + 1] = value;
          data[idx + 2] = 0;
          break;
        case 5: // Blue channel gradient
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = value;
          break;
      }
    }
  }

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(join(OUTPUT_DIR, '06-shadow-highlight-test.png'));

  console.log('Created: 06-shadow-highlight-test.png');
}

async function main() {
  console.log('Generating calibration images...\n');

  await generateGrayscaleGradient();
  await generateRGBGradients();
  await generateColorChecker();
  await generateHueWheel();
  await generateSaturationTest();
  await generateShadowHighlightTest();

  console.log('\nDone! Images saved to:', OUTPUT_DIR);
  console.log('\nInstructions:');
  console.log('1. Upload each image to VSCO');
  console.log('2. Apply the preset (e.g., A1)');
  console.log('3. Export/screenshot the result');
  console.log('4. Show me original + result pairs');
  console.log('\nThe grayscale gradient is most important - it reveals the exact tone curve.');
}

main().catch(console.error);
