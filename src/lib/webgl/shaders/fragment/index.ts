/**
 * Assembles the complete fragment shader from modular pieces.
 * Order matters - functions must be declared before they're used.
 */
import { UNIFORMS } from './uniforms';
import { COLOR_SPACE_FUNCTIONS } from './color-space';
import { BASIC_ADJUSTMENTS } from './basic';
import { CURVES_FUNCTIONS } from './curves';
import { HSL_FUNCTIONS } from './hsl';
import { DETAIL_FUNCTIONS } from './detail';
import { EFFECTS_FUNCTIONS } from './effects';
import { COLOR_GRADING_FUNCTIONS } from './color-grading';
import { SKIN_TONE_FUNCTIONS } from './skin-tone';
import { MAIN_FUNCTION } from './main';

/**
 * The complete main fragment shader for color adjustments.
 *
 * Processing order (determined by function call order in main):
 * 1. Chromatic aberration fix (modifies UV sampling)
 * 2. Basic adjustments in linear space (exposure, contrast, WB, etc.)
 * 3. Camera calibration (RGB primary shifts)
 * 4. Tone curve
 * 5. HSL per-color adjustments
 * 6. Vibrance/Saturation
 * 7. Detail: Clarity, Texture, Dehaze
 * 8. Skin tone selective adjustment
 * 9. Noise reduction and sharpening
 * 10. LUT application
 * 11. Color grading: Split tone, 3-way wheels
 * 12. Grayscale conversion (if enabled)
 * 13. Fade (black lift)
 * 14. Effects: Bloom, Halation, Vignette, Grain, Blur, Border
 */
export const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

${UNIFORMS}
${COLOR_SPACE_FUNCTIONS}
${BASIC_ADJUSTMENTS}
${CURVES_FUNCTIONS}
${HSL_FUNCTIONS}
${DETAIL_FUNCTIONS}
${EFFECTS_FUNCTIONS}
${COLOR_GRADING_FUNCTIONS}
${SKIN_TONE_FUNCTIONS}
${MAIN_FUNCTION}
`;

// Re-export individual modules for testing/inspection
export {
  UNIFORMS,
  COLOR_SPACE_FUNCTIONS,
  BASIC_ADJUSTMENTS,
  CURVES_FUNCTIONS,
  HSL_FUNCTIONS,
  DETAIL_FUNCTIONS,
  EFFECTS_FUNCTIONS,
  COLOR_GRADING_FUNCTIONS,
  SKIN_TONE_FUNCTIONS,
  MAIN_FUNCTION,
};
