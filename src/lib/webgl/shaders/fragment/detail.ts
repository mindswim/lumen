/**
 * Detail enhancement functions: clarity, texture, dehaze,
 * sharpening, noise reduction, and chromatic aberration fix.
 */
export const DETAIL_FUNCTIONS = `
// Clarity - local contrast enhancement using unsharp mask at larger radius
vec3 applyClarity(vec3 color, vec2 uv) {
  if (u_clarity == 0.0) return color;

  vec2 texelSize = 1.0 / u_resolution;
  float radius = 10.0; // Larger radius than sharpening for "local contrast"

  // Sample surrounding pixels for local average
  vec3 localAvg = vec3(0.0);
  float totalWeight = 0.0;

  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      vec2 offset = vec2(float(x), float(y)) * texelSize * radius;
      float weight = exp(-float(x*x + y*y) / 8.0);
      localAvg += texture(u_image, uv + offset).rgb * weight;
      totalWeight += weight;
    }
  }
  localAvg /= totalWeight;

  // Enhance local contrast by boosting difference from local average
  float clarityAmount = u_clarity / 100.0;
  vec3 diff = color - localAvg;
  return color + diff * clarityAmount;
}

// Texture - fine detail control at smaller radius than clarity
vec3 applyTexture(vec3 color, vec2 uv) {
  if (u_texture == 0.0) return color;

  vec2 texelSize = 1.0 / u_resolution;
  float radius = 3.0;  // Smaller than clarity (10px) for fine detail

  // High-frequency detail extraction (3x3 kernel)
  vec3 localAvg = vec3(0.0);
  float totalWeight = 0.0;

  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec2 offset = vec2(float(x), float(y)) * texelSize * radius;
      float weight = 1.0 - length(vec2(float(x), float(y))) * 0.3;
      localAvg += texture(u_image, uv + offset).rgb * weight;
      totalWeight += weight;
    }
  }
  localAvg /= totalWeight;

  // Extract and boost high-frequency detail
  float textureAmount = u_texture / 100.0;
  vec3 detail = color - localAvg;
  return color + detail * textureAmount * 1.5;
}

// Dehaze - atmospheric haze removal using dark channel prior approximation
vec3 applyDehaze(vec3 color, vec2 uv) {
  if (u_dehaze == 0.0) return color;

  vec2 texelSize = 1.0 / u_resolution;
  float radius = 15.0;

  // Find dark channel (minimum RGB in local patch)
  float darkChannel = 1.0;
  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      vec2 offset = vec2(float(x), float(y)) * texelSize * radius;
      vec3 texSample = texture(u_image, uv + offset).rgb;
      darkChannel = min(darkChannel, min(min(texSample.r, texSample.g), texSample.b));
    }
  }

  // Estimate transmission (how much haze)
  float transmission = 1.0 - darkChannel * 0.95;
  transmission = clamp(transmission, 0.1, 1.0);

  // Atmospheric light (assume brightest = haze color, typically white-ish)
  vec3 atmosphericLight = vec3(1.0);

  float dehazeAmount = u_dehaze / 100.0;

  if (dehazeAmount > 0.0) {
    // Remove haze: recover original color
    vec3 dehazed = (color - atmosphericLight * (1.0 - transmission)) / max(transmission, 0.1);
    color = mix(color, dehazed, dehazeAmount);
  } else {
    // Add haze: blend toward atmospheric light
    color = mix(color, mix(color, atmosphericLight, 1.0 - transmission), -dehazeAmount);
  }

  return clamp(color, 0.0, 1.0);
}

// Chromatic Aberration Removal - fixes color fringing at edges
vec3 applyChromaticAberrationFix(vec2 uv) {
  if (u_caAmount == 0.0) {
    return texture(u_image, uv).rgb;
  }

  // Calculate distance from center (CA is stronger at edges)
  vec2 center = vec2(0.5);
  vec2 dir = uv - center;
  float dist = length(dir);

  // Shift amount increases toward edges
  float shift = u_caAmount / 100.0 * 0.003 * dist;

  // Sample RGB at slightly different positions
  float r = texture(u_image, uv + dir * shift).r;
  float g = texture(u_image, uv).g;  // Green stays centered
  float b = texture(u_image, uv - dir * shift).b;

  return vec3(r, g, b);
}

// Sharpening using unsharp mask technique
// Uses larger kernel and proper Gaussian for visible results
vec3 applySharpening(vec3 color, vec2 uv) {
  if (u_sharpeningAmount == 0.0) return color;

  vec2 texelSize = 1.0 / u_resolution;

  // Radius controls the blur spread (0.5-3.0 maps to actual pixel coverage)
  float sigma = u_sharpeningRadius * 1.5;

  // Sample surrounding pixels for blur (unsharp mask base)
  // Use 9x9 kernel for better quality
  vec3 blurred = vec3(0.0);
  float totalWeight = 0.0;

  for (int x = -4; x <= 4; x++) {
    for (int y = -4; y <= 4; y++) {
      vec2 offset = vec2(float(x), float(y)) * texelSize * u_sharpeningRadius;
      float dist2 = float(x*x + y*y);
      float weight = exp(-dist2 / (2.0 * sigma * sigma));
      blurred += texture(u_image, uv + offset).rgb * weight;
      totalWeight += weight;
    }
  }
  blurred /= totalWeight;

  // Calculate the mask (difference between original and blurred)
  vec3 mask = color - blurred;

  // Detail preservation: controls which edges get sharpened
  // Low detail = only strong edges, High detail = all edges including fine details
  float maskStrength = length(mask);
  // Threshold range 0.0 to 0.2 - wide enough to see the difference
  float detailThreshold = (100.0 - u_sharpeningDetail) / 100.0 * 0.2;
  float detailFactor = u_sharpeningDetail >= 99.0 ? 1.0 : smoothstep(0.0, max(detailThreshold, 0.002), maskStrength);

  // Apply sharpening - amount 100 = strong visible sharpening
  float amount = u_sharpeningAmount / 100.0 * 3.0;
  return color + mask * amount * detailFactor;
}

// Noise reduction using bilateral filter for luminance, simple blur for color
// Color NR can be aggressive since eyes are less sensitive to chroma edges
vec3 applyNoiseReduction(vec3 color, vec2 uv) {
  if (u_noiseReductionLuminance == 0.0 && u_noiseReductionColor == 0.0) return color;

  vec2 texelSize = 1.0 / u_resolution;
  float lumStrength = u_noiseReductionLuminance / 100.0;
  float colorStrength = u_noiseReductionColor / 100.0;

  // Detail: 0 = aggressive smoothing, 100 = preserve fine detail
  float edgeThreshold = 0.02 + (100.0 - u_noiseReductionDetail) / 100.0 * 0.15;

  // Convert to luminance + chroma
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  vec3 chroma = color - vec3(lum);

  // Accumulators
  float lumBlurred = 0.0;
  float lumTotalWeight = 0.0;
  vec3 chromaBlurred = vec3(0.0);
  float chromaTotalWeight = 0.0;

  // 7x7 kernel
  for (int x = -3; x <= 3; x++) {
    for (int y = -3; y <= 3; y++) {
      float dist2 = float(x*x + y*y);
      float spatialWeight = exp(-dist2 / 12.0);

      // Sample for luminance NR (tighter sampling)
      vec2 lumOffset = vec2(float(x), float(y)) * texelSize * 1.2;
      vec3 lumSample = texture(u_image, uv + lumOffset).rgb;
      float sampleLum = dot(lumSample, vec3(0.2126, 0.7152, 0.0722));

      // Luminance: bilateral (edge-aware)
      float lumDiff = abs(sampleLum - lum);
      float lumRangeWeight = exp(-lumDiff * lumDiff / (edgeThreshold * edgeThreshold));
      float lumWeight = spatialWeight * lumRangeWeight;
      lumBlurred += sampleLum * lumWeight;
      lumTotalWeight += lumWeight;

      // Sample for color NR (wider sampling to catch color splotches)
      vec2 chromaOffset = vec2(float(x), float(y)) * texelSize * 2.0;
      vec3 chromaSample = texture(u_image, uv + chromaOffset).rgb;
      float chromaSampleLum = dot(chromaSample, vec3(0.2126, 0.7152, 0.0722));
      vec3 sampleChroma = chromaSample - vec3(chromaSampleLum);

      // Color: simple Gaussian blur (no edge preservation needed for chroma)
      // Human vision is much less sensitive to color edges
      chromaBlurred += sampleChroma * spatialWeight;
      chromaTotalWeight += spatialWeight;
    }
  }

  lumBlurred /= lumTotalWeight;
  chromaBlurred /= chromaTotalWeight;

  // Blend original and blurred based on strength
  float finalLum = mix(lum, lumBlurred, lumStrength);
  vec3 finalChroma = mix(chroma, chromaBlurred, colorStrength);

  return vec3(finalLum) + finalChroma;
}
`;
