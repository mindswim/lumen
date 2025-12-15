import { EditState, Point } from '@/types/editor';

// Inline shaders (will be loaded as strings)
const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_image;
uniform sampler2D u_curveLut;

// Basic adjustments
uniform float u_exposure;
uniform float u_contrast;
uniform float u_highlights;
uniform float u_shadows;
uniform float u_whites;
uniform float u_blacks;
uniform float u_temperature;
uniform float u_tint;
uniform float u_clarity;
uniform float u_vibrance;
uniform float u_saturation;

// HSL
uniform vec3 u_hsl_red;
uniform vec3 u_hsl_orange;
uniform vec3 u_hsl_yellow;
uniform vec3 u_hsl_green;
uniform vec3 u_hsl_aqua;
uniform vec3 u_hsl_blue;
uniform vec3 u_hsl_purple;
uniform vec3 u_hsl_magenta;

// Vignette
uniform float u_vignetteAmount;
uniform float u_vignetteMidpoint;
uniform float u_vignetteRoundness;
uniform float u_vignetteFeather;

// Grain
uniform float u_grainAmount;
uniform float u_grainSize;
uniform float u_time;

// LUT
uniform sampler2D u_lut;
uniform float u_lutSize;
uniform float u_lutIntensity;
uniform bool u_hasLut;

// Curve bypass flag (true = identity curve, skip processing)
uniform bool u_curveIsIdentity;

// Fade (lifts blacks)
uniform float u_fade;

// Split Tone
uniform float u_splitHighlightHue;
uniform float u_splitHighlightSat;
uniform float u_splitShadowHue;
uniform float u_splitShadowSat;
uniform float u_splitBalance;

// Blur
uniform float u_blurAmount;
uniform int u_blurType; // 0 = gaussian, 1 = lens
uniform vec2 u_resolution;

// Border
uniform float u_borderSize;
uniform vec3 u_borderColor;
uniform float u_borderOpacity;

// Bloom (simplified single-pass glow)
uniform float u_bloomAmount;
uniform float u_bloomThreshold;
uniform float u_bloomRadius;

// Halation (film red glow effect)
uniform float u_halationAmount;
uniform float u_halationThreshold;
uniform float u_halationHue;

// Skin Tone
uniform float u_skinHue;
uniform float u_skinSaturation;
uniform float u_skinLuminance;

// Sharpening
uniform float u_sharpeningAmount;
uniform float u_sharpeningRadius;
uniform float u_sharpeningDetail;

// Noise Reduction
uniform float u_noiseReductionLuminance;
uniform float u_noiseReductionColor;
uniform float u_noiseReductionDetail;

vec3 srgbToLinear(vec3 srgb) {
  return mix(srgb / 12.92, pow((srgb + 0.055) / 1.055, vec3(2.4)), step(0.04045, srgb));
}

vec3 linearToSrgb(vec3 linear) {
  return mix(linear * 12.92, 1.055 * pow(linear, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, linear));
}

vec3 rgbToHsl(vec3 rgb) {
  float maxC = max(rgb.r, max(rgb.g, rgb.b));
  float minC = min(rgb.r, min(rgb.g, rgb.b));
  float delta = maxC - minC;
  float l = (maxC + minC) * 0.5;
  float s = 0.0;
  float h = 0.0;
  if (delta > 0.0001) {
    s = delta / (1.0 - abs(2.0 * l - 1.0));
    if (maxC == rgb.r) h = mod((rgb.g - rgb.b) / delta, 6.0);
    else if (maxC == rgb.g) h = (rgb.b - rgb.r) / delta + 2.0;
    else h = (rgb.r - rgb.g) / delta + 4.0;
    h /= 6.0;
  }
  return vec3(h, s, l);
}

vec3 hslToRgb(vec3 hsl) {
  float h = hsl.x, s = hsl.y, l = hsl.z;
  float c = (1.0 - abs(2.0 * l - 1.0)) * s;
  float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
  float m = l - c * 0.5;
  vec3 rgb;
  if (h < 1.0/6.0) rgb = vec3(c, x, 0.0);
  else if (h < 2.0/6.0) rgb = vec3(x, c, 0.0);
  else if (h < 3.0/6.0) rgb = vec3(0.0, c, x);
  else if (h < 4.0/6.0) rgb = vec3(0.0, x, c);
  else if (h < 5.0/6.0) rgb = vec3(x, 0.0, c);
  else rgb = vec3(c, 0.0, x);
  return rgb + m;
}

vec3 applyExposure(vec3 color, float exposure) {
  return color * pow(2.0, exposure);
}

