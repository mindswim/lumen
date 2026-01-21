/**
 * Visual effects: vignette, grain, fade, border, blur, bloom, halation.
 */
export const EFFECTS_FUNCTIONS = `
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

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec3 applyGrain(vec3 color, vec2 uv) {
  if (u_grainAmount == 0.0) return color;
  float size = max(u_grainSize / 100.0 * 4.0, 0.5);
  vec2 grainUV = uv * size * 100.0 + u_time;
  float grain = random(grainUV) - 0.5;
  grain *= u_grainAmount / 100.0 * 0.3;
  return color + grain;
}

vec3 applyFade(vec3 color) {
  if (u_fade == 0.0) return color;
  // Fade lifts the black point, creating a matte/faded look
  float fadeAmount = u_fade / 100.0 * 0.3;
  return color + fadeAmount * (1.0 - color);
}

vec3 applyBorder(vec3 color, vec2 uv) {
  if (u_borderSize == 0.0) return color;

  float borderWidth = u_borderSize / 100.0 * 0.2; // Max 20% border

  // Calculate distance from edges
  float distFromEdge = min(
    min(uv.x, 1.0 - uv.x),
    min(uv.y, 1.0 - uv.y)
  );

  // Create border mask with soft edge
  float borderMask = 1.0 - smoothstep(0.0, borderWidth, distFromEdge);

  // Apply border color with opacity
  return mix(color, u_borderColor, borderMask * (u_borderOpacity / 100.0));
}

vec3 applyBlur(vec3 color, vec2 uv) {
  if (u_blurAmount == 0.0) return color;

  // Single-pass blur approximation using 9 samples
  float blurRadius = u_blurAmount / 100.0 * 0.02;
  vec2 texelSize = 1.0 / u_resolution;

  vec3 result = vec3(0.0);
  float totalWeight = 0.0;

  // 3x3 kernel with gaussian-like weights
  float weights[9] = float[](
    1.0, 2.0, 1.0,
    2.0, 4.0, 2.0,
    1.0, 2.0, 1.0
  );

  vec2 offsets[9] = vec2[](
    vec2(-1, -1), vec2(0, -1), vec2(1, -1),
    vec2(-1,  0), vec2(0,  0), vec2(1,  0),
    vec2(-1,  1), vec2(0,  1), vec2(1,  1)
  );

  for (int i = 0; i < 9; i++) {
    vec2 sampleUV = uv + offsets[i] * texelSize * blurRadius * 50.0;
    result += texture(u_image, sampleUV).rgb * weights[i];
    totalWeight += weights[i];
  }

  vec3 blurred = result / totalWeight;

  // Mix original and blurred based on amount
  return mix(color, blurred, u_blurAmount / 100.0);
}

// hueToRgb helper for bloom/halation tinting
vec3 hueToRgb(float hue) {
  // Convert hue (0-360) to RGB for split tone
  float h = mod(hue, 360.0) / 60.0;
  float x = 1.0 - abs(mod(h, 2.0) - 1.0);
  vec3 rgb;
  if (h < 1.0) rgb = vec3(1.0, x, 0.0);
  else if (h < 2.0) rgb = vec3(x, 1.0, 0.0);
  else if (h < 3.0) rgb = vec3(0.0, 1.0, x);
  else if (h < 4.0) rgb = vec3(0.0, x, 1.0);
  else if (h < 5.0) rgb = vec3(x, 0.0, 1.0);
  else rgb = vec3(1.0, 0.0, x);
  return rgb;
}

// Simplified bloom - extracts bright areas and adds glow
// NOTE: Professional version needs multi-pass with framebuffers
vec3 applyBloom(vec3 color, vec2 uv) {
  if (u_bloomAmount == 0.0) return color;

  float threshold = u_bloomThreshold / 100.0;
  float radius = u_bloomRadius / 100.0 * 0.03;
  vec2 texelSize = 1.0 / u_resolution;

  // Sample surrounding pixels for glow
  vec3 bloom = vec3(0.0);
  float totalWeight = 0.0;

  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      vec2 offset = vec2(float(x), float(y)) * texelSize * radius * 50.0;
      vec3 sample_color = texture(u_image, uv + offset).rgb;
      float lum = dot(sample_color, vec3(0.2126, 0.7152, 0.0722));

      // Only include bright pixels above threshold
      float brightPass = max(0.0, lum - threshold) / (1.0 - threshold + 0.001);
      float weight = exp(-float(x*x + y*y) / 4.0);

      bloom += sample_color * brightPass * weight;
      totalWeight += weight;
    }
  }

  bloom /= totalWeight;

  // Add bloom to original (additive blend)
  return color + bloom * (u_bloomAmount / 100.0);
}

// Simplified halation - red/orange glow around bright areas (film effect)
// NOTE: Professional version needs multi-pass with framebuffers
vec3 applyHalation(vec3 color, vec2 uv) {
  if (u_halationAmount == 0.0) return color;

  float threshold = u_halationThreshold / 100.0;
  vec2 texelSize = 1.0 / u_resolution;

  // Sample surrounding pixels for halation glow
  vec3 halation = vec3(0.0);
  float totalWeight = 0.0;

  for (int x = -3; x <= 3; x++) {
    for (int y = -3; y <= 3; y++) {
      vec2 offset = vec2(float(x), float(y)) * texelSize * 15.0;
      vec3 sample_color = texture(u_image, uv + offset).rgb;
      float lum = dot(sample_color, vec3(0.2126, 0.7152, 0.0722));

      // Only include very bright pixels
      float brightPass = max(0.0, lum - threshold) / (1.0 - threshold + 0.001);
      float weight = exp(-float(x*x + y*y) / 8.0);

      halation += sample_color * brightPass * weight;
      totalWeight += weight;
    }
  }

  halation /= totalWeight;

  // Tint the halation with the specified hue (typically red-orange)
  vec3 halationTint = hueToRgb(u_halationHue);

  // Apply halation as colored glow
  return color + halation * halationTint * (u_halationAmount / 100.0) * 0.5;
}
`;
