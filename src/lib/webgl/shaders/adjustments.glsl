#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

// Samplers
uniform sampler2D u_image;
uniform sampler2D u_curveLut;  // 256x4 texture for curves (RGB, R, G, B)

// Basic adjustments
uniform float u_exposure;      // -5 to 5
uniform float u_contrast;      // -100 to 100
uniform float u_highlights;    // -100 to 100
uniform float u_shadows;       // -100 to 100
uniform float u_whites;        // -100 to 100
uniform float u_blacks;        // -100 to 100

// White balance
uniform float u_temperature;   // -100 to 100
uniform float u_tint;          // -100 to 100

// Presence
uniform float u_clarity;       // -100 to 100
uniform float u_vibrance;      // -100 to 100
uniform float u_saturation;    // -100 to 100

// HSL adjustments (8 colors x 3 values)
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
uniform sampler2D u_lut;       // 2D representation of 3D LUT
uniform float u_lutSize;       // Size of LUT (e.g., 33)
uniform float u_lutIntensity;  // 0 to 1
uniform bool u_hasLut;

// sRGB <-> Linear conversion
vec3 srgbToLinear(vec3 srgb) {
  return mix(
    srgb / 12.92,
    pow((srgb + 0.055) / 1.055, vec3(2.4)),
    step(0.04045, srgb)
  );
}

vec3 linearToSrgb(vec3 linear) {
  return mix(
    linear * 12.92,
    1.055 * pow(linear, vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, linear)
  );
}

// RGB <-> HSL conversion
vec3 rgbToHsl(vec3 rgb) {
  float maxC = max(rgb.r, max(rgb.g, rgb.b));
  float minC = min(rgb.r, min(rgb.g, rgb.b));
  float delta = maxC - minC;

  float l = (maxC + minC) * 0.5;
  float s = 0.0;
  float h = 0.0;

  if (delta > 0.0001) {
    s = delta / (1.0 - abs(2.0 * l - 1.0));

    if (maxC == rgb.r) {
      h = mod((rgb.g - rgb.b) / delta, 6.0);
    } else if (maxC == rgb.g) {
      h = (rgb.b - rgb.r) / delta + 2.0;
    } else {
      h = (rgb.r - rgb.g) / delta + 4.0;
    }
    h /= 6.0;
  }

  return vec3(h, s, l);
}

vec3 hslToRgb(vec3 hsl) {
  float h = hsl.x;
  float s = hsl.y;
  float l = hsl.z;

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

// Apply exposure
vec3 applyExposure(vec3 color, float exposure) {
  return color * pow(2.0, exposure);
}

// Apply contrast (S-curve based)
vec3 applyContrast(vec3 color, float contrast) {
  float c = contrast / 100.0;
  vec3 mid = vec3(0.5);
  return mix(mid, color, 1.0 + c);
}

// Temperature and tint (simplified)
vec3 applyWhiteBalance(vec3 color, float temp, float tint) {
  // Temperature: shift red-blue
  float t = temp / 100.0 * 0.3;
  color.r += t;
  color.b -= t;

  // Tint: shift green-magenta
  float ti = tint / 100.0 * 0.3;
  color.g += ti;

  return color;
}

// Highlights and shadows (luminance-based)
vec3 applyHighlightsShadows(vec3 color, float highlights, float shadows) {
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));

  // Shadows affect dark areas
  float shadowMask = 1.0 - smoothstep(0.0, 0.5, lum);
  float shadowAdjust = shadows / 100.0;
  color += shadowMask * shadowAdjust * 0.5;

  // Highlights affect bright areas
  float highlightMask = smoothstep(0.5, 1.0, lum);
  float highlightAdjust = highlights / 100.0;
  color -= highlightMask * highlightAdjust * 0.5;

  return color;
}

// Whites and blacks (endpoint adjustment)
vec3 applyWhitesBlacks(vec3 color, float whites, float blacks) {
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));

  // Blacks: lift/lower the darkest values
  float blackMask = 1.0 - smoothstep(0.0, 0.25, lum);
  color += blackMask * (blacks / 100.0) * 0.3;

  // Whites: push/pull the brightest values
  float whiteMask = smoothstep(0.75, 1.0, lum);
  color += whiteMask * (whites / 100.0) * 0.3;

  return color;
}

// Vibrance (saturation that affects less saturated colors more)
vec3 applyVibrance(vec3 color, float vibrance) {
  float v = vibrance / 100.0;
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float maxC = max(color.r, max(color.g, color.b));
  float minC = min(color.r, min(color.g, color.b));
  float sat = (maxC - minC) / (maxC + 0.001);

  // Less saturated colors get more boost
  float vibranceWeight = (1.0 - sat) * v;

  return mix(vec3(lum), color, 1.0 + vibranceWeight);
}

// Saturation
vec3 applySaturation(vec3 color, float saturation) {
  float s = saturation / 100.0;
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return mix(vec3(lum), color, 1.0 + s);
}

// HSL color targeting weight
float getHueWeight(float hue, float targetHue, float width) {
  float d = abs(hue - targetHue);
  d = min(d, 1.0 - d); // Wrap around
  return smoothstep(width, 0.0, d);
}

