import sharp from 'sharp';
import { join } from 'path';

const CALIBRATION_DIR = join(process.cwd(), 'public', 'calibration');
const TEST_DIR = join(process.cwd(), 'test');

// Preset mapping: filename suffix -> preset name
const PRESET_MAP: Record<string, string> = {
  'VSCO.jpeg': 'A1',
  'VSCO (1).jpeg': 'A2',
  'VSCO (2).jpeg': 'A3',
  'VSCO (3).jpeg': 'A4',
  'VSCO (4).jpeg': 'A5',
  'VSCO (5).jpeg': 'A6',
};

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface AnalysisResult {
  preset: string;
  // Tone curve analysis (from grayscale gradient)
  toneCurve: { input: number; output: RGB }[];
  blackPoint: RGB;
  whitePoint: RGB;
  // Split tone analysis
  shadowTint: RGB;
  highlightTint: RGB;
  // Color shifts (from color checker)
  colorShifts: Record<string, { original: RGB; shifted: RGB }>;
}

// Sample a pixel from an image at a specific position
async function samplePixel(imagePath: string, x: number, y: number): Promise<RGB> {
  const { data, info } = await sharp(imagePath)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const idx = (y * info.width + x) * info.channels;
  return {
    r: data[idx],
    g: data[idx + 1],
    b: data[idx + 2],
  };
}

// Sample multiple pixels along a horizontal line
async function sampleHorizontalLine(imagePath: string, y: number, samples: number): Promise<RGB[]> {
  const { data, info } = await sharp(imagePath)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const results: RGB[] = [];
  for (let i = 0; i < samples; i++) {
    const x = Math.floor((i / (samples - 1)) * (info.width - 1));
    const idx = (y * info.width + x) * info.channels;
    results.push({
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2],
    });
  }
  return results;
}

// Get average color of a region
async function sampleRegion(imagePath: string, x: number, y: number, size: number): Promise<RGB> {
  const { data, info } = await sharp(imagePath)
    .raw()
    .toBuffer({ resolveWithObject: true });

  let r = 0, g = 0, b = 0, count = 0;
  const halfSize = Math.floor(size / 2);

  for (let dy = -halfSize; dy <= halfSize; dy++) {
    for (let dx = -halfSize; dx <= halfSize; dx++) {
      const px = Math.max(0, Math.min(info.width - 1, x + dx));
      const py = Math.max(0, Math.min(info.height - 1, y + dy));
      const idx = (py * info.width + px) * info.channels;
      r += data[idx];
      g += data[idx + 1];
      b += data[idx + 2];
      count++;
    }
  }

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}

// Analyze grayscale gradient to extract tone curve
async function analyzeGrayscaleGradient(originalPath: string, processedPath: string): Promise<{
  toneCurve: { input: number; output: RGB }[];
  blackPoint: RGB;
  whitePoint: RGB;
  shadowTint: RGB;
  highlightTint: RGB;
}> {
  const samples = 17; // 0, 16, 32, ... 256 (17 points including endpoints)
  const metadata = await sharp(originalPath).metadata();
  const midY = Math.floor((metadata.height || 512) / 2);

  const processedLine = await sampleHorizontalLine(processedPath, midY, samples);

  const toneCurve = processedLine.map((rgb, i) => ({
    input: Math.round((i / (samples - 1)) * 255),
    output: rgb,
  }));

  // Black point (leftmost)
  const blackPoint = processedLine[0];
  // White point (rightmost)
  const whitePoint = processedLine[samples - 1];

  // Shadow tint (from dark region, ~12% brightness)
  const shadowIdx = 2; // ~12% gray
  const shadowTint = {
    r: processedLine[shadowIdx].r - processedLine[shadowIdx].g,
    g: 0,
    b: processedLine[shadowIdx].b - processedLine[shadowIdx].g,
  };

  // Highlight tint (from bright region, ~88% brightness)
  const highlightIdx = samples - 3; // ~88% gray
  const highlightTint = {
    r: processedLine[highlightIdx].r - processedLine[highlightIdx].g,
    g: 0,
    b: processedLine[highlightIdx].b - processedLine[highlightIdx].g,
  };

  return { toneCurve, blackPoint, whitePoint, shadowTint, highlightTint };
}

