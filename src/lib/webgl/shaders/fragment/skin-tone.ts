/**
 * Skin tone selective adjustment function.
 * Targets the orange-red hue range typical of human skin.
 */
export const SKIN_TONE_FUNCTIONS = `
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
`;
