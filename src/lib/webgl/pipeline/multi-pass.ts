/**
 * Multi-pass rendering pipeline for advanced effects.
 * Handles bloom, halation, and heavy blur using framebuffer ping-pong.
 */
import { EditState, UniformLocationMap, RenderOverrides, RgbColor } from '../types';
import { ProgramFactory } from '../programs/program-factory';
import { UniformSetter } from '../programs/uniform-setter';
import { TextureManager } from '../resources/texture-manager';
import { FramebufferManager } from '../resources/framebuffer-manager';
import { hueToRgb } from '../utils/color';

export class MultiPassPipeline {
  private gl: WebGL2RenderingContext;
  private programFactory: ProgramFactory;

  // Multi-pass shader programs
  private blurProgram: WebGLProgram;
  private blurUniforms: UniformLocationMap;
  private bloomExtractProgram: WebGLProgram;
  private bloomExtractUniforms: UniformLocationMap;
  private compositeProgram: WebGLProgram;
  private compositeUniforms: UniformLocationMap;

  constructor(
    gl: WebGL2RenderingContext,
    programFactory: ProgramFactory,
    blurProgram: WebGLProgram,
    blurUniforms: UniformLocationMap,
    bloomExtractProgram: WebGLProgram,
    bloomExtractUniforms: UniformLocationMap,
    compositeProgram: WebGLProgram,
    compositeUniforms: UniformLocationMap
  ) {
    this.gl = gl;
    this.programFactory = programFactory;
    this.blurProgram = blurProgram;
    this.blurUniforms = blurUniforms;
    this.bloomExtractProgram = bloomExtractProgram;
    this.bloomExtractUniforms = bloomExtractUniforms;
    this.compositeProgram = compositeProgram;
    this.compositeUniforms = compositeUniforms;
  }

  /**
   * Render with multi-pass effects.
   */
  render(
    mainProgram: WebGLProgram,
    uniformSetter: UniformSetter,
    textures: TextureManager,
    fbos: FramebufferManager,
    editState: EditState,
    width: number,
    height: number
  ): void {
    const gl = this.gl;

    // Ensure FBOs are ready
    fbos.ensureFBOs(width, height);

    // === PASS 1: Main color processing to FBO1 ===
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbos.getFBO1());
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.programFactory.setupAttributes(mainProgram);
    gl.useProgram(mainProgram);

    // Set uniforms but disable effects that will be done in later passes
    const overrides: RenderOverrides = {
      disableBloom: true,
      disableHalation: true,
      disableVignette: true,
      disableGrain: true,
      disableBorder: true,
      disableBlur: editState.blur.amount > 20,
    };

    uniformSetter.setFromEditState(editState, textures, width, height, overrides);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // === PASS 2: Multi-pass blur (if enabled) ===
    if (editState.blur.amount > 20) {
      const blurRadius = (editState.blur.amount / 100.0) * 15.0;
      this.applyBlurPasses(
        fbos.getTexture1()!,
        fbos.getFBO2()!,
        fbos.getTexture2()!,
        fbos.getFBO1()!,
        blurRadius,
        width,
        height
      );
    }

