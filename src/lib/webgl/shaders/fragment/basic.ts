/**
 * Basic adjustment functions: exposure, contrast, white balance,
 * highlights/shadows, whites/blacks, vibrance, saturation.
 */
export const BASIC_ADJUSTMENTS = `
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

bool hasBasicAdjustments() {
  return u_exposure != 0.0 || u_contrast != 0.0 ||
         u_highlights != 0.0 || u_shadows != 0.0 ||
         u_whites != 0.0 || u_blacks != 0.0 ||
         u_temperature != 0.0 || u_tint != 0.0;
}
`;
