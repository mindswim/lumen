import { EditState, Point } from '@/types/editor';

// ============================================================================
// SHADERS
// ============================================================================

// Basic vertex shader used by all passes
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

// Camera Calibration (RGB primary shifts)
uniform float u_calibrationRedHue;
uniform float u_calibrationRedSat;
uniform float u_calibrationGreenHue;
uniform float u_calibrationGreenSat;
uniform float u_calibrationBlueHue;
uniform float u_calibrationBlueSat;

// B&W / Grayscale
uniform bool u_convertToGrayscale;
uniform float u_grayMixerRed;
uniform float u_grayMixerOrange;
uniform float u_grayMixerYellow;
uniform float u_grayMixerGreen;
uniform float u_grayMixerAqua;
uniform float u_grayMixerBlue;
uniform float u_grayMixerPurple;
uniform float u_grayMixerMagenta;

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

// Clarity - local contrast enhancement using unsharp mask at larger radius
vec3 applyClarity(vec3 color, vec2 uv) {
  if (u_clarity == 0.0) return color;

  vec2 texelSize = 1.0 / u_resolution;
  float radius = 10.0; // Larger radius than sharpening for "local contrast"

  // Sample surrounding pixels for local average
  vec3 localAvg = vec3(0.0);
  float totalWeight = 0.0;

  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      vec2 offset = vec2(float(x), float(y)) * texelSize * radius;
      float weight = exp(-float(x*x + y*y) / 8.0);
      localAvg += texture(u_image, uv + offset).rgb * weight;
      totalWeight += weight;
    }
  }
  localAvg /= totalWeight;

  // Enhance local contrast by boosting difference from local average
  float clarityAmount = u_clarity / 100.0;
  vec3 diff = color - localAvg;
  return color + diff * clarityAmount;
}

float getHueWeight(float hue, float targetHue, float width) {
  float d = abs(hue - targetHue);
  d = min(d, 1.0 - d);
  return smoothstep(width, 0.0, d);
}

