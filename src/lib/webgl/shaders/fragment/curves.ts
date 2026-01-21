/**
 * Curve and LUT application functions.
 * Handles tone curve adjustments via LUT texture lookup.
 */
export const CURVES_FUNCTIONS = `
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
`;
