/**
 * WebGL Renderer Module
 *
 * A modular WebGL-based image renderer with comprehensive color adjustments.
 *
 * Main export:
 * - WebGLRenderer: The main renderer class
 *
 * The renderer supports:
 * - Basic adjustments (exposure, contrast, highlights, shadows, etc.)
 * - HSL per-color adjustments (8 color ranges)
 * - Tone curves (RGB, R, G, B channels)
 * - Color grading (split tone, 3-way wheels)
 * - Detail controls (clarity, texture, dehaze, sharpening, noise reduction)
 * - Effects (vignette, grain, fade, bloom, halation, blur, border)
 * - LUT support
 * - Image export with transforms
 */

export { WebGLRenderer } from './renderer';

// Re-export types for consumers
export type {
  EditState,
  Point,
  ExportOptions,
  LutData,
  RgbColor,
  RenderOverrides,
} from './types';

// Export utilities for testing/advanced use
export { hueToRgb, hexToRgb, isCurveIdentity } from './utils';