// Analyze color checker to extract color shifts
async function analyzeColorChecker(originalPath: string, processedPath: string): Promise<Record<string, { original: RGB; shifted: RGB }>> {
  const metadata = await sharp(originalPath).metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || 1024;
  const cellW = width / 4;
  const cellH = height / 4;

  const colorNames = [
    ['Red', 'Green', 'Blue', 'Yellow'],
    ['Magenta', 'Cyan', 'Orange', 'Purple'],
    ['LightSkin', 'MediumSkin', 'DarkSkin', 'Foliage'],
    ['Black', 'DarkGray', 'LightGray', 'White'],
  ];

  const results: Record<string, { original: RGB; shifted: RGB }> = {};

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x = Math.floor(col * cellW + cellW / 2);
      const y = Math.floor(row * cellH + cellH / 2);
      const name = colorNames[row][col];

      const original = await sampleRegion(originalPath, x, y, 20);
      const shifted = await sampleRegion(processedPath, x, y, 20);

      results[name] = { original, shifted };
    }
  }

  return results;
}

// Convert RGB tint to HSL hue (approximate)
function tintToHue(tint: RGB): number {
  const r = tint.r / 255;
  const g = tint.g / 255;
  const b = tint.b / 255;

  if (r === 0 && g === 0 && b === 0) return 0;

  // Simplified hue calculation
  if (r >= g && r >= b) {
    if (r === b) return 0; // Red
    return b > g ? 330 : 30; // Magenta-ish or Orange-ish
  } else if (g >= r && g >= b) {
    return r > b ? 60 : 150; // Yellow-ish or Teal-ish
  } else {
    return g > r ? 200 : 270; // Cyan-ish or Purple-ish
  }
}