vec3 applyContrast(vec3 color, float contrast) {
  float c = contrast / 100.0;
  return mix(vec3(0.5), color, 1.0 + c);
}

vec3 applyWhiteBalance(vec3 color, float temp, float tint) {
  float t = temp / 100.0 * 0.3;
  color.r += t;
  color.b -= t;
  float ti = tint / 100.0 * 0.3;
  color.g += ti;
  return color;
}

vec3 applyHighlightsShadows(vec3 color, float highlights, float shadows) {
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float shadowMask = 1.0 - smoothstep(0.0, 0.5, lum);
  color += shadowMask * (shadows / 100.0) * 0.5;
  float highlightMask = smoothstep(0.5, 1.0, lum);
  color -= highlightMask * (highlights / 100.0) * 0.5;
  return color;
}

vec3 applyWhitesBlacks(vec3 color, float whites, float blacks) {
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float blackMask = 1.0 - smoothstep(0.0, 0.25, lum);
  color += blackMask * (blacks / 100.0) * 0.3;
  float whiteMask = smoothstep(0.75, 1.0, lum);
  color += whiteMask * (whites / 100.0) * 0.3;
  return color;
}

vec3 applyVibrance(vec3 color, float vibrance) {
  float v = vibrance / 100.0;
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float maxC = max(color.r, max(color.g, color.b));
  float minC = min(color.r, min(color.g, color.b));
  float sat = (maxC - minC) / (maxC + 0.001);
  float vibranceWeight = (1.0 - sat) * v;
  return mix(vec3(lum), color, 1.0 + vibranceWeight);
}

vec3 applySaturation(vec3 color, float saturation) {
  float s = saturation / 100.0;
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return mix(vec3(lum), color, 1.0 + s);
}

float getHueWeight(float hue, float targetHue, float width) {
  float d = abs(hue - targetHue);
  d = min(d, 1.0 - d);
  return smoothstep(width, 0.0, d);
}

vec3 applyHSL(vec3 color) {
  vec3 hsl = rgbToHsl(color);
  float h = hsl.x;
  float width = 0.1;

  float wRed = getHueWeight(h, 0.0, width) + getHueWeight(h, 1.0, width);
  float wOrange = getHueWeight(h, 0.083, width);
  float wYellow = getHueWeight(h, 0.167, width);
  float wGreen = getHueWeight(h, 0.333, width);
  float wAqua = getHueWeight(h, 0.5, width);
  float wBlue = getHueWeight(h, 0.667, width);
  float wPurple = getHueWeight(h, 0.75, width);
  float wMagenta = getHueWeight(h, 0.917, width);

  float hueShift = 0.0, satShift = 0.0, lumShift = 0.0;

  hueShift += wRed * u_hsl_red.x / 100.0 * 0.1;
  satShift += wRed * u_hsl_red.y / 100.0;
  lumShift += wRed * u_hsl_red.z / 100.0;

  hueShift += wOrange * u_hsl_orange.x / 100.0 * 0.1;
  satShift += wOrange * u_hsl_orange.y / 100.0;
  lumShift += wOrange * u_hsl_orange.z / 100.0;

  hueShift += wYellow * u_hsl_yellow.x / 100.0 * 0.1;
  satShift += wYellow * u_hsl_yellow.y / 100.0;
  lumShift += wYellow * u_hsl_yellow.z / 100.0;

  hueShift += wGreen * u_hsl_green.x / 100.0 * 0.1;
  satShift += wGreen * u_hsl_green.y / 100.0;
  lumShift += wGreen * u_hsl_green.z / 100.0;

  hueShift += wAqua * u_hsl_aqua.x / 100.0 * 0.1;
  satShift += wAqua * u_hsl_aqua.y / 100.0;
  lumShift += wAqua * u_hsl_aqua.z / 100.0;

  hueShift += wBlue * u_hsl_blue.x / 100.0 * 0.1;
  satShift += wBlue * u_hsl_blue.y / 100.0;
  lumShift += wBlue * u_hsl_blue.z / 100.0;

  hueShift += wPurple * u_hsl_purple.x / 100.0 * 0.1;
  satShift += wPurple * u_hsl_purple.y / 100.0;
  lumShift += wPurple * u_hsl_purple.z / 100.0;

  hueShift += wMagenta * u_hsl_magenta.x / 100.0 * 0.1;
  satShift += wMagenta * u_hsl_magenta.y / 100.0;
  lumShift += wMagenta * u_hsl_magenta.z / 100.0;

  hsl.x = mod(hsl.x + hueShift, 1.0);
  hsl.y = clamp(hsl.y * (1.0 + satShift), 0.0, 1.0);
  hsl.z = clamp(hsl.z + lumShift * 0.3, 0.0, 1.0);

  return hslToRgb(hsl);
}

