/**
 * Manages framebuffer objects for multi-pass rendering.
 */
import { FramebufferResources } from '../types';

export class FramebufferManager {
  private gl: WebGL2RenderingContext;
  private fbo1: WebGLFramebuffer | null = null;
  private fbo2: WebGLFramebuffer | null = null;
  private fboTexture1: WebGLTexture | null = null;
  private fboTexture2: WebGLTexture | null = null;
  private fboWidth: number = 0;
  private fboHeight: number = 0;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  /**
   * Ensure FBOs are created and sized correctly.
   * Only recreates if dimensions have changed.
   */
  ensureFBOs(width: number, height: number): void {
    const gl = this.gl;

    // Only recreate if size changed
    if (this.fboWidth === width && this.fboHeight === height) return;

    this.fboWidth = width;
    this.fboHeight = height;

    // Clean up old FBOs
    this.dispose();

    // Create FBO 1
    this.fboTexture1 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.fboTexture1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.fbo1 = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo1);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fboTexture1, 0);

    // Create FBO 2
    this.fboTexture2 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.fboTexture2);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.fbo2 = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo2);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fboTexture2, 0);

    // Unbind
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Get framebuffer resources.
   */
  getResources(): FramebufferResources {
    return {
      fbo1: this.fbo1,
      fbo2: this.fbo2,
      texture1: this.fboTexture1,
      texture2: this.fboTexture2,
      width: this.fboWidth,
      height: this.fboHeight,
    };
  }

  /**
   * Get the first framebuffer.
   */
  getFBO1(): WebGLFramebuffer | null {
    return this.fbo1;
  }

  /**
   * Get the second framebuffer.
   */
  getFBO2(): WebGLFramebuffer | null {
    return this.fbo2;
  }

  /**
   * Get the first framebuffer's texture.
   */
  getTexture1(): WebGLTexture | null {
    return this.fboTexture1;
  }

  /**
   * Get the second framebuffer's texture.
   */
  getTexture2(): WebGLTexture | null {
    return this.fboTexture2;
  }

  /**
   * Dispose of all framebuffer resources.
   */
  dispose(): void {
    const gl = this.gl;

    if (this.fbo1) gl.deleteFramebuffer(this.fbo1);
    if (this.fbo2) gl.deleteFramebuffer(this.fbo2);
    if (this.fboTexture1) gl.deleteTexture(this.fboTexture1);
    if (this.fboTexture2) gl.deleteTexture(this.fboTexture2);

    this.fbo1 = null;
    this.fbo2 = null;
    this.fboTexture1 = null;
    this.fboTexture2 = null;
  }
}