// Main analysis function
async function analyzePreset(presetSuffix: string, presetName: string): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`ANALYZING: ${presetName}`);
  console.log('='.repeat(60));

  // Analyze grayscale gradient
  const grayscaleOriginal = join(CALIBRATION_DIR, '01-grayscale-gradient.png');
  const grayscaleProcessed = join(TEST_DIR, `01-grayscale-gradient-${presetSuffix}`);

  console.log(`Original: ${grayscaleOriginal}`);
  console.log(`Processed: ${grayscaleProcessed}`);

  const { toneCurve, blackPoint, whitePoint, shadowTint, highlightTint } =
    await analyzeGrayscaleGradient(grayscaleOriginal, grayscaleProcessed);

  console.log('\n--- TONE CURVE ---');
  console.log('Input -> Output (R, G, B)');
  toneCurve.forEach(({ input, output }) => {
    const avgOut = Math.round((output.r + output.g + output.b) / 3);
    const tint = output.r !== output.g || output.g !== output.b
      ? ` [R${output.r > output.g ? '+' : ''}${output.r - output.g}, B${output.b > output.g ? '+' : ''}${output.b - output.g}]`
      : '';
    console.log(`  ${input.toString().padStart(3)} -> ${avgOut.toString().padStart(3)}${tint}`);
  });

  console.log('\n--- BLACK/WHITE POINTS ---');
  console.log(`  Black point: RGB(${blackPoint.r}, ${blackPoint.g}, ${blackPoint.b})`);
  console.log(`  White point: RGB(${whitePoint.r}, ${whitePoint.g}, ${whitePoint.b})`);
  console.log(`  Black lift: ${Math.round((blackPoint.r + blackPoint.g + blackPoint.b) / 3)}/255`);

  console.log('\n--- SPLIT TONING ---');
  console.log(`  Shadow tint: R${shadowTint.r >= 0 ? '+' : ''}${shadowTint.r}, B${shadowTint.b >= 0 ? '+' : ''}${shadowTint.b}`);
  console.log(`  Highlight tint: R${highlightTint.r >= 0 ? '+' : ''}${highlightTint.r}, B${highlightTint.b >= 0 ? '+' : ''}${highlightTint.b}`);

  // Analyze color checker
  const colorOriginal = join(CALIBRATION_DIR, '03-color-checker.png');
  const colorProcessed = join(TEST_DIR, `03-color-checker-${presetSuffix}`);

  const colorShifts = await analyzeColorChecker(colorOriginal, colorProcessed);

  console.log('\n--- COLOR SHIFTS ---');
  for (const [name, { original, shifted }] of Object.entries(colorShifts)) {
    const dr = shifted.r - original.r;
    const dg = shifted.g - original.g;
    const db = shifted.b - original.b;
    if (Math.abs(dr) > 5 || Math.abs(dg) > 5 || Math.abs(db) > 5) {
      console.log(`  ${name.padEnd(12)}: R${dr >= 0 ? '+' : ''}${dr}, G${dg >= 0 ? '+' : ''}${dg}, B${db >= 0 ? '+' : ''}${db}`);
    }
  }

  // Generate preset code suggestion
  console.log('\n--- SUGGESTED PRESET VALUES ---');

  const blackLift = Math.round((blackPoint.r + blackPoint.g + blackPoint.b) / 3);
  const whiteDrop = 255 - Math.round((whitePoint.r + whitePoint.g + whitePoint.b) / 3);

  // Determine shadow hue from tint
  let shadowHue = 0;
  if (shadowTint.b > shadowTint.r && shadowTint.b > 0) {
    shadowHue = shadowTint.r < 0 ? 200 : 220; // Cyan or Blue
  } else if (shadowTint.r > shadowTint.b && shadowTint.r > 0) {
    shadowHue = 30; // Orange/warm
  } else if (shadowTint.b < 0 && shadowTint.r < 0) {
    shadowHue = 60; // Yellow-ish (both channels reduced = green tint appears)
  }

  // Determine highlight hue
  let highlightHue = 0;
  if (highlightTint.r > highlightTint.b && highlightTint.r > 0) {
    highlightHue = highlightTint.b < 0 ? 30 : 350; // Orange or Pink
  } else if (highlightTint.b > highlightTint.r && highlightTint.b > 0) {
    highlightHue = 200; // Cyan
  }

  const shadowSat = Math.min(100, Math.round(Math.abs(shadowTint.r - shadowTint.b) * 2));
  const highlightSat = Math.min(100, Math.round(Math.abs(highlightTint.r - highlightTint.b) * 2));

  console.log(`  fade: ${Math.round(blackLift / 2.55)}, // Black lift ~${blackLift}/255`);
  console.log(`  splitTone: {`);
  console.log(`    shadowHue: ${shadowHue},`);
  console.log(`    shadowSaturation: ${shadowSat},`);
  console.log(`    highlightHue: ${highlightHue},`);
  console.log(`    highlightSaturation: ${highlightSat},`);
  console.log(`    balance: 0,`);
  console.log(`  },`);

  // Curve points (simplified)
  const curvePoints = [
    { x: 0, y: blackLift / 255 },
    { x: 0.25, y: toneCurve[4].output.g / 255 },
    { x: 0.5, y: toneCurve[8].output.g / 255 },
    { x: 0.75, y: toneCurve[12].output.g / 255 },
    { x: 1, y: (255 - whiteDrop) / 255 },
  ];

  console.log(`  curve: {`);
  console.log(`    rgb: [`);
  curvePoints.forEach(p => {
    console.log(`      { x: ${p.x.toFixed(2)}, y: ${p.y.toFixed(3)} },`);
  });
  console.log(`    ],`);
  console.log(`  },`);
}

async function main() {
  console.log('VSCO A-Series Preset Analysis');
  console.log('Comparing calibration images to VSCO-processed versions\n');

  for (const [suffix, name] of Object.entries(PRESET_MAP)) {
    await analyzePreset(suffix, name);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Analysis complete!');
}

main().catch(console.error);
