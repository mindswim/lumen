/**
 * Multi-pass shader programs for advanced effects.
 * Used for bloom, halation, and high-quality blur.
 */

/**
 * Separable Gaussian blur shader.
 * Used for horizontal and vertical blur passes.
 */
export const BLUR_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_image;
uniform vec2 u_direction;  // (1,0) for horizontal, (0,1) for vertical
uniform vec2 u_resolution;
uniform float u_radius;

// Gaussian weights for 13-tap blur (sigma ~= radius/3)
const int KERNEL_SIZE = 13;

float gaussian(float x, float sigma) {
  return exp(-(x * x) / (2.0 * sigma * sigma));
}

void main() {
  vec2 texelSize = 1.0 / u_resolution;
  vec3 result = vec3(0.0);
  float totalWeight = 0.0;

  float sigma = max(u_radius / 3.0, 1.0);
  int halfSize = KERNEL_SIZE / 2;

  for (int i = -halfSize; i <= halfSize; i++) {
    float weight = gaussian(float(i), sigma);
    vec2 offset = u_direction * texelSize * float(i) * u_radius;
    result += texture(u_image, v_texCoord + offset).rgb * weight;
    totalWeight += weight;
  }

  fragColor = vec4(result / totalWeight, 1.0);
}`;

/**
 * Bloom extraction shader.
 * Extracts bright areas above threshold with soft knee.
 */
export const BLOOM_EXTRACT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_image;
uniform float u_threshold;
uniform float u_softKnee;  // Soft threshold transition

void main() {
  vec3 color = texture(u_image, v_texCoord).rgb;
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));

  // Soft thresholding for smoother bloom
  float knee = u_threshold * u_softKnee;
  float soft = lum - u_threshold + knee;
  soft = clamp(soft, 0.0, 2.0 * knee);
  soft = soft * soft / (4.0 * knee + 0.0001);

  float contribution = max(soft, lum - u_threshold) / max(lum, 0.0001);
  contribution = max(contribution, 0.0);

  fragColor = vec4(color * contribution, 1.0);
}`;

/**
 * Composite shader for combining original with bloom/effects.
 * Note: FBO textures are Y-flipped, so we flip when sampling.
 */
export const COMPOSITE_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_original;
uniform sampler2D u_bloom;
uniform float u_bloomIntensity;
uniform vec3 u_bloomTint;  // For halation, tint the bloom color

void main() {
  // Flip Y to correct FBO texture orientation
  vec2 flippedCoord = vec2(v_texCoord.x, 1.0 - v_texCoord.y);
  vec3 original = texture(u_original, flippedCoord).rgb;
  vec3 bloom = texture(u_bloom, flippedCoord).rgb;

  // Additive blend with tint
  vec3 result = original + bloom * u_bloomTint * u_bloomIntensity;

  fragColor = vec4(result, 1.0);
}`;

/**
 * Final pass shader for post-effects.
 * Applies vignette, grain, and border after multi-pass processing.
 */
export const FINAL_PASS_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_image;
uniform vec2 u_resolution;

// Vignette
uniform float u_vignetteAmount;
uniform float u_vignetteMidpoint;
uniform float u_vignetteRoundness;
uniform float u_vignetteFeather;

// Grain
uniform float u_grainAmount;
uniform float u_grainSize;
uniform float u_time;

// Border
uniform float u_borderSize;
uniform vec3 u_borderColor;
uniform float u_borderOpacity;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec3 applyVignette(vec3 color, vec2 uv) {
  if (u_vignetteAmount == 0.0) return color;
  vec2 coord = uv - 0.5;
  float roundness = u_vignetteRoundness / 100.0;
  coord.x *= mix(1.0, 0.5, roundness);
  float dist = length(coord) * 2.0;
  float midpoint = u_vignetteMidpoint / 100.0;
  float feather = max(u_vignetteFeather / 100.0, 0.01);
  float vignette = smoothstep(midpoint - feather, midpoint + feather, dist);
  vignette *= u_vignetteAmount / 100.0;
  return color * (1.0 - vignette);
}

vec3 applyGrain(vec3 color, vec2 uv) {
  if (u_grainAmount == 0.0) return color;
  float size = max(u_grainSize / 100.0 * 4.0, 0.5);
  vec2 grainUV = uv * size * 100.0 + u_time;
  float grain = random(grainUV) - 0.5;
  grain *= u_grainAmount / 100.0 * 0.3;
  return color + grain;
}

vec3 applyBorder(vec3 color, vec2 uv) {
  if (u_borderSize == 0.0) return color;
  float borderWidth = u_borderSize / 100.0 * 0.2;
  float distFromEdge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  float borderMask = 1.0 - smoothstep(0.0, borderWidth, distFromEdge);
  return mix(color, u_borderColor, borderMask * (u_borderOpacity / 100.0));
}

void main() {
  vec3 color = texture(u_image, v_texCoord).rgb;

  color = applyVignette(color, v_texCoord);
  color = applyGrain(color, v_texCoord);
  color = applyBorder(color, v_texCoord);

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;

/**
 * Uniform names for the blur shader program.
 */
export const BLUR_UNIFORMS = ['u_image', 'u_direction', 'u_resolution', 'u_radius'] as const;

/**
 * Uniform names for the bloom extract shader program.
 */
export const BLOOM_EXTRACT_UNIFORMS = ['u_image', 'u_threshold', 'u_softKnee'] as const;

/**
 * Uniform names for the composite shader program.
 */
export const COMPOSITE_UNIFORMS = ['u_original', 'u_bloom', 'u_bloomIntensity', 'u_bloomTint'] as const;

/**
 * Uniform names for the final pass shader program.
 */
export const FINAL_PASS_UNIFORMS = [
  'u_image',
  'u_resolution',
  'u_vignetteAmount',
  'u_vignetteMidpoint',
  'u_vignetteRoundness',
  'u_vignetteFeather',
  'u_grainAmount',
  'u_grainSize',
  'u_time',
  'u_borderSize',
  'u_borderColor',
  'u_borderOpacity',
] as const;