vec3 applyCurve(vec3 color) {
  if (u_curveIsIdentity) return color;
  float r = texture(u_curveLut, vec2(color.r, 0.875)).r;
  float g = texture(u_curveLut, vec2(color.g, 0.875)).g;
  float b = texture(u_curveLut, vec2(color.b, 0.875)).b;
  r = texture(u_curveLut, vec2(r, 0.625)).r;
  g = texture(u_curveLut, vec2(g, 0.375)).g;
  b = texture(u_curveLut, vec2(b, 0.125)).b;
  return vec3(r, g, b);
}

bool hasHSLAdjustments() {
  return u_hsl_red != vec3(0.0) || u_hsl_orange != vec3(0.0) ||
         u_hsl_yellow != vec3(0.0) || u_hsl_green != vec3(0.0) ||
         u_hsl_aqua != vec3(0.0) || u_hsl_blue != vec3(0.0) ||
         u_hsl_purple != vec3(0.0) || u_hsl_magenta != vec3(0.0);
}

bool hasBasicAdjustments() {
  return u_exposure != 0.0 || u_contrast != 0.0 ||
         u_highlights != 0.0 || u_shadows != 0.0 ||
         u_whites != 0.0 || u_blacks != 0.0 ||
         u_temperature != 0.0 || u_tint != 0.0;
}

vec3 applyLUT(vec3 color) {
  if (!u_hasLut) return color;
  float size = u_lutSize;
  float sliceSize = 1.0 / size;
  vec3 scaled = color * (size - 1.0);
  float blueSlice = floor(scaled.b);
  float blueSliceNext = min(blueSlice + 1.0, size - 1.0);
  float blueFract = scaled.b - blueSlice;
  vec2 uv1 = vec2((blueSlice + scaled.r * sliceSize + 0.5) / size, (scaled.g + 0.5) / size);
  vec2 uv2 = vec2((blueSliceNext + scaled.r * sliceSize + 0.5) / size, (scaled.g + 0.5) / size);
  vec3 color1 = texture(u_lut, uv1).rgb;
  vec3 color2 = texture(u_lut, uv2).rgb;
  vec3 lutColor = mix(color1, color2, blueFract);
  return mix(color, lutColor, u_lutIntensity);
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

vec3 applySplitTone(vec3 color) {
  if (u_splitHighlightSat == 0.0 && u_splitShadowSat == 0.0) return color;

  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));

  // Balance shifts the crossover point (-100 to 100 maps to 0.2-0.8)
  float balance = 0.5 + (u_splitBalance / 100.0) * 0.3;

  // Calculate shadow and highlight masks
  float shadowMask = 1.0 - smoothstep(0.0, balance, lum);
  float highlightMask = smoothstep(balance, 1.0, lum);

  // Get tint colors from hue
  vec3 shadowTint = hueToRgb(u_splitShadowHue);
  vec3 highlightTint = hueToRgb(u_splitHighlightHue);

  // Apply tints based on saturation and masks
  float shadowStrength = (u_splitShadowSat / 100.0) * shadowMask * 0.3;
  float highlightStrength = (u_splitHighlightSat / 100.0) * highlightMask * 0.3;

  color = mix(color, shadowTint * lum + color * (1.0 - lum), shadowStrength);
  color = mix(color, highlightTint * lum + color * (1.0 - lum), highlightStrength);

  return color;
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

// Skin tone adjustment - targets skin color range (orange-red hues)
vec3 applySkinTone(vec3 color) {
  if (u_skinHue == 0.0 && u_skinSaturation == 0.0 && u_skinLuminance == 0.0) return color;

  vec3 hsl = rgbToHsl(color);

  // Skin tones are typically in the orange-red range (hue ~0.02-0.08, roughly 7-30 degrees)
  // With moderate saturation (0.3-0.7)
  float skinHueCenter = 0.05; // ~18 degrees (orange-pink)
  float skinHueWidth = 0.06;

  // Calculate how much this pixel matches skin tone
  float hueDist = abs(hsl.x - skinHueCenter);
  hueDist = min(hueDist, 1.0 - hueDist); // Handle wrap-around

  float skinWeight = smoothstep(skinHueWidth, 0.0, hueDist);

  // Also weight by saturation - skin has moderate saturation
  skinWeight *= smoothstep(0.15, 0.35, hsl.y) * smoothstep(0.85, 0.65, hsl.y);

  // Apply adjustments weighted by skin detection
  hsl.x += (u_skinHue / 100.0) * 0.05 * skinWeight;
  hsl.y *= 1.0 + (u_skinSaturation / 100.0) * skinWeight;
  hsl.z += (u_skinLuminance / 100.0) * 0.2 * skinWeight;

  hsl.x = mod(hsl.x, 1.0);
  hsl.y = clamp(hsl.y, 0.0, 1.0);
  hsl.z = clamp(hsl.z, 0.0, 1.0);

  return hslToRgb(hsl);
}