// Apply HSL adjustments for targeted color ranges
vec3 applyHSL(vec3 color) {
  vec3 hsl = rgbToHsl(color);
  float h = hsl.x;

  // Color range centers (in 0-1 hue space)
  float redHue = 0.0;
  float orangeHue = 0.083;
  float yellowHue = 0.167;
  float greenHue = 0.333;
  float aquaHue = 0.5;
  float blueHue = 0.667;
  float purpleHue = 0.75;
  float magentaHue = 0.917;

  float width = 0.1; // Falloff width

  // Calculate weights for each color
  float wRed = getHueWeight(h, redHue, width) + getHueWeight(h, 1.0, width);
  float wOrange = getHueWeight(h, orangeHue, width);
  float wYellow = getHueWeight(h, yellowHue, width);
  float wGreen = getHueWeight(h, greenHue, width);
  float wAqua = getHueWeight(h, aquaHue, width);
  float wBlue = getHueWeight(h, blueHue, width);
  float wPurple = getHueWeight(h, purpleHue, width);
  float wMagenta = getHueWeight(h, magentaHue, width);

  // Apply weighted adjustments
  float hueShift = 0.0;
  float satShift = 0.0;
  float lumShift = 0.0;

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

// Apply tone curve from LUT texture
vec3 applyCurve(vec3 color) {
  // Sample curve LUT (256 wide, 4 rows: RGB, R, G, B)
  float r = texture(u_curveLut, vec2(color.r, 0.875)).r; // Row 0 (RGB) applied to R
  float g = texture(u_curveLut, vec2(color.g, 0.875)).g; // Row 0 (RGB) applied to G
  float b = texture(u_curveLut, vec2(color.b, 0.875)).b; // Row 0 (RGB) applied to B

  // Per-channel curves
  r = texture(u_curveLut, vec2(r, 0.625)).r; // Row 1 (R)
  g = texture(u_curveLut, vec2(g, 0.375)).g; // Row 2 (G)
  b = texture(u_curveLut, vec2(b, 0.125)).b; // Row 3 (B)

  return vec3(r, g, b);
}

// 2D LUT lookup (LUT stored as horizontal strips)
vec3 applyLUT(vec3 color) {
  if (!u_hasLut) return color;

  float size = u_lutSize;
  float sliceSize = 1.0 / size;

  // Scale color to LUT coordinates
  vec3 scaled = color * (size - 1.0);

  // Get the two blue slices we need to interpolate
  float blueSlice = floor(scaled.b);
  float blueSliceNext = min(blueSlice + 1.0, size - 1.0);
  float blueFract = scaled.b - blueSlice;

  // Calculate UV coordinates for both slices
  vec2 uv1;
  uv1.x = (blueSlice + scaled.r * sliceSize + 0.5) / size;
  uv1.y = (scaled.g + 0.5) / size;

  vec2 uv2;
  uv2.x = (blueSliceNext + scaled.r * sliceSize + 0.5) / size;
  uv2.y = (scaled.g + 0.5) / size;

  // Sample and interpolate
  vec3 color1 = texture(u_lut, uv1).rgb;
  vec3 color2 = texture(u_lut, uv2).rgb;
  vec3 lutColor = mix(color1, color2, blueFract);

  // Blend with original based on intensity
  return mix(color, lutColor, u_lutIntensity);
}

// Vignette
vec3 applyVignette(vec3 color, vec2 uv) {
  if (u_vignetteAmount == 0.0) return color;

  vec2 center = vec2(0.5);
  vec2 coord = uv - center;

  // Apply roundness
  float roundness = u_vignetteRoundness / 100.0;
  coord.x *= mix(1.0, 0.5, roundness);

  float dist = length(coord) * 2.0;

  // Midpoint and feather
  float midpoint = u_vignetteMidpoint / 100.0;
  float feather = max(u_vignetteFeather / 100.0, 0.01);

  float vignette = smoothstep(midpoint - feather, midpoint + feather, dist);
  vignette *= u_vignetteAmount / 100.0;

  return color * (1.0 - vignette);
}

// Film grain
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

void main() {
  vec4 texColor = texture(u_image, v_texCoord);
  vec3 color = texColor.rgb;

  // Convert to linear space for adjustments
  color = srgbToLinear(color);

  // Apply adjustments in order
  color = applyWhiteBalance(color, u_temperature, u_tint);
  color = applyExposure(color, u_exposure);
  color = applyContrast(color, u_contrast);
  color = applyHighlightsShadows(color, u_highlights, u_shadows);
  color = applyWhitesBlacks(color, u_whites, u_blacks);

  // Convert back to sRGB for curve/HSL
  color = linearToSrgb(color);
  color = clamp(color, 0.0, 1.0);

  // Tone curve
  color = applyCurve(color);

  // HSL targeted adjustments
  color = applyHSL(color);

  // Vibrance and saturation
  color = applyVibrance(color, u_vibrance);
  color = applySaturation(color, u_saturation);

  // LUT (preset)
  color = applyLUT(color);

  // Effects
  color = applyVignette(color, v_texCoord);
  color = applyGrain(color, v_texCoord);

  // Clamp final output
  color = clamp(color, 0.0, 1.0);

  fragColor = vec4(color, texColor.a);
}
