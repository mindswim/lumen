/**
 * WebGL-based image renderer with comprehensive color adjustments.
 *
 * This is the main orchestrator that coordinates:
 * - Shader programs via ProgramFactory
 * - Textures via TextureManager
 * - Framebuffers via FramebufferManager
 * - Uniforms via UniformSetter
 * - Rendering via SinglePassPipeline and MultiPassPipeline
 */
import { EditState, ExportOptions, LutData, Point } from './types';
import {
  VERTEX_SHADER,
  FRAGMENT_SHADER,
  BLUR_SHADER,
  BLOOM_EXTRACT_SHADER,
  COMPOSITE_SHADER,
  FINAL_PASS_SHADER,
  BLUR_UNIFORMS,
  BLOOM_EXTRACT_UNIFORMS,
  COMPOSITE_UNIFORMS,
  FINAL_PASS_UNIFORMS,
} from './shaders';
import { ProgramFactory } from './programs/program-factory';
import { UniformSetter, MAIN_UNIFORM_NAMES } from './programs/uniform-setter';
import { TextureManager } from './resources/texture-manager';
import { FramebufferManager } from './resources/framebuffer-manager';
import { SinglePassPipeline } from './pipeline/single-pass';
import { MultiPassPipeline } from './pipeline/multi-pass';
import { exportImage } from './utils/export';

export class WebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;

  // Managers
  private programFactory: ProgramFactory;
  private textureManager: TextureManager;
  private framebufferManager: FramebufferManager;

  // Programs
  private mainProgram: WebGLProgram;
  private blurProgram: WebGLProgram;
  private bloomExtractProgram: WebGLProgram;
  private compositeProgram: WebGLProgram;
  private finalPassProgram: WebGLProgram;

  // Uniform setter
  private uniformSetter: UniformSetter;

  // Pipelines
  private singlePassPipeline: SinglePassPipeline;
  private multiPassPipeline: MultiPassPipeline;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });

    if (!gl) {
      throw new Error('WebGL2 not supported');
    }

    this.gl = gl;

    // Initialize program factory
    this.programFactory = new ProgramFactory(gl);

    // Create shader programs
    this.mainProgram = this.programFactory.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);
    this.blurProgram = this.programFactory.createProgram(VERTEX_SHADER, BLUR_SHADER);
    this.bloomExtractProgram = this.programFactory.createProgram(VERTEX_SHADER, BLOOM_EXTRACT_SHADER);
    this.compositeProgram = this.programFactory.createProgram(VERTEX_SHADER, COMPOSITE_SHADER);
    this.finalPassProgram = this.programFactory.createProgram(VERTEX_SHADER, FINAL_PASS_SHADER);

    // Set up attributes for all programs
    this.programFactory.setupAttributes(this.mainProgram);
    this.programFactory.setupAttributes(this.blurProgram);
    this.programFactory.setupAttributes(this.bloomExtractProgram);
    this.programFactory.setupAttributes(this.compositeProgram);
    this.programFactory.setupAttributes(this.finalPassProgram);

    // Cache uniform locations
    const mainUniforms = this.programFactory.cacheUniformLocations(this.mainProgram, MAIN_UNIFORM_NAMES);
    const blurUniforms = this.programFactory.cacheUniformLocations(this.blurProgram, BLUR_UNIFORMS);
    const bloomExtractUniforms = this.programFactory.cacheUniformLocations(
      this.bloomExtractProgram,
      BLOOM_EXTRACT_UNIFORMS
    );
    const compositeUniforms = this.programFactory.cacheUniformLocations(this.compositeProgram, COMPOSITE_UNIFORMS);
    // Final pass uniforms not currently used in main renderer

    // Initialize uniform setter
    this.uniformSetter = new UniformSetter(gl, mainUniforms);

    // Initialize resource managers
    this.textureManager = new TextureManager(gl);
    this.framebufferManager = new FramebufferManager(gl);

    // Initialize pipelines
    this.singlePassPipeline = new SinglePassPipeline(gl, this.programFactory);
    this.multiPassPipeline = new MultiPassPipeline(
      gl,
      this.programFactory,
      this.blurProgram,
      blurUniforms,
      this.bloomExtractProgram,
      bloomExtractUniforms,
      this.compositeProgram,
      compositeUniforms
    );
  }

  /**
   * Set the image to be rendered.
   */
  setImage(image: HTMLImageElement): void {
    const { width, height } = this.textureManager.setImage(image);
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  /**
   * Update the curve LUT texture.
   */
  updateCurveLut(curve: { rgb: Point[]; red: Point[]; green: Point[]; blue: Point[] }): void {
    this.textureManager.updateCurveLut(curve);
  }

  /**
   * Set a color LUT.
   */
  setLut(lutData: Uint8Array, size: number): void {
    this.textureManager.setLut(lutData, size);
  }

  /**
   * Clear the color LUT.
   */
  clearLut(): void {
    this.textureManager.clearLut();
  }

  /**
   * Get LUT data for copying to export renderer.
   */
  getLutData(): LutData | null {
    return this.textureManager.getLutData();
  }

  /**
   * Render the image with the given edit state.
   */
  render(editState: EditState): void {
    if (!this.textureManager.getImageTexture()) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    // Check if we need multi-pass rendering
    const needsMultiPass =
      editState.bloom.amount > 0 || editState.halation.amount > 0 || editState.blur.amount > 20;

    if (needsMultiPass) {
      this.multiPassPipeline.render(
        this.mainProgram,
        this.uniformSetter,
        this.textureManager,
        this.framebufferManager,
        editState,
        width,
        height
      );
    } else {
      this.singlePassPipeline.render(
        this.mainProgram,
        this.uniformSetter,
        this.textureManager,
        editState,
        width,
        height
      );
    }
  }

  /**
   * Export the rendered image.
   */
  exportImage(
    editState: EditState,
    originalImage: HTMLImageElement,
    options: ExportOptions = {}
  ): Promise<Blob> {
    return exportImage(
      editState,
      originalImage,
      options,
      (canvas) => new WebGLRenderer(canvas),
      this.getLutData()
    );
  }

  /**
   * Dispose of all WebGL resources.
   */
  dispose(): void {
    const gl = this.gl;

    // Dispose managers
    this.textureManager.dispose();
    this.framebufferManager.dispose();
    this.programFactory.dispose();

    // Delete programs
    gl.deleteProgram(this.mainProgram);
    gl.deleteProgram(this.blurProgram);
    gl.deleteProgram(this.bloomExtractProgram);
    gl.deleteProgram(this.compositeProgram);
    gl.deleteProgram(this.finalPassProgram);
  }

  /**
   * Get the canvas element.
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