// Sharpening using unsharp mask technique
// NOTE: Simplified single-pass version. Professional needs multi-pass with larger kernels
vec3 applySharpening(vec3 color, vec2 uv) {
  if (u_sharpeningAmount == 0.0) return color;

  vec2 texelSize = 1.0 / u_resolution;
  float radius = u_sharpeningRadius;

  // Sample surrounding pixels for blur (unsharp mask base)
  vec3 blurred = vec3(0.0);
  float totalWeight = 0.0;

  // Use a 5x5 kernel scaled by radius
  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      vec2 offset = vec2(float(x), float(y)) * texelSize * radius;
      float weight = exp(-float(x*x + y*y) / (2.0 * radius * radius));
      blurred += texture(u_image, uv + offset).rgb * weight;
      totalWeight += weight;
    }
  }
  blurred /= totalWeight;

  // Calculate the mask (difference between original and blurred)
  vec3 mask = color - blurred;

  // Detail preservation: reduce sharpening in low-contrast areas
  float maskStrength = length(mask);
  float detailThreshold = (100.0 - u_sharpeningDetail) / 100.0 * 0.1;
  float detailFactor = smoothstep(0.0, detailThreshold, maskStrength);

  // Apply sharpening
  float amount = u_sharpeningAmount / 100.0 * 2.0;
  return color + mask * amount * detailFactor;
}

// Noise reduction using bilateral filter approximation
// NOTE: Simplified single-pass version. Professional needs edge-aware bilateral filtering
vec3 applyNoiseReduction(vec3 color, vec2 uv) {
  if (u_noiseReductionLuminance == 0.0 && u_noiseReductionColor == 0.0) return color;

  vec2 texelSize = 1.0 / u_resolution;
  float lumStrength = u_noiseReductionLuminance / 100.0;
  float colorStrength = u_noiseReductionColor / 100.0;
  float detailPreserve = u_noiseReductionDetail / 100.0;

  // Convert to YCbCr-like space for separate luminance/chroma processing
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  vec3 chroma = color - lum;

  // Blur for noise reduction (5x5 kernel)
  float lumBlurred = 0.0;
  vec3 chromaBlurred = vec3(0.0);
  float totalWeight = 0.0;

  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      vec2 offset = vec2(float(x), float(y)) * texelSize * 1.5;
      vec3 sampleColor = texture(u_image, uv + offset).rgb;
      float sampleLum = dot(sampleColor, vec3(0.2126, 0.7152, 0.0722));
      vec3 sampleChroma = sampleColor - sampleLum;

      // Spatial weight (Gaussian)
      float spatialWeight = exp(-float(x*x + y*y) / 8.0);

      // Range weight (bilateral - preserve edges)
      float lumDiff = abs(sampleLum - lum);
      float rangeWeight = exp(-lumDiff * lumDiff / (0.1 * (1.0 - detailPreserve * 0.9) + 0.01));

      float weight = spatialWeight * rangeWeight;

      lumBlurred += sampleLum * weight;
      chromaBlurred += sampleChroma * weight;
      totalWeight += weight;
    }
  }

  lumBlurred /= totalWeight;
  chromaBlurred /= totalWeight;

  // Blend original and blurred based on strength
  float finalLum = mix(lum, lumBlurred, lumStrength);
  vec3 finalChroma = mix(chroma, chromaBlurred, colorStrength);

  return finalLum + finalChroma;
}

