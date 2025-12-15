// Histogram computation utilities

export interface HistogramData {
  red: number[];
  green: number[];
  blue: number[];
  luminance: number[];
  max: number; // Maximum value across all channels for normalization
}

const HISTOGRAM_BINS = 256;

// Compute histogram from canvas (supports both 2D and WebGL)
export function computeHistogram(canvas: HTMLCanvasElement): HistogramData {
  let data: Uint8ClampedArray;

  // Try to get WebGL context first
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (gl) {
    // For WebGL canvas, read pixels directly
    const width = canvas.width;
    const height = canvas.height;
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    data = new Uint8ClampedArray(pixels);
  } else {
    // For 2D canvas
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return createEmptyHistogram();
    }
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    data = imageData.data;
  }

  // Initialize histogram arrays
  const red = new Array(HISTOGRAM_BINS).fill(0);
  const green = new Array(HISTOGRAM_BINS).fill(0);
  const blue = new Array(HISTOGRAM_BINS).fill(0);
  const luminance = new Array(HISTOGRAM_BINS).fill(0);

  // Count pixel values
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Alpha is data[i + 3], we skip it

    red[r]++;
    green[g]++;
    blue[b]++;

    // Calculate luminance (perceived brightness)
    // Using standard weights: 0.299R + 0.587G + 0.114B
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    luminance[lum]++;
  }

  // Find maximum value for normalization
  const max = Math.max(
    ...red,
    ...green,
    ...blue,
    ...luminance
  );

  return { red, green, blue, luminance, max };
}

// Create an empty histogram
export function createEmptyHistogram(): HistogramData {
  return {
    red: new Array(HISTOGRAM_BINS).fill(0),
    green: new Array(HISTOGRAM_BINS).fill(0),
    blue: new Array(HISTOGRAM_BINS).fill(0),
    luminance: new Array(HISTOGRAM_BINS).fill(0),
    max: 0,
  };
}

// Throttle histogram computation
export function createThrottledHistogram(delay: number = 100) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastCanvas: HTMLCanvasElement | null = null;
  let lastResult: HistogramData = createEmptyHistogram();

  return {
    compute(canvas: HTMLCanvasElement): HistogramData {
      if (canvas !== lastCanvas) {
        lastCanvas = canvas;
        lastResult = computeHistogram(canvas);
      }
      return lastResult;
    },
    scheduleCompute(
      canvas: HTMLCanvasElement,
      callback: (data: HistogramData) => void
    ) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        lastCanvas = canvas;
        lastResult = computeHistogram(canvas);
        callback(lastResult);
        timeoutId = null;
      }, delay);
    },
    cancel() {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
}
