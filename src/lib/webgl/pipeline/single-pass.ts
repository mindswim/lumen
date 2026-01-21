/**
 * Single-pass rendering pipeline.
 * Used when no multi-pass effects (bloom, halation, heavy blur) are needed.
 */
import { EditState } from '../types';
import { ProgramFactory } from '../programs/program-factory';
import { UniformSetter } from '../programs/uniform-setter';
import { TextureManager } from '../resources/texture-manager';

export class SinglePassPipeline {
  private gl: WebGL2RenderingContext;
  private programFactory: ProgramFactory;

  constructor(gl: WebGL2RenderingContext, programFactory: ProgramFactory) {
    this.gl = gl;
    this.programFactory = programFactory;
  }

  /**
   * Render the image with all adjustments in a single pass.
   */
  render(
    program: WebGLProgram,
    uniformSetter: UniformSetter,
    textures: TextureManager,
    editState: EditState,
    width: number,
    height: number
  ): void {
    const gl = this.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.programFactory.setupAttributes(program);
    gl.useProgram(program);
    uniformSetter.setFromEditState(editState, textures, width, height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
