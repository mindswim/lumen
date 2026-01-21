/**
 * Manages setting uniforms from EditState to WebGL program.
 */
import { EditState, UniformLocationMap, RenderOverrides } from '../types';
import { hexToRgb } from '../utils/color';
import { isCurveIdentity } from '../utils/curve-interpolation';
import { TextureManager } from '../resources/texture-manager';

/**
 * All uniform names used by the main shader program.
 */
export const MAIN_UNIFORM_NAMES = [
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
  'u_texture',
  'u_dehaze',
  'u_caAmount',
  'u_cgShadows',
  'u_cgMidtones',
  'u_cgHighlights',
  'u_cgGlobal',
  'u_cgBlending',
] as const;

export class UniformSetter {
  private gl: WebGL2RenderingContext;
  private uniformLocations: UniformLocationMap;
  private startTime: number = Date.now();

  constructor(gl: WebGL2RenderingContext, uniformLocations: UniformLocationMap) {
    this.gl = gl;
    this.uniformLocations = uniformLocations;
  }

  /**
   * Get a uniform location by name.
   */
  private getUniform(name: string): WebGLUniformLocation | null {
    return this.uniformLocations.get(name) || null;
  }

  /**
   * Set all uniforms from edit state.
   */
  setFromEditState(
    editState: EditState,
    textures: TextureManager,
    width: number,
    height: number,
    overrides?: RenderOverrides
  ): void {
    const gl = this.gl;

    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.getImageTexture());
    gl.uniform1i(this.getUniform('u_image'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.getCurveLutTexture());
    gl.uniform1i(this.getUniform('u_curveLut'), 1);

    gl.activeTexture(gl.TEXTURE2);
    if (textures.getLutTexture()) {
      gl.bindTexture(gl.TEXTURE_2D, textures.getLutTexture());
    }
    gl.uniform1i(this.getUniform('u_lut'), 2);

    // Basic adjustments
    gl.uniform1f(this.getUniform('u_exposure'), editState.exposure);
    gl.uniform1f(this.getUniform('u_contrast'), editState.contrast);
    gl.uniform1f(this.getUniform('u_highlights'), editState.highlights);
    gl.uniform1f(this.getUniform('u_shadows'), editState.shadows);
    gl.uniform1f(this.getUniform('u_whites'), editState.whites);
    gl.uniform1f(this.getUniform('u_blacks'), editState.blacks);
    gl.uniform1f(this.getUniform('u_temperature'), editState.temperature);
    gl.uniform1f(this.getUniform('u_tint'), editState.tint);
    gl.uniform1f(this.getUniform('u_clarity'), editState.clarity);
    gl.uniform1f(this.getUniform('u_texture'), editState.texture);
    gl.uniform1f(this.getUniform('u_dehaze'), editState.dehaze);
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
    gl.uniform1f(this.getUniform('u_lutSize'), textures.getLutSize());
    gl.uniform1f(this.getUniform('u_lutIntensity'), editState.lutIntensity / 100);
    gl.uniform1i(this.getUniform('u_hasLut'), textures.hasLut() ? 1 : 0);

    // Curve identity check
    const curveIsIdentity = isCurveIdentity(editState.curve);
    gl.uniform1i(this.getUniform('u_curveIsIdentity'), curveIsIdentity ? 1 : 0);

    // Fade
    gl.uniform1f(this.getUniform('u_fade'), editState.fade);

    // Split Tone
    gl.uniform1f(this.getUniform('u_splitHighlightHue'), editState.splitTone.highlightHue);
    gl.uniform1f(this.getUniform('u_splitHighlightSat'), editState.splitTone.highlightSaturation);
    gl.uniform1f(this.getUniform('u_splitShadowHue'), editState.splitTone.shadowHue);
    gl.uniform1f(this.getUniform('u_splitShadowSat'), editState.splitTone.shadowSaturation);
    gl.uniform1f(this.getUniform('u_splitBalance'), editState.splitTone.balance);

    // Chromatic Aberration Removal
    gl.uniform1f(this.getUniform('u_caAmount'), editState.chromaticAberration.amount);

    // Color Grading (3-way wheels)
    const cg = editState.colorGrading;
    gl.uniform3f(this.getUniform('u_cgShadows'), cg.shadows.hue, cg.shadows.saturation, cg.shadows.luminance);
    gl.uniform3f(this.getUniform('u_cgMidtones'), cg.midtones.hue, cg.midtones.saturation, cg.midtones.luminance);
    gl.uniform3f(this.getUniform('u_cgHighlights'), cg.highlights.hue, cg.highlights.saturation, cg.highlights.luminance);
    gl.uniform3f(this.getUniform('u_cgGlobal'), cg.global.hue, cg.global.saturation, cg.global.luminance);
    gl.uniform1f(this.getUniform('u_cgBlending'), cg.blending);

    // Blur (disable if overridden for multi-pass)
    gl.uniform1f(this.getUniform('u_blurAmount'), overrides?.disableBlur ? 0 : editState.blur.amount);
    gl.uniform1i(this.getUniform('u_blurType'), editState.blur.type === 'gaussian' ? 0 : 1);
    gl.uniform2f(this.getUniform('u_resolution'), width, height);

    // Border (disable if overridden)
    gl.uniform1f(this.getUniform('u_borderSize'), overrides?.disableBorder ? 0 : editState.border.size);
    const borderColor = hexToRgb(editState.border.color);
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
}
