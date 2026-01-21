/**
 * Curve interpolation using Catmull-Rom splines.
 */
import { Point } from '../types';

/**
 * Interpolate a value using Catmull-Rom spline through the given points.
 *
 * @param points - Control points sorted by x coordinate
 * @param x - The x value to interpolate at (0-1 range)
 * @returns The interpolated y value, clamped to 0-1
 */
export function interpolateCurve(points: Point[], x: number): number {
  if (points.length < 2) return x;

  // Find surrounding points
  let i = 0;
  while (i < points.length - 1 && points[i + 1].x < x) i++;

  if (i >= points.length - 1) return points[points.length - 1].y;
  if (i === 0 && x < points[0].x) return points[0].y;

  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[i];
  const p2 = points[Math.min(points.length - 1, i + 1)];
  const p3 = points[Math.min(points.length - 1, i + 2)];

  const t = (x - p1.x) / (p2.x - p1.x + 0.0001);

  // Catmull-Rom spline
  const t2 = t * t;
  const t3 = t2 * t;

  return Math.min(
    1,
    Math.max(
      0,
      0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
    )
  );
}

/**
 * Check if a curve channel represents an identity transform.
 * An identity curve has exactly two points at (0,0) and (1,1).
 */
export function isChannelIdentity(points: Point[]): boolean {
  if (points.length !== 2) return false;
  return (
    Math.abs(points[0].x - 0) < 0.001 &&
    Math.abs(points[0].y - 0) < 0.001 &&
    Math.abs(points[1].x - 1) < 0.001 &&
    Math.abs(points[1].y - 1) < 0.001
  );
}

/**
 * Check if an entire curve (all channels) is identity.
 */
export function isCurveIdentity(curve: {
  rgb: Point[];
  red: Point[];
  green: Point[];
  blue: Point[];
}): boolean {
  return (
    isChannelIdentity(curve.rgb) &&
    isChannelIdentity(curve.red) &&
    isChannelIdentity(curve.green) &&
    isChannelIdentity(curve.blue)
  );
}

/**
 * Generate curve LUT data from curve points.
 * Returns a 256x4 pixel array (RGBA, 4 rows for RGB/R/G/B channels).
 */
export function generateCurveLutData(curve: {
  rgb: Point[];
  red: Point[];
  green: Point[];
  blue: Point[];
}): Uint8Array {
  const data = new Uint8Array(256 * 4 * 4);

  for (let i = 0; i < 256; i++) {
    const x = i / 255;

    // RGB curve (row 0)
    const rgb = interpolateCurve(curve.rgb, x);
    data[i * 4 + 0] = Math.round(rgb * 255);
    data[i * 4 + 1] = Math.round(rgb * 255);
    data[i * 4 + 2] = Math.round(rgb * 255);
    data[i * 4 + 3] = 255;

    // Red curve (row 1)
    const r = interpolateCurve(curve.red, x);
    data[256 * 4 + i * 4 + 0] = Math.round(r * 255);
    data[256 * 4 + i * 4 + 1] = Math.round(r * 255);
    data[256 * 4 + i * 4 + 2] = Math.round(r * 255);
    data[256 * 4 + i * 4 + 3] = 255;

    // Green curve (row 2)
    const g = interpolateCurve(curve.green, x);
    data[512 * 4 + i * 4 + 0] = Math.round(g * 255);
    data[512 * 4 + i * 4 + 1] = Math.round(g * 255);
    data[512 * 4 + i * 4 + 2] = Math.round(g * 255);
    data[512 * 4 + i * 4 + 3] = 255;

    // Blue curve (row 3)
    const b = interpolateCurve(curve.blue, x);
    data[768 * 4 + i * 4 + 0] = Math.round(b * 255);
    data[768 * 4 + i * 4 + 1] = Math.round(b * 255);
    data[768 * 4 + i * 4 + 2] = Math.round(b * 255);
    data[768 * 4 + i * 4 + 3] = 255;
  }

  return data;
}

/**
 * Generate default identity curve LUT data.
 * All channels pass through unchanged.
 */
export function generateIdentityCurveLutData(): Uint8Array {
  const data = new Uint8Array(256 * 4 * 4);

  for (let i = 0; i < 256; i++) {
    // All 4 rows are identity (diagonal)
    for (let row = 0; row < 4; row++) {
      data[row * 256 * 4 + i * 4 + 0] = i;
      data[row * 256 * 4 + i * 4 + 1] = i;
      data[row * 256 * 4 + i * 4 + 2] = i;
      data[row * 256 * 4 + i * 4 + 3] = 255;
    }
  }

  return data;
}
