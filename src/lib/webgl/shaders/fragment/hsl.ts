/**
 * HSL per-color adjustment functions.
 * Allows independent control of 8 color ranges.
 */
export const HSL_FUNCTIONS = `
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

bool hasHSLAdjustments() {
  return u_hsl_red != vec3(0.0) || u_hsl_orange != vec3(0.0) ||
         u_hsl_yellow != vec3(0.0) || u_hsl_green != vec3(0.0) ||
         u_hsl_aqua != vec3(0.0) || u_hsl_blue != vec3(0.0) ||
         u_hsl_purple != vec3(0.0) || u_hsl_magenta != vec3(0.0);
}
`;
