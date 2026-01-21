/**
 * WebGL-specific types for the renderer module
 */

import { EditState, Point } from '@/types/editor';

/**
 * Options for disabling specific effects during multi-pass rendering
 */
export interface RenderOverrides {
  disableBloom?: boolean;
  disableHalation?: boolean;
  disableVignette?: boolean;
  disableGrain?: boolean;
  disableBorder?: boolean;
  disableBlur?: boolean;
}

/**
 * RGB color with values normalized to 0-1 range
 */
export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Uniform location cache for a shader program
 */
export type UniformLocationMap = Map<string, WebGLUniformLocation>;

/**
 * Options for image export
 */
export interface ExportOptions {
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number; // 0-1
  scale?: number; // 1 = original size, 0.5 = half, etc.
  maxDimension?: number; // Max width or height
}

/**
 * LUT data for texture copying
 */
export interface LutData {
  data: Uint8Array;
  size: number;
}

/**
 * Curve channel points for interpolation
 */
export type CurvePoints = Point[];

/**
 * All curve channels
 */
export interface CurveChannels {
  rgb: CurvePoints;
  red: CurvePoints;
  green: CurvePoints;
  blue: CurvePoints;
}

/**
 * Resources required for rendering
 */
export interface RenderResources {
  imageTexture: WebGLTexture | null;
  curveLutTexture: WebGLTexture | null;
  lutTexture: WebGLTexture | null;
  lutSize: number;
}

/**
 * Framebuffer resources for multi-pass rendering
 */
export interface FramebufferResources {
  fbo1: WebGLFramebuffer | null;
  fbo2: WebGLFramebuffer | null;
  texture1: WebGLTexture | null;
  texture2: WebGLTexture | null;
  width: number;
  height: number;
}

// Re-export for convenience
export type { EditState, Point };