void main() {
  vec4 texColor = texture(u_image, v_texCoord);
  vec3 color = texColor.rgb;

  // Only apply linear space conversion if we have adjustments that need it
  if (hasBasicAdjustments()) {
    color = srgbToLinear(color);
    if (u_temperature != 0.0 || u_tint != 0.0) {
      color = applyWhiteBalance(color, u_temperature, u_tint);
    }
    if (u_exposure != 0.0) {
      color = applyExposure(color, u_exposure);
    }
    if (u_contrast != 0.0) {
      color = applyContrast(color, u_contrast);
    }
    if (u_highlights != 0.0 || u_shadows != 0.0) {
      color = applyHighlightsShadows(color, u_highlights, u_shadows);
    }
    if (u_whites != 0.0 || u_blacks != 0.0) {
      color = applyWhitesBlacks(color, u_whites, u_blacks);
    }
    color = linearToSrgb(color);
    color = clamp(color, 0.0, 1.0);
  }

  // Curve (only if not identity)
  color = applyCurve(color);

  // HSL (only if any color has adjustments)
  if (hasHSLAdjustments()) {
    color = applyHSL(color);
  }

  // Vibrance/Saturation
  if (u_vibrance != 0.0) {
    color = applyVibrance(color, u_vibrance);
  }
  if (u_saturation != 0.0) {
    color = applySaturation(color, u_saturation);
  }

  // Skin tone (selective color adjustment)
  color = applySkinTone(color);

  // Detail adjustments (apply before color grading effects)
  color = applyNoiseReduction(color, v_texCoord);
  color = applySharpening(color, v_texCoord);

  // LUT (already has internal check)
  color = applyLUT(color);

  // Split tone (color grading for highlights/shadows)
  color = applySplitTone(color);

  // Fade (lifts blacks for matte look)
  color = applyFade(color);

  // Bloom (glow on bright areas)
  color = applyBloom(color, v_texCoord);

  // Halation (film red glow effect)
  color = applyHalation(color, v_texCoord);

  // Effects (already have internal checks)
  color = applyVignette(color, v_texCoord);
  color = applyGrain(color, v_texCoord);

  // Blur (single-pass approximation)
  color = applyBlur(color, v_texCoord);

  // Border (applied last, over everything)
  color = applyBorder(color, v_texCoord);

  fragColor = vec4(clamp(color, 0.0, 1.0), texColor.a);
}`;

export class WebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private imageTexture: WebGLTexture | null = null;
  private curveLutTexture: WebGLTexture | null = null;
  private lutTexture: WebGLTexture | null = null;
  private positionBuffer: WebGLBuffer;
  private texCoordBuffer: WebGLBuffer;
  private uniformLocations: Map<string, WebGLUniformLocation> = new Map();
  private startTime: number = Date.now();
  private lutSize: number = 0;

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

    // Create shader program
    this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);
    gl.useProgram(this.program);

    // Create buffers
    this.positionBuffer = this.createBuffer(
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
    );
    this.texCoordBuffer = this.createBuffer(
      new Float32Array([0, 1, 1, 1, 0, 0, 1, 0])
    );

    // Set up attributes
    const positionLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const texCoordLoc = gl.getAttribLocation(this.program, 'a_texCoord');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

    // Cache uniform locations
    this.cacheUniformLocations();

    // Create default curve LUT
    this.createDefaultCurveLut();
  }

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

  private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
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

  private createBuffer(data: Float32Array): WebGLBuffer {
    const buffer = this.gl.createBuffer();
    if (!buffer) throw new Error('Failed to create buffer');

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);

    return buffer;
  }

  private cacheUniformLocations(): void {
    const uniforms = [
      'u_image',
      'u_curveLut',
      'u_exposure',
      'u_contrast',
      'u_highlights',
      'u_shadows',
      'u_whites',
      'u_blacks',
      'u_temperature',
      'u_tint',
      'u_clarity',
      'u_vibrance',
      'u_saturation',
      'u_hsl_red',
      'u_hsl_orange',
      'u_hsl_yellow',
      'u_hsl_green',
      'u_hsl_aqua',
      'u_hsl_blue',
      'u_hsl_purple',
      'u_hsl_magenta',
      'u_vignetteAmount',
      'u_vignetteMidpoint',
      'u_vignetteRoundness',
      'u_vignetteFeather',
      'u_grainAmount',
      'u_grainSize',
      'u_time',
      'u_lut',
      'u_lutSize',
      'u_lutIntensity',
      'u_hasLut',
      'u_curveIsIdentity',
      'u_fade',
      'u_splitHighlightHue',
      'u_splitHighlightSat',
      'u_splitShadowHue',
      'u_splitShadowSat',
      'u_splitBalance',
      'u_blurAmount',
      'u_blurType',
      'u_resolution',
      'u_borderSize',
      'u_borderColor',
      'u_borderOpacity',
      'u_bloomAmount',
      'u_bloomThreshold',
      'u_bloomRadius',
      'u_halationAmount',
      'u_halationThreshold',
      'u_halationHue',
      'u_skinHue',
      'u_skinSaturation',
      'u_skinLuminance',
      'u_sharpeningAmount',
      'u_sharpeningRadius',
      'u_sharpeningDetail',
      'u_noiseReductionLuminance',
      'u_noiseReductionColor',
      'u_noiseReductionDetail',
    ];

    for (const name of uniforms) {
      const location = this.gl.getUniformLocation(this.program, name);
      if (location) {
        this.uniformLocations.set(name, location);
      }
    }
  }

  private getUniform(name: string): WebGLUniformLocation | null {
    return this.uniformLocations.get(name) || null;
  }

  private createDefaultCurveLut(): void {
    const gl = this.gl;

    // Create a 256x4 texture for curves (RGB, R, G, B channels)
    const data = new Uint8Array(256 * 4 * 4);

    // Initialize with identity (diagonal)
    for (let i = 0; i < 256; i++) {
      // Row 0: RGB curve
      data[i * 4 + 0] = i; // R
      data[i * 4 + 1] = i; // G
      data[i * 4 + 2] = i; // B
      data[i * 4 + 3] = 255;

      // Row 1: Red curve
      data[256 * 4 + i * 4 + 0] = i;
      data[256 * 4 + i * 4 + 1] = i;
      data[256 * 4 + i * 4 + 2] = i;
      data[256 * 4 + i * 4 + 3] = 255;

      // Row 2: Green curve
      data[512 * 4 + i * 4 + 0] = i;
      data[512 * 4 + i * 4 + 1] = i;
      data[512 * 4 + i * 4 + 2] = i;
      data[512 * 4 + i * 4 + 3] = 255;

      // Row 3: Blue curve
      data[768 * 4 + i * 4 + 0] = i;
      data[768 * 4 + i * 4 + 1] = i;
      data[768 * 4 + i * 4 + 2] = i;
      data[768 * 4 + i * 4 + 3] = 255;
    }

    this.curveLutTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.curveLutTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 4, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  setImage(image: HTMLImageElement): void {
    const gl = this.gl;

    // Update canvas size to match image aspect ratio
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

    this.canvas.width = width;
    this.canvas.height = height;
    gl.viewport(0, 0, width, height);

    // Create texture
    if (this.imageTexture) {
      gl.deleteTexture(this.imageTexture);
    }

    this.imageTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  updateCurveLut(curve: EditState['curve']): void {
    const gl = this.gl;
    const data = new Uint8Array(256 * 4 * 4);

    // Helper to interpolate curve
    const interpolate = (points: Point[], x: number): number => {
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
    };

    for (let i = 0; i < 256; i++) {
      const x = i / 255;

      // RGB curve
      const rgb = interpolate(curve.rgb, x);
      data[i * 4 + 0] = Math.round(rgb * 255);
      data[i * 4 + 1] = Math.round(rgb * 255);
      data[i * 4 + 2] = Math.round(rgb * 255);
      data[i * 4 + 3] = 255;

      // Red curve
      const r = interpolate(curve.red, x);
      data[256 * 4 + i * 4 + 0] = Math.round(r * 255);
      data[256 * 4 + i * 4 + 1] = Math.round(r * 255);
      data[256 * 4 + i * 4 + 2] = Math.round(r * 255);
      data[256 * 4 + i * 4 + 3] = 255;

      // Green curve
      const g = interpolate(curve.green, x);
      data[512 * 4 + i * 4 + 0] = Math.round(g * 255);
      data[512 * 4 + i * 4 + 1] = Math.round(g * 255);
      data[512 * 4 + i * 4 + 2] = Math.round(g * 255);
      data[512 * 4 + i * 4 + 3] = 255;

      // Blue curve
      const b = interpolate(curve.blue, x);
      data[768 * 4 + i * 4 + 0] = Math.round(b * 255);
      data[768 * 4 + i * 4 + 1] = Math.round(b * 255);
      data[768 * 4 + i * 4 + 2] = Math.round(b * 255);
      data[768 * 4 + i * 4 + 3] = 255;
    }

    gl.bindTexture(gl.TEXTURE_2D, this.curveLutTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 4, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  }

  setLut(lutData: Uint8Array, size: number): void {
    const gl = this.gl;

    if (this.lutTexture) {
      gl.deleteTexture(this.lutTexture);
    }

    this.lutSize = size;
    this.lutTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.lutTexture);

    // LUT is stored as horizontal strips (size x size, with size strips)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      size * size,
      size,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      lutData
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  clearLut(): void {
    if (this.lutTexture) {
      this.gl.deleteTexture(this.lutTexture);
      this.lutTexture = null;
      this.lutSize = 0;
    }
  }

  render(editState: EditState): void {
    const gl = this.gl;

    if (!this.imageTexture) return;

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);

    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
    gl.uniform1i(this.getUniform('u_image'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.curveLutTexture);
    gl.uniform1i(this.getUniform('u_curveLut'), 1);

    gl.activeTexture(gl.TEXTURE2);
    if (this.lutTexture) {
      gl.bindTexture(gl.TEXTURE_2D, this.lutTexture);
    }
    gl.uniform1i(this.getUniform('u_lut'), 2);

    // Set uniforms
    gl.uniform1f(this.getUniform('u_exposure'), editState.exposure);
    gl.uniform1f(this.getUniform('u_contrast'), editState.contrast);
    gl.uniform1f(this.getUniform('u_highlights'), editState.highlights);
    gl.uniform1f(this.getUniform('u_shadows'), editState.shadows);
    gl.uniform1f(this.getUniform('u_whites'), editState.whites);
    gl.uniform1f(this.getUniform('u_blacks'), editState.blacks);
    gl.uniform1f(this.getUniform('u_temperature'), editState.temperature);
    gl.uniform1f(this.getUniform('u_tint'), editState.tint);
    gl.uniform1f(this.getUniform('u_clarity'), editState.clarity);
    gl.uniform1f(this.getUniform('u_vibrance'), editState.vibrance);
    gl.uniform1f(this.getUniform('u_saturation'), editState.saturation);

    // HSL
    const hsl = editState.hsl;
    gl.uniform3f(this.getUniform('u_hsl_red'), hsl.red.hue, hsl.red.saturation, hsl.red.luminance);
    gl.uniform3f(this.getUniform('u_hsl_orange'), hsl.orange.hue, hsl.orange.saturation, hsl.orange.luminance);
    gl.uniform3f(this.getUniform('u_hsl_yellow'), hsl.yellow.hue, hsl.yellow.saturation, hsl.yellow.luminance);
    gl.uniform3f(this.getUniform('u_hsl_green'), hsl.green.hue, hsl.green.saturation, hsl.green.luminance);
    gl.uniform3f(this.getUniform('u_hsl_aqua'), hsl.aqua.hue, hsl.aqua.saturation, hsl.aqua.luminance);
    gl.uniform3f(this.getUniform('u_hsl_blue'), hsl.blue.hue, hsl.blue.saturation, hsl.blue.luminance);
    gl.uniform3f(this.getUniform('u_hsl_purple'), hsl.purple.hue, hsl.purple.saturation, hsl.purple.luminance);
    gl.uniform3f(this.getUniform('u_hsl_magenta'), hsl.magenta.hue, hsl.magenta.saturation, hsl.magenta.luminance);

    // Vignette
    gl.uniform1f(this.getUniform('u_vignetteAmount'), editState.vignette.amount);
    gl.uniform1f(this.getUniform('u_vignetteMidpoint'), editState.vignette.midpoint);
    gl.uniform1f(this.getUniform('u_vignetteRoundness'), editState.vignette.roundness);
    gl.uniform1f(this.getUniform('u_vignetteFeather'), editState.vignette.feather);

    // Grain
    gl.uniform1f(this.getUniform('u_grainAmount'), editState.grain.amount);
    gl.uniform1f(this.getUniform('u_grainSize'), editState.grain.size);
    gl.uniform1f(this.getUniform('u_time'), (Date.now() - this.startTime) / 1000);

    // LUT
    gl.uniform1f(this.getUniform('u_lutSize'), this.lutSize);
    gl.uniform1f(this.getUniform('u_lutIntensity'), editState.lutIntensity / 100);
    gl.uniform1i(this.getUniform('u_hasLut'), this.lutTexture ? 1 : 0);

    // Curve identity check (skip curve processing if it's just default diagonal)
    const curveIsIdentity = this.isCurveIdentity(editState.curve);
    gl.uniform1i(this.getUniform('u_curveIsIdentity'), curveIsIdentity ? 1 : 0);

    // Fade
    gl.uniform1f(this.getUniform('u_fade'), editState.fade);

    // Split Tone
    gl.uniform1f(this.getUniform('u_splitHighlightHue'), editState.splitTone.highlightHue);
    gl.uniform1f(this.getUniform('u_splitHighlightSat'), editState.splitTone.highlightSaturation);
    gl.uniform1f(this.getUniform('u_splitShadowHue'), editState.splitTone.shadowHue);
    gl.uniform1f(this.getUniform('u_splitShadowSat'), editState.splitTone.shadowSaturation);
    gl.uniform1f(this.getUniform('u_splitBalance'), editState.splitTone.balance);

    // Blur
    gl.uniform1f(this.getUniform('u_blurAmount'), editState.blur.amount);
    gl.uniform1i(this.getUniform('u_blurType'), editState.blur.type === 'gaussian' ? 0 : 1);
    gl.uniform2f(this.getUniform('u_resolution'), this.canvas.width, this.canvas.height);

    // Border
    gl.uniform1f(this.getUniform('u_borderSize'), editState.border.size);
    // Parse hex color to RGB
    const borderColor = this.hexToRgb(editState.border.color);
    gl.uniform3f(this.getUniform('u_borderColor'), borderColor.r, borderColor.g, borderColor.b);
    gl.uniform1f(this.getUniform('u_borderOpacity'), editState.border.opacity);

    // Bloom
    gl.uniform1f(this.getUniform('u_bloomAmount'), editState.bloom.amount);
    gl.uniform1f(this.getUniform('u_bloomThreshold'), editState.bloom.threshold);
    gl.uniform1f(this.getUniform('u_bloomRadius'), editState.bloom.radius);

    // Halation
    gl.uniform1f(this.getUniform('u_halationAmount'), editState.halation.amount);
    gl.uniform1f(this.getUniform('u_halationThreshold'), editState.halation.threshold);
    gl.uniform1f(this.getUniform('u_halationHue'), editState.halation.hue);

    // Skin Tone
    gl.uniform1f(this.getUniform('u_skinHue'), editState.skinTone.hue);
    gl.uniform1f(this.getUniform('u_skinSaturation'), editState.skinTone.saturation);
    gl.uniform1f(this.getUniform('u_skinLuminance'), editState.skinTone.luminance);

    // Sharpening
    gl.uniform1f(this.getUniform('u_sharpeningAmount'), editState.sharpening.amount);
    gl.uniform1f(this.getUniform('u_sharpeningRadius'), editState.sharpening.radius);
    gl.uniform1f(this.getUniform('u_sharpeningDetail'), editState.sharpening.detail);

    // Noise Reduction
    gl.uniform1f(this.getUniform('u_noiseReductionLuminance'), editState.noiseReduction.luminance);
    gl.uniform1f(this.getUniform('u_noiseReductionColor'), editState.noiseReduction.color);
    gl.uniform1f(this.getUniform('u_noiseReductionDetail'), editState.noiseReduction.detail);

    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255,
        }
      : { r: 1, g: 1, b: 1 };
  }

  private isCurveIdentity(curve: EditState['curve']): boolean {
    const isChannelIdentity = (points: Point[]): boolean => {
      if (points.length !== 2) return false;
      return (
        Math.abs(points[0].x - 0) < 0.001 &&
        Math.abs(points[0].y - 0) < 0.001 &&
        Math.abs(points[1].x - 1) < 0.001 &&
        Math.abs(points[1].y - 1) < 0.001
      );
    };

    return (
      isChannelIdentity(curve.rgb) &&
      isChannelIdentity(curve.red) &&
      isChannelIdentity(curve.green) &&
      isChannelIdentity(curve.blue)
    );
  }

  exportImage(editState: EditState, originalImage: HTMLImageElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      // Create offscreen canvas at full resolution
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = originalImage.width;
      offscreenCanvas.height = originalImage.height;

      const offscreenRenderer = new WebGLRenderer(offscreenCanvas);
      offscreenRenderer.setImage(originalImage);

      // Copy LUT if set
      if (this.lutTexture && this.lutSize > 0) {
        // We'd need to copy LUT data, simplified here
      }

      offscreenRenderer.updateCurveLut(editState.curve);
      offscreenRenderer.render(editState);

      offscreenCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to export image'));
          }
          offscreenRenderer.dispose();
        },
        'image/jpeg',
        0.95
      );
    });
  }

  dispose(): void {
    const gl = this.gl;

    if (this.imageTexture) gl.deleteTexture(this.imageTexture);
    if (this.curveLutTexture) gl.deleteTexture(this.curveLutTexture);
    if (this.lutTexture) gl.deleteTexture(this.lutTexture);
    gl.deleteBuffer(this.positionBuffer);
    gl.deleteBuffer(this.texCoordBuffer);
    gl.deleteProgram(this.program);
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
