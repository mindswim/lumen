/**
 * Factory for creating and managing WebGL shader programs.
 */
import { UniformLocationMap } from '../types';

export class ProgramFactory {
  private gl: WebGL2RenderingContext;
  private positionBuffer: WebGLBuffer;
  private texCoordBuffer: WebGLBuffer;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;

    // Create shared geometry buffers
    this.positionBuffer = this.createBuffer(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
    this.texCoordBuffer = this.createBuffer(new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]));
  }

  /**
   * Create a WebGL shader.
   */
  private createShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) throw new Error('Failed to create shader');

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${error}`);
    }

    return shader;
  }

  /**
   * Create a WebGL program from vertex and fragment shader sources.
   */
  createProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);

    const program = this.gl.createProgram();
    if (!program) throw new Error('Failed to create program');

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const error = this.gl.getProgramInfoLog(program);
      throw new Error(`Program link error: ${error}`);
    }

    return program;
  }

  /**
   * Create a WebGL buffer.
   */
  private createBuffer(data: Float32Array): WebGLBuffer {
    const buffer = this.gl.createBuffer();
    if (!buffer) throw new Error('Failed to create buffer');

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);

    return buffer;
  }

  /**
   * Set up vertex attributes for a program.
   */
  setupAttributes(program: WebGLProgram): void {
    const gl = this.gl;
    gl.useProgram(program);

    const positionLoc = gl.getAttribLocation(program, 'a_position');
    if (positionLoc >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.enableVertexAttribArray(positionLoc);
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    }

    const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
    if (texCoordLoc >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
      gl.enableVertexAttribArray(texCoordLoc);
      gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    }
  }

  /**
   * Cache uniform locations for a program.
   */
  cacheUniformLocations(program: WebGLProgram, uniformNames: readonly string[]): UniformLocationMap {
    const locations: UniformLocationMap = new Map();

    for (const name of uniformNames) {
      const location = this.gl.getUniformLocation(program, name);
      if (location) {
        locations.set(name, location);
      }
    }

    return locations;
  }

  /**
   * Dispose of shared resources.
   */
  dispose(): void {
    this.gl.deleteBuffer(this.positionBuffer);
    this.gl.deleteBuffer(this.texCoordBuffer);
  }
}