vec3 applyHSL(vec3 color) {
  vec3 hsl = rgbToHsl(color);
  float h = hsl.x;
  float width = 0.12;

  float wRed = getHueWeight(h, 0.0, width) + getHueWeight(h, 1.0, width);
  float wOrange = getHueWeight(h, 0.083, width);
  float wYellow = getHueWeight(h, 0.167, width);
  float wGreen = getHueWeight(h, 0.333, width);
  float wAqua = getHueWeight(h, 0.5, width);
  float wBlue = getHueWeight(h, 0.667, width);
  float wPurple = getHueWeight(h, 0.75, width);
  float wMagenta = getHueWeight(h, 0.917, width);

  float hueShift = 0.0, satShift = 0.0, lumShift = 0.0;

  hueShift += wRed * u_hsl_red.x / 100.0 * 0.2;
  satShift += wRed * u_hsl_red.y / 100.0;
  lumShift += wRed * u_hsl_red.z / 100.0;

  hueShift += wOrange * u_hsl_orange.x / 100.0 * 0.2;
  satShift += wOrange * u_hsl_orange.y / 100.0;
  lumShift += wOrange * u_hsl_orange.z / 100.0;

  hueShift += wYellow * u_hsl_yellow.x / 100.0 * 0.2;
  satShift += wYellow * u_hsl_yellow.y / 100.0;
  lumShift += wYellow * u_hsl_yellow.z / 100.0;

  hueShift += wGreen * u_hsl_green.x / 100.0 * 0.2;
  satShift += wGreen * u_hsl_green.y / 100.0;
  lumShift += wGreen * u_hsl_green.z / 100.0;

  hueShift += wAqua * u_hsl_aqua.x / 100.0 * 0.2;
  satShift += wAqua * u_hsl_aqua.y / 100.0;
  lumShift += wAqua * u_hsl_aqua.z / 100.0;

  hueShift += wBlue * u_hsl_blue.x / 100.0 * 0.2;
  satShift += wBlue * u_hsl_blue.y / 100.0;
  lumShift += wBlue * u_hsl_blue.z / 100.0;

  hueShift += wPurple * u_hsl_purple.x / 100.0 * 0.2;
  satShift += wPurple * u_hsl_purple.y / 100.0;
  lumShift += wPurple * u_hsl_purple.z / 100.0;

  hueShift += wMagenta * u_hsl_magenta.x / 100.0 * 0.2;
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

// Camera Calibration - shifts RGB primaries like Lightroom's Camera Calibration
vec3 applyCameraCalibration(vec3 color) {
  // Check if any calibration is applied
  if (u_calibrationRedHue == 0.0 && u_calibrationRedSat == 0.0 &&
      u_calibrationGreenHue == 0.0 && u_calibrationGreenSat == 0.0 &&
      u_calibrationBlueHue == 0.0 && u_calibrationBlueSat == 0.0) {
    return color;
  }

  vec3 hsl = rgbToHsl(color);

  // Red primary adjustment (affects reds and magentas)
  float redWeight = getHueWeight(hsl.x, 0.0, 0.15) + getHueWeight(hsl.x, 1.0, 0.15);
  redWeight += getHueWeight(hsl.x, 0.917, 0.1) * 0.5; // Partial magenta

  // Green primary adjustment (affects greens and yellows)
  float greenWeight = getHueWeight(hsl.x, 0.333, 0.15);
  greenWeight += getHueWeight(hsl.x, 0.167, 0.1) * 0.5; // Partial yellow

  // Blue primary adjustment (affects blues and cyans)
  float blueWeight = getHueWeight(hsl.x, 0.667, 0.15);
  blueWeight += getHueWeight(hsl.x, 0.5, 0.1) * 0.5; // Partial cyan

  // Apply hue shifts
  float hueShift = 0.0;
  hueShift += redWeight * u_calibrationRedHue / 100.0 * 0.15;
  hueShift += greenWeight * u_calibrationGreenHue / 100.0 * 0.15;
  hueShift += blueWeight * u_calibrationBlueHue / 100.0 * 0.15;

  // Apply saturation adjustments
  float satMult = 1.0;
  satMult += redWeight * u_calibrationRedSat / 100.0;
  satMult += greenWeight * u_calibrationGreenSat / 100.0;
  satMult += blueWeight * u_calibrationBlueSat / 100.0;

  hsl.x = mod(hsl.x + hueShift, 1.0);
  hsl.y = clamp(hsl.y * satMult, 0.0, 1.0);

  return hslToRgb(hsl);
}

// Convert to grayscale using Gray Mixer weights
vec3 applyGrayscale(vec3 color) {
  if (!u_convertToGrayscale) return color;

  vec3 hsl = rgbToHsl(color);
  float h = hsl.x;
  float width = 0.12;

  // Calculate weights for each color
  float wRed = getHueWeight(h, 0.0, width) + getHueWeight(h, 1.0, width);
  float wOrange = getHueWeight(h, 0.083, width);
  float wYellow = getHueWeight(h, 0.167, width);
  float wGreen = getHueWeight(h, 0.333, width);
  float wAqua = getHueWeight(h, 0.5, width);
  float wBlue = getHueWeight(h, 0.667, width);
  float wPurple = getHueWeight(h, 0.75, width);
  float wMagenta = getHueWeight(h, 0.917, width);

  // Base luminance
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));

  // Apply gray mixer adjustments (each color contributes to final luminance)
  float mixerAdjust = 0.0;
  mixerAdjust += wRed * u_grayMixerRed / 100.0;
  mixerAdjust += wOrange * u_grayMixerOrange / 100.0;
  mixerAdjust += wYellow * u_grayMixerYellow / 100.0;
  mixerAdjust += wGreen * u_grayMixerGreen / 100.0;
  mixerAdjust += wAqua * u_grayMixerAqua / 100.0;
  mixerAdjust += wBlue * u_grayMixerBlue / 100.0;
  mixerAdjust += wPurple * u_grayMixerPurple / 100.0;
  mixerAdjust += wMagenta * u_grayMixerMagenta / 100.0;

  // Adjust luminance based on mixer (scaled by original saturation for color sensitivity)
  lum = clamp(lum + mixerAdjust * hsl.y * 0.5, 0.0, 1.0);

  return vec3(lum);
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

  // Camera Calibration (RGB primary shifts - apply early like Lightroom)
  color = applyCameraCalibration(color);

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

  // Clarity (local contrast enhancement)
  if (u_clarity != 0.0) {
    color = applyClarity(color, v_texCoord);
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

  // B&W conversion (if enabled, applied after color grading)
  color = applyGrayscale(color);

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

// ============================================================================
// MULTI-PASS SHADERS
// ============================================================================

// Separable Gaussian blur shader - used for horizontal and vertical passes
const BLUR_SHADER = `#version 300 es
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

// Bloom extraction shader - extracts bright areas above threshold
const BLOOM_EXTRACT_SHADER = `#version 300 es
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

// Composite shader - combines original with bloom/effects
// Note: FBO textures are Y-flipped, so we flip when sampling
const COMPOSITE_SHADER = `#version 300 es
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

// Final pass shader - applies post-effects (grain, vignette, border)
const FINAL_PASS_SHADER = `#version 300 es
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

// ============================================================================
// RENDERER CLASS
// ============================================================================

export class WebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;

  // Main shader program (color adjustments)
  private program: WebGLProgram;
  private uniformLocations: Map<string, WebGLUniformLocation> = new Map();

  // Multi-pass shader programs
  private blurProgram: WebGLProgram;
  private blurUniforms: Map<string, WebGLUniformLocation> = new Map();
  private bloomExtractProgram: WebGLProgram;
  private bloomExtractUniforms: Map<string, WebGLUniformLocation> = new Map();
  private compositeProgram: WebGLProgram;
  private compositeUniforms: Map<string, WebGLUniformLocation> = new Map();
  private finalPassProgram: WebGLProgram;
  private finalPassUniforms: Map<string, WebGLUniformLocation> = new Map();

  // Framebuffers for multi-pass rendering
  private fbo1: WebGLFramebuffer | null = null;
  private fbo2: WebGLFramebuffer | null = null;
  private fboTexture1: WebGLTexture | null = null;
  private fboTexture2: WebGLTexture | null = null;
  private fboWidth: number = 0;
  private fboHeight: number = 0;

  // Textures
  private imageTexture: WebGLTexture | null = null;
  private curveLutTexture: WebGLTexture | null = null;
  private lutTexture: WebGLTexture | null = null;

  // Buffers
  private positionBuffer: WebGLBuffer;
  private texCoordBuffer: WebGLBuffer;

  // State
  private startTime: number = Date.now();
  private lutSize: number = 0;
  private lutData: Uint8Array | null = null; // Store for export copying

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

    // Create main shader program
    this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);

    // Create multi-pass shader programs
    this.blurProgram = this.createProgram(VERTEX_SHADER, BLUR_SHADER);
    this.bloomExtractProgram = this.createProgram(VERTEX_SHADER, BLOOM_EXTRACT_SHADER);
    this.compositeProgram = this.createProgram(VERTEX_SHADER, COMPOSITE_SHADER);
    this.finalPassProgram = this.createProgram(VERTEX_SHADER, FINAL_PASS_SHADER);

    // Create buffers
    this.positionBuffer = this.createBuffer(
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
    );
    this.texCoordBuffer = this.createBuffer(
      new Float32Array([0, 1, 1, 1, 0, 0, 1, 0])
    );

    // Set up VAO for proper attribute binding
    this.setupAttributes(this.program);
    this.setupAttributes(this.blurProgram);
    this.setupAttributes(this.bloomExtractProgram);
    this.setupAttributes(this.compositeProgram);
    this.setupAttributes(this.finalPassProgram);

    // Cache uniform locations for all programs
    this.cacheUniformLocations();
    this.cacheBlurUniforms();
    this.cacheBloomExtractUniforms();
    this.cacheCompositeUniforms();
    this.cacheFinalPassUniforms();

    // Create default curve LUT
    this.createDefaultCurveLut();
  }

  private setupAttributes(program: WebGLProgram): void {
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

  private cacheBlurUniforms(): void {
    const uniforms = ['u_image', 'u_direction', 'u_resolution', 'u_radius'];
    for (const name of uniforms) {
      const location = this.gl.getUniformLocation(this.blurProgram, name);
      if (location) this.blurUniforms.set(name, location);
    }
  }

  private cacheBloomExtractUniforms(): void {
    const uniforms = ['u_image', 'u_threshold', 'u_softKnee'];
    for (const name of uniforms) {
      const location = this.gl.getUniformLocation(this.bloomExtractProgram, name);
      if (location) this.bloomExtractUniforms.set(name, location);
    }
  }

  private cacheCompositeUniforms(): void {
    const uniforms = ['u_original', 'u_bloom', 'u_bloomIntensity', 'u_bloomTint'];
    for (const name of uniforms) {
      const location = this.gl.getUniformLocation(this.compositeProgram, name);
      if (location) this.compositeUniforms.set(name, location);
    }
  }

  private cacheFinalPassUniforms(): void {
    const uniforms = [
      'u_image', 'u_resolution',
      'u_vignetteAmount', 'u_vignetteMidpoint', 'u_vignetteRoundness', 'u_vignetteFeather',
      'u_grainAmount', 'u_grainSize', 'u_time',
      'u_borderSize', 'u_borderColor', 'u_borderOpacity'
    ];
    for (const name of uniforms) {
      const location = this.gl.getUniformLocation(this.finalPassProgram, name);
      if (location) this.finalPassUniforms.set(name, location);
    }
  }

  private ensureFBOs(width: number, height: number): void {
    const gl = this.gl;

    // Only recreate if size changed
    if (this.fboWidth === width && this.fboHeight === height) return;

    this.fboWidth = width;
    this.fboHeight = height;

    // Clean up old FBOs
    if (this.fbo1) gl.deleteFramebuffer(this.fbo1);
    if (this.fbo2) gl.deleteFramebuffer(this.fbo2);
    if (this.fboTexture1) gl.deleteTexture(this.fboTexture1);
    if (this.fboTexture2) gl.deleteTexture(this.fboTexture2);

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
      'u_calibrationRedHue',
      'u_calibrationRedSat',
      'u_calibrationGreenHue',
      'u_calibrationGreenSat',
      'u_calibrationBlueHue',
      'u_calibrationBlueSat',
      'u_convertToGrayscale',
      'u_grayMixerRed',
      'u_grayMixerOrange',
      'u_grayMixerYellow',
      'u_grayMixerGreen',
      'u_grayMixerAqua',
      'u_grayMixerBlue',
      'u_grayMixerPurple',
      'u_grayMixerMagenta',
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
    this.lutData = lutData; // Store for export copying
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
      this.lutData = null;
    }
  }

  // Get LUT data for copying to export renderer
  getLutData(): { data: Uint8Array; size: number } | null {
    if (this.lutData && this.lutSize > 0) {
      return { data: this.lutData, size: this.lutSize };
    }
    return null;
  }

  render(editState: EditState): void {
    const gl = this.gl;
    if (!this.imageTexture) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    // Check if we need multi-pass rendering (bloom, halation, or significant blur)
    const needsMultiPass =
      editState.bloom.amount > 0 ||
      editState.halation.amount > 0 ||
      editState.blur.amount > 20;

    if (needsMultiPass) {
      this.renderMultiPass(editState, width, height);
    } else {
      this.renderSinglePass(editState, width, height);
    }
  }

  private renderSinglePass(editState: EditState, width: number, height: number): void {
    const gl = this.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.setupAttributes(this.program);
    gl.useProgram(this.program);
    this.setMainUniforms(editState, width, height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private renderMultiPass(editState: EditState, width: number, height: number): void {
    const gl = this.gl;

    // Ensure FBOs are ready
    this.ensureFBOs(width, height);

    // === PASS 1: Main color processing to FBO1 ===
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo1);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.setupAttributes(this.program);
    gl.useProgram(this.program);

    // Set uniforms but disable effects that will be done in later passes
    this.setMainUniforms(editState, width, height, {
      disableBloom: true,
      disableHalation: true,
      disableVignette: true,
      disableGrain: true,
      disableBorder: true,
      disableBlur: editState.blur.amount > 20, // Multi-pass blur for strong blur
    });

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Current result is in FBO1

    // === PASS 2: Multi-pass blur (if enabled) ===
    if (editState.blur.amount > 20) {
      const blurRadius = editState.blur.amount / 100.0 * 15.0;
      this.applyBlurPasses(this.fboTexture1!, this.fbo2!, this.fboTexture2!, this.fbo1!, blurRadius, width, height);
      // Result is back in FBO1
    }

    // === PASS 3: Bloom (if enabled) ===
    if (editState.bloom.amount > 0) {
      // Extract bright areas from FBO1 into FBO2
      this.extractBloom(this.fboTexture1!, this.fbo2!, editState.bloom.threshold / 100.0, width, height);

      // Blur the extracted bloom (in FBO2) - horizontal to FBO1 temp, vertical back to FBO2
      const bloomRadius = editState.bloom.radius / 100.0 * 30.0;
      this.applyBlurPass(this.fboTexture2!, this.fbo1!, 1, 0, bloomRadius, width, height);
      this.applyBlurPass(this.fboTexture1!, this.fbo2!, 0, 1, bloomRadius, width, height);

      // Now FBO1 has original color, FBO2 has blurred bloom
      // Composite: need to re-render original to FBO1 first (it was overwritten)
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo1);
      gl.viewport(0, 0, width, height);
      this.setupAttributes(this.program);
      gl.useProgram(this.program);
      this.setMainUniforms(editState, width, height, {
        disableBloom: true,
        disableHalation: true,
        disableVignette: true,
        disableGrain: true,
        disableBorder: true,
        disableBlur: editState.blur.amount > 20,
      });
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Re-apply blur if needed
      if (editState.blur.amount > 20) {
        const blurRadius = editState.blur.amount / 100.0 * 15.0;
        // Store FBO2 bloom temporarily - just composite directly
      }

      // Composite bloom onto FBO1 result, output to screen or temp
      this.compositeBloom(
        this.fboTexture1!,
        this.fboTexture2!,
        null, // Output to screen
        editState.bloom.amount / 100.0,
        { r: 1, g: 1, b: 1 }, // No tint for bloom
        width,
        height
      );
    }

    // === PASS 4: Halation (if enabled) ===
    if (editState.halation.amount > 0 && editState.bloom.amount === 0) {
      // Similar to bloom but with tint
      this.extractBloom(this.fboTexture1!, this.fbo2!, editState.halation.threshold / 100.0, width, height);

      const halationRadius = 25.0; // Fixed radius for halation
      this.applyBlurPass(this.fboTexture2!, this.fbo1!, 1, 0, halationRadius, width, height);
      this.applyBlurPass(this.fboTexture1!, this.fbo2!, 0, 1, halationRadius, width, height);

      // Re-render original to FBO1
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo1);
      gl.viewport(0, 0, width, height);
      this.setupAttributes(this.program);
      gl.useProgram(this.program);
      this.setMainUniforms(editState, width, height, {
        disableBloom: true,
        disableHalation: true,
        disableVignette: true,
        disableGrain: true,
        disableBorder: true,
      });
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Convert halation hue to RGB
      const halationTint = this.hueToRgb(editState.halation.hue);

      this.compositeBloom(
        this.fboTexture1!,
        this.fboTexture2!,
        null,
        editState.halation.amount / 100.0 * 0.5,
        halationTint,
        width,
        height
      );
    }

    // === FINAL PASS: Vignette, Grain, Border ===
    // If we did bloom/halation, result is on screen, we need to read it back
    // For simplicity, apply final effects in the composite step above
    // Actually, let's do this properly with a final pass

    if (editState.bloom.amount === 0 && editState.halation.amount === 0) {
      // No bloom/halation, just render to screen with all effects
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, width, height);
      this.setupAttributes(this.program);
      gl.useProgram(this.program);
      this.setMainUniforms(editState, width, height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    // Note: Vignette/grain/border are applied in composite or need a final pass
    // This simplified version applies them in the main shader still
  }

  private setMainUniforms(
    editState: EditState,
    width: number,
    height: number,
    overrides?: {
      disableBloom?: boolean;
      disableHalation?: boolean;
      disableVignette?: boolean;
      disableGrain?: boolean;
      disableBorder?: boolean;
      disableBlur?: boolean;
    }
  ): void {
    const gl = this.gl;

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

    // Vignette (disable if overridden)
    gl.uniform1f(this.getUniform('u_vignetteAmount'), overrides?.disableVignette ? 0 : editState.vignette.amount);
    gl.uniform1f(this.getUniform('u_vignetteMidpoint'), editState.vignette.midpoint);
    gl.uniform1f(this.getUniform('u_vignetteRoundness'), editState.vignette.roundness);
    gl.uniform1f(this.getUniform('u_vignetteFeather'), editState.vignette.feather);

    // Grain (disable if overridden)
    gl.uniform1f(this.getUniform('u_grainAmount'), overrides?.disableGrain ? 0 : editState.grain.amount);
    gl.uniform1f(this.getUniform('u_grainSize'), editState.grain.size);
    gl.uniform1f(this.getUniform('u_time'), (Date.now() - this.startTime) / 1000);

    // LUT
    gl.uniform1f(this.getUniform('u_lutSize'), this.lutSize);
    gl.uniform1f(this.getUniform('u_lutIntensity'), editState.lutIntensity / 100);
    gl.uniform1i(this.getUniform('u_hasLut'), this.lutTexture ? 1 : 0);

    // Curve identity check
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

    // Blur (disable if overridden for multi-pass)
    gl.uniform1f(this.getUniform('u_blurAmount'), overrides?.disableBlur ? 0 : editState.blur.amount);
    gl.uniform1i(this.getUniform('u_blurType'), editState.blur.type === 'gaussian' ? 0 : 1);
    gl.uniform2f(this.getUniform('u_resolution'), width, height);

    // Border (disable if overridden)
    gl.uniform1f(this.getUniform('u_borderSize'), overrides?.disableBorder ? 0 : editState.border.size);
    const borderColor = this.hexToRgb(editState.border.color);
    gl.uniform3f(this.getUniform('u_borderColor'), borderColor.r, borderColor.g, borderColor.b);
    gl.uniform1f(this.getUniform('u_borderOpacity'), editState.border.opacity);

    // Bloom (disable if overridden for multi-pass)
    gl.uniform1f(this.getUniform('u_bloomAmount'), overrides?.disableBloom ? 0 : editState.bloom.amount);
    gl.uniform1f(this.getUniform('u_bloomThreshold'), editState.bloom.threshold);
    gl.uniform1f(this.getUniform('u_bloomRadius'), editState.bloom.radius);

    // Halation (disable if overridden for multi-pass)
    gl.uniform1f(this.getUniform('u_halationAmount'), overrides?.disableHalation ? 0 : editState.halation.amount);
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

    // Camera Calibration
    gl.uniform1f(this.getUniform('u_calibrationRedHue'), editState.calibration.redHue);
    gl.uniform1f(this.getUniform('u_calibrationRedSat'), editState.calibration.redSaturation);
    gl.uniform1f(this.getUniform('u_calibrationGreenHue'), editState.calibration.greenHue);
    gl.uniform1f(this.getUniform('u_calibrationGreenSat'), editState.calibration.greenSaturation);
    gl.uniform1f(this.getUniform('u_calibrationBlueHue'), editState.calibration.blueHue);
    gl.uniform1f(this.getUniform('u_calibrationBlueSat'), editState.calibration.blueSaturation);

    // B&W / Grayscale
    gl.uniform1i(this.getUniform('u_convertToGrayscale'), editState.convertToGrayscale ? 1 : 0);
    gl.uniform1f(this.getUniform('u_grayMixerRed'), editState.grayMixer.red);
    gl.uniform1f(this.getUniform('u_grayMixerOrange'), editState.grayMixer.orange);
    gl.uniform1f(this.getUniform('u_grayMixerYellow'), editState.grayMixer.yellow);
    gl.uniform1f(this.getUniform('u_grayMixerGreen'), editState.grayMixer.green);
    gl.uniform1f(this.getUniform('u_grayMixerAqua'), editState.grayMixer.aqua);
    gl.uniform1f(this.getUniform('u_grayMixerBlue'), editState.grayMixer.blue);
    gl.uniform1f(this.getUniform('u_grayMixerPurple'), editState.grayMixer.purple);
    gl.uniform1f(this.getUniform('u_grayMixerMagenta'), editState.grayMixer.magenta);
  }

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

    this.setupAttributes(this.blurProgram);
    gl.useProgram(this.blurProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.uniform1i(this.blurUniforms.get('u_image')!, 0);
    gl.uniform2f(this.blurUniforms.get('u_direction')!, dirX, dirY);
    gl.uniform2f(this.blurUniforms.get('u_resolution')!, width, height);
    gl.uniform1f(this.blurUniforms.get('u_radius')!, radius);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

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

    this.setupAttributes(this.bloomExtractProgram);
    gl.useProgram(this.bloomExtractProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.uniform1i(this.bloomExtractUniforms.get('u_image')!, 0);
    gl.uniform1f(this.bloomExtractUniforms.get('u_threshold')!, threshold);
    gl.uniform1f(this.bloomExtractUniforms.get('u_softKnee')!, 0.5);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private compositeBloom(
    originalTexture: WebGLTexture,
    bloomTexture: WebGLTexture,
    targetFBO: WebGLFramebuffer | null,
    intensity: number,
    tint: { r: number; g: number; b: number },
    width: number,
    height: number
  ): void {
    const gl = this.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO);
    gl.viewport(0, 0, width, height);

    this.setupAttributes(this.compositeProgram);
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

  private hueToRgb(hue: number): { r: number; g: number; b: number } {
    const h = ((hue % 360) + 360) % 360;
    const s = 1;
    const l = 0.5;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    return { r: r + m, g: g + m, b: b + m };
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

  exportImage(
    editState: EditState,
    originalImage: HTMLImageElement,
    options: {
      format?: 'jpeg' | 'png' | 'webp';
      quality?: number; // 0-1
      scale?: number; // 1 = original size, 0.5 = half, etc.
      maxDimension?: number; // Max width or height
    } = {}
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const {
        format = 'jpeg',
        quality = 0.95,
        scale = 1,
        maxDimension,
      } = options;

      // Calculate output dimensions
      let outputWidth = originalImage.width;
      let outputHeight = originalImage.height;

      // Apply crop first to get base dimensions
      const crop = editState.crop;
      if (crop) {
        outputWidth = Math.round(crop.width * originalImage.width);
        outputHeight = Math.round(crop.height * originalImage.height);
      }

      // Apply rotation (swap dimensions for 90/270)
      const rotation = editState.rotation || 0;
      const isRotated90 = Math.abs(rotation) === 90 || Math.abs(rotation) === 270;
      if (isRotated90) {
        [outputWidth, outputHeight] = [outputHeight, outputWidth];
      }

      // Apply scale
      outputWidth = Math.round(outputWidth * scale);
      outputHeight = Math.round(outputHeight * scale);

      // Apply max dimension constraint
      if (maxDimension) {
        const maxSide = Math.max(outputWidth, outputHeight);
        if (maxSide > maxDimension) {
          const ratio = maxDimension / maxSide;
          outputWidth = Math.round(outputWidth * ratio);
          outputHeight = Math.round(outputHeight * ratio);
        }
      }

      // Create offscreen canvas for WebGL rendering at full original resolution
      // We render at full res then apply transforms
      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = originalImage.width;
      renderCanvas.height = originalImage.height;

      const offscreenRenderer = new WebGLRenderer(renderCanvas);
      offscreenRenderer.setImage(originalImage);

      // Copy LUT if set
      const lutData = this.getLutData();
      if (lutData) {
        offscreenRenderer.setLut(lutData.data, lutData.size);
      }

      offscreenRenderer.updateCurveLut(editState.curve);
      offscreenRenderer.render(editState);

      // Create final output canvas with transforms applied
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = outputWidth;
      outputCanvas.height = outputHeight;

      const ctx = outputCanvas.getContext('2d');
      if (!ctx) {
        offscreenRenderer.dispose();
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Calculate source region (crop)
      const sourceX = crop ? Math.round(crop.left * originalImage.width) : 0;
      const sourceY = crop ? Math.round(crop.top * originalImage.height) : 0;
      const sourceWidth = crop ? Math.round(crop.width * originalImage.width) : originalImage.width;
      const sourceHeight = crop ? Math.round(crop.height * originalImage.height) : originalImage.height;

      // Apply transforms
      ctx.save();
      ctx.translate(outputWidth / 2, outputHeight / 2);

      // Rotation
      if (rotation !== 0) {
        ctx.rotate((rotation * Math.PI) / 180);
      }

      // Straighten (fine angle)
      if (editState.straighten) {
        ctx.rotate((editState.straighten * Math.PI) / 180);
      }

      // Flip
      if (editState.flipH) {
        ctx.scale(-1, 1);
      }
      if (editState.flipV) {
        ctx.scale(1, -1);
      }

      // Calculate draw dimensions (account for rotation)
      const drawWidth = isRotated90 ? outputHeight : outputWidth;
      const drawHeight = isRotated90 ? outputWidth : outputHeight;

      // Draw the rendered image with crop and transforms
      ctx.drawImage(
        renderCanvas,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );

      ctx.restore();

      // Clean up offscreen renderer
      offscreenRenderer.dispose();

      // Export to blob
      const mimeType = `image/${format}`;
      outputCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to export image'));
          }
        },
        mimeType,
        format === 'png' ? undefined : quality
      );
    });
  }

  dispose(): void {
    const gl = this.gl;

    // Textures
    if (this.imageTexture) gl.deleteTexture(this.imageTexture);
    if (this.curveLutTexture) gl.deleteTexture(this.curveLutTexture);
    if (this.lutTexture) gl.deleteTexture(this.lutTexture);

    // FBOs
    if (this.fbo1) gl.deleteFramebuffer(this.fbo1);
    if (this.fbo2) gl.deleteFramebuffer(this.fbo2);
    if (this.fboTexture1) gl.deleteTexture(this.fboTexture1);
    if (this.fboTexture2) gl.deleteTexture(this.fboTexture2);

    // Buffers
    gl.deleteBuffer(this.positionBuffer);
    gl.deleteBuffer(this.texCoordBuffer);

    // Programs
    gl.deleteProgram(this.program);
    gl.deleteProgram(this.blurProgram);
    gl.deleteProgram(this.bloomExtractProgram);
    gl.deleteProgram(this.compositeProgram);
    gl.deleteProgram(this.finalPassProgram);
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
