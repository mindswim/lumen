/**
 * Shader module exports.
 * Provides all shaders needed for the WebGL renderer.
 */

export { VERTEX_SHADER } from './vertex';
export { FRAGMENT_SHADER } from './fragment';

export {
  BLUR_SHADER,
  BLOOM_EXTRACT_SHADER,
  COMPOSITE_SHADER,
  FINAL_PASS_SHADER,
  BLUR_UNIFORMS,
  BLOOM_EXTRACT_UNIFORMS,
  COMPOSITE_UNIFORMS,
  FINAL_PASS_UNIFORMS,
} from './multi-pass';

// Re-export fragment shader modules for inspection/testing
export * from './fragment';
