/**
 * All uniform declarations for the main fragment shader.
 * Organized by category for maintainability.
 */
export const UNIFORMS = `
// Input textures
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

// HSL per-color adjustments
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

// Texture (fine detail control - smaller radius than clarity)
uniform float u_texture;

// Dehaze (atmospheric haze removal/addition)
uniform float u_dehaze;

// Chromatic Aberration Removal
uniform float u_caAmount;

// Color Grading Wheels (3-way color grading)
uniform vec3 u_cgShadows;      // hue, sat, lum
uniform vec3 u_cgMidtones;     // hue, sat, lum
uniform vec3 u_cgHighlights;   // hue, sat, lum
uniform vec3 u_cgGlobal;       // hue, sat, lum
uniform float u_cgBlending;
`;
