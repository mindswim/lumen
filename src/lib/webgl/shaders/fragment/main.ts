/**
 * Main fragment shader function.
 * Orchestrates all adjustments in the correct order.
 */
export const MAIN_FUNCTION = `
void main() {
  // Apply chromatic aberration fix first (modifies sampling)
  vec3 color = applyChromaticAberrationFix(v_texCoord);
  vec4 texColor = vec4(color, texture(u_image, v_texCoord).a);

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

  // Texture (fine detail control - smaller radius than clarity)
  if (u_texture != 0.0) {
    color = applyTexture(color, v_texCoord);
  }

  // Dehaze (atmospheric haze removal/addition)
  if (u_dehaze != 0.0) {
    color = applyDehaze(color, v_texCoord);
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

  // Color Grading (3-way color wheels - more advanced than split tone)
  color = applyColorGrading(color);

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
}
`;
