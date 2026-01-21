/**
 * Manages WebGL textures for image, LUT, and curve data.
 */
import { LutData } from '../types';
import { generateIdentityCurveLutData, generateCurveLutData } from '../utils/curve-interpolation';
import type { Point } from '../types';

export class TextureManager {
  private gl: WebGL2RenderingContext;
  private imageTexture: WebGLTexture | null = null;
  private curveLutTexture: WebGLTexture | null = null;
  private lutTexture: WebGLTexture | null = null;
  private lutSize: number = 0;
  private lutData: Uint8Array | null = null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.createDefaultCurveLut();
  }

  /**
   * Create the default identity curve LUT texture.
   */
  private createDefaultCurveLut(): void {
    const gl = this.gl;
    const data = generateIdentityCurveLutData();

    this.curveLutTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.curveLutTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 4, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  /**
   * Set the main image texture from an HTMLImageElement.
   * Returns the dimensions of the created texture.
   */
  setImage(image: HTMLImageElement): { width: number; height: number } {
    const gl = this.gl;

    // Calculate constrained dimensions
    const maxSize = 2000;
    let width = image.width;
    let height = image.height;

    if (width > maxSize || height > maxSize) {
      if (width > height) {
        height = (height / width) * maxSize;
        width = maxSize;
      } else {
        width = (width / height) * maxSize;
        height = maxSize;
      }
    }

    // Delete old texture if exists
    if (this.imageTexture) {
      gl.deleteTexture(this.imageTexture);
    }

    // Create new texture
    this.imageTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return { width, height };
  }

  /**
   * Update the curve LUT texture from curve data.
   */
  updateCurveLut(curve: { rgb: Point[]; red: Point[]; green: Point[]; blue: Point[] }): void {
    const gl = this.gl;
    const data = generateCurveLutData(curve);

    gl.bindTexture(gl.TEXTURE_2D, this.curveLutTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 4, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  }

  /**
   * Set a color LUT texture from raw data.
   */
  setLut(lutData: Uint8Array, size: number): void {
    const gl = this.gl;

    if (this.lutTexture) {
      gl.deleteTexture(this.lutTexture);
    }

    this.lutSize = size;
    this.lutData = lutData;
    this.lutTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.lutTexture);

    // LUT is stored as horizontal strips (size x size, with size strips)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size * size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, lutData);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  /**
   * Clear the color LUT texture.
   */
  clearLut(): void {
    if (this.lutTexture) {
      this.gl.deleteTexture(this.lutTexture);
      this.lutTexture = null;
      this.lutSize = 0;
      this.lutData = null;
    }
  }

  /**
   * Get LUT data for copying to another renderer (e.g., export).
   */
  getLutData(): LutData | null {
    if (this.lutData && this.lutSize > 0) {
      return { data: this.lutData, size: this.lutSize };
    }
    return null;
  }

  /**
   * Get the main image texture.
   */
  getImageTexture(): WebGLTexture | null {
    return this.imageTexture;
  }

  /**
   * Get the curve LUT texture.
   */
  getCurveLutTexture(): WebGLTexture | null {
    return this.curveLutTexture;
  }

  /**
   * Get the color LUT texture.
   */
  getLutTexture(): WebGLTexture | null {
    return this.lutTexture;
  }

  /**
   * Get the current LUT size.
   */
  getLutSize(): number {
    return this.lutSize;
  }

  /**
   * Check if a color LUT is loaded.
   */
  hasLut(): boolean {
    return this.lutTexture !== null;
  }

  /**
   * Dispose of all textures.
   */
  dispose(): void {
    const gl = this.gl;

    if (this.imageTexture) gl.deleteTexture(this.imageTexture);
    if (this.curveLutTexture) gl.deleteTexture(this.curveLutTexture);
    if (this.lutTexture) gl.deleteTexture(this.lutTexture);

    this.imageTexture = null;
    this.curveLutTexture = null;
    this.lutTexture = null;
    this.lutData = null;
    this.lutSize = 0;
  }
}