    // === PASS 3: Bloom (if enabled) ===
    if (editState.bloom.amount > 0) {
      this.extractBloom(fbos.getTexture1()!, fbos.getFBO2()!, editState.bloom.threshold / 100.0, width, height);

      const bloomRadius = (editState.bloom.radius / 100.0) * 30.0;
      this.applyBlurPass(fbos.getTexture2()!, fbos.getFBO1()!, 1, 0, bloomRadius, width, height);
      this.applyBlurPass(fbos.getTexture1()!, fbos.getFBO2()!, 0, 1, bloomRadius, width, height);

      // Re-render original to FBO1
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbos.getFBO1());
      gl.viewport(0, 0, width, height);
      this.programFactory.setupAttributes(mainProgram);
      gl.useProgram(mainProgram);
      uniformSetter.setFromEditState(editState, textures, width, height, overrides);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Composite bloom
      this.compositeBloom(
        fbos.getTexture1()!,
        fbos.getTexture2()!,
        null,
        editState.bloom.amount / 100.0,
        { r: 1, g: 1, b: 1 },
        width,
        height
      );
    }

    // === PASS 4: Halation (if enabled and no bloom) ===
    if (editState.halation.amount > 0 && editState.bloom.amount === 0) {
      this.extractBloom(fbos.getTexture1()!, fbos.getFBO2()!, editState.halation.threshold / 100.0, width, height);

      const halationRadius = 25.0;
      this.applyBlurPass(fbos.getTexture2()!, fbos.getFBO1()!, 1, 0, halationRadius, width, height);
      this.applyBlurPass(fbos.getTexture1()!, fbos.getFBO2()!, 0, 1, halationRadius, width, height);

      // Re-render original to FBO1
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbos.getFBO1());
      gl.viewport(0, 0, width, height);
      this.programFactory.setupAttributes(mainProgram);
      gl.useProgram(mainProgram);
      uniformSetter.setFromEditState(editState, textures, width, height, {
        disableBloom: true,
        disableHalation: true,
        disableVignette: true,
        disableGrain: true,
        disableBorder: true,
      });
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Composite with halation tint
      const halationTint = hueToRgb(editState.halation.hue);
      this.compositeBloom(
        fbos.getTexture1()!,
        fbos.getTexture2()!,
        null,
        (editState.halation.amount / 100.0) * 0.5,
        halationTint,
        width,
        height
      );
    }

    // === FINAL: No bloom/halation, render to screen with all effects ===
    if (editState.bloom.amount === 0 && editState.halation.amount === 0) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, width, height);
      this.programFactory.setupAttributes(mainProgram);
      gl.useProgram(mainProgram);
      uniformSetter.setFromEditState(editState, textures, width, height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }

  /**
   * Apply a single blur pass.
   */
  private applyBlurPass(
    sourceTexture: WebGLTexture,
    targetFBO: WebGLFramebuffer,
    dirX: number,
    dirY: number,
    radius: number,
    width: number,
    height: number
  ): void {
    const gl = this.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO);
    gl.viewport(0, 0, width, height);

    this.programFactory.setupAttributes(this.blurProgram);
    gl.useProgram(this.blurProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.uniform1i(this.blurUniforms.get('u_image')!, 0);
    gl.uniform2f(this.blurUniforms.get('u_direction')!, dirX, dirY);
    gl.uniform2f(this.blurUniforms.get('u_resolution')!, width, height);
    gl.uniform1f(this.blurUniforms.get('u_radius')!, radius);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Apply horizontal and vertical blur passes (ping-pong).
   */
  private applyBlurPasses(
    sourceTexture: WebGLTexture,
    tempFBO: WebGLFramebuffer,
    tempTexture: WebGLTexture,
    resultFBO: WebGLFramebuffer,
    radius: number,
    width: number,
    height: number
  ): void {
    // Horizontal pass: source -> temp
    this.applyBlurPass(sourceTexture, tempFBO, 1, 0, radius, width, height);
    // Vertical pass: temp -> result
    this.applyBlurPass(tempTexture, resultFBO, 0, 1, radius, width, height);
  }

  /**
   * Extract bright areas for bloom.
   */
  private extractBloom(
    sourceTexture: WebGLTexture,
    targetFBO: WebGLFramebuffer,
    threshold: number,
    width: number,
    height: number
  ): void {
    const gl = this.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO);
    gl.viewport(0, 0, width, height);

    this.programFactory.setupAttributes(this.bloomExtractProgram);
    gl.useProgram(this.bloomExtractProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.uniform1i(this.bloomExtractUniforms.get('u_image')!, 0);
    gl.uniform1f(this.bloomExtractUniforms.get('u_threshold')!, threshold);
    gl.uniform1f(this.bloomExtractUniforms.get('u_softKnee')!, 0.5);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Composite bloom/halation onto original image.
   */
  private compositeBloom(
    originalTexture: WebGLTexture,
    bloomTexture: WebGLTexture,
    targetFBO: WebGLFramebuffer | null,
    intensity: number,
    tint: RgbColor,
    width: number,
    height: number
  ): void {
    const gl = this.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO);
    gl.viewport(0, 0, width, height);

    this.programFactory.setupAttributes(this.compositeProgram);
    gl.useProgram(this.compositeProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, originalTexture);
    gl.uniform1i(this.compositeUniforms.get('u_original')!, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, bloomTexture);
    gl.uniform1i(this.compositeUniforms.get('u_bloom')!, 1);

    gl.uniform1f(this.compositeUniforms.get('u_bloomIntensity')!, intensity);
    gl.uniform3f(this.compositeUniforms.get('u_bloomTint')!, tint.r, tint.g, tint.b);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
