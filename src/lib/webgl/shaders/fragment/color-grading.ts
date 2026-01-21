/**
 * Color grading functions: split tone, 3-way wheels,
 * camera calibration, and grayscale conversion.
 */
export const COLOR_GRADING_FUNCTIONS = `
// Apply color grading wheel to color based on mask
vec3 applyColorWheel(vec3 color, vec3 wheelParams, float mask) {
  if (wheelParams.y == 0.0 && wheelParams.z == 0.0) return color;

  float hue = wheelParams.x;       // 0-360
  float sat = wheelParams.y / 100.0;  // 0-100 -> 0-1
  float lum = wheelParams.z / 100.0;  // -100 to 100 -> -1 to 1

  // Apply hue/saturation tint
  if (sat > 0.0) {
    vec3 tint = hueToRgb(hue);
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(color, tint * gray, sat * mask * 0.5);
  }

  // Apply luminance shift
  color += lum * mask * 0.5;

  return color;
}

// Color Grading - 3-way color grading with visual wheels
vec3 applyColorGrading(vec3 color) {
  // Check if any grading is applied
  if (u_cgShadows.y == 0.0 && u_cgShadows.z == 0.0 &&
      u_cgMidtones.y == 0.0 && u_cgMidtones.z == 0.0 &&
      u_cgHighlights.y == 0.0 && u_cgHighlights.z == 0.0 &&
      u_cgGlobal.y == 0.0 && u_cgGlobal.z == 0.0) {
    return color;
  }

  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));

  // Create masks with blending control
  float blend = u_cgBlending / 100.0;

  // Shadow mask: dark areas (0-0.33, with blending)
  float shadowMask = 1.0 - smoothstep(0.0, 0.33 + blend * 0.17, lum);

  // Midtone mask: mid-range (peak around 0.5)
  float midtoneMask = smoothstep(0.0, 0.33, lum) * (1.0 - smoothstep(0.67, 1.0, lum));

  // Highlight mask: bright areas (0.67-1.0, with blending)
  float highlightMask = smoothstep(0.67 - blend * 0.17, 1.0, lum);

  // Apply each region's color shift
  color = applyColorWheel(color, u_cgShadows, shadowMask);
  color = applyColorWheel(color, u_cgMidtones, midtoneMask);
  color = applyColorWheel(color, u_cgHighlights, highlightMask);
  color = applyColorWheel(color, u_cgGlobal, 1.0);  // Global always applies

  return clamp(color, 0.0, 1.0);
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
`;
