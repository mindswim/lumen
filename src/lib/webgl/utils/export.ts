/**
 * Image export functionality for the WebGL renderer.
 */
import { EditState, ExportOptions, LutData } from '../types';

/**
 * Export the rendered image to a Blob.
 * Creates an offscreen renderer at full resolution, applies transforms, and exports.
 */
export function exportImage(
  editState: EditState,
  originalImage: HTMLImageElement,
  options: ExportOptions,
  createRenderer: (canvas: HTMLCanvasElement) => {
    setImage: (image: HTMLImageElement) => void;
    setLut: (data: Uint8Array, size: number) => void;
    updateCurveLut: (curve: EditState['curve']) => void;
    render: (editState: EditState) => void;
    dispose: () => void;
  },
  lutData: LutData | null
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const { format = 'jpeg', quality = 0.95, scale = 1, maxDimension } = options;

    // Calculate output dimensions
    let outputWidth = originalImage.width;
    let outputHeight = originalImage.height;

    // Apply crop first to get base dimensions
    const crop = editState.crop;
    if (crop) {
      outputWidth = Math.round(crop.width * originalImage.width);
      outputHeight = Math.round(crop.height * originalImage.height);
    }

    // Apply rotation (swap dimensions for 90/270)
    const rotation = editState.rotation || 0;
    const isRotated90 = Math.abs(rotation) === 90 || Math.abs(rotation) === 270;
    if (isRotated90) {
      [outputWidth, outputHeight] = [outputHeight, outputWidth];
    }

    // Apply scale
    outputWidth = Math.round(outputWidth * scale);
    outputHeight = Math.round(outputHeight * scale);

    // Apply max dimension constraint
    if (maxDimension) {
      const maxSide = Math.max(outputWidth, outputHeight);
      if (maxSide > maxDimension) {
        const ratio = maxDimension / maxSide;
        outputWidth = Math.round(outputWidth * ratio);
        outputHeight = Math.round(outputHeight * ratio);
      }
    }

    // Create offscreen canvas for WebGL rendering at full original resolution
    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = originalImage.width;
    renderCanvas.height = originalImage.height;

    const offscreenRenderer = createRenderer(renderCanvas);
    offscreenRenderer.setImage(originalImage);

    // Copy LUT if set
    if (lutData) {
      offscreenRenderer.setLut(lutData.data, lutData.size);
    }

    offscreenRenderer.updateCurveLut(editState.curve);
    offscreenRenderer.render(editState);

    // Create final output canvas with transforms applied
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = outputWidth;
    outputCanvas.height = outputHeight;

    const ctx = outputCanvas.getContext('2d');
    if (!ctx) {
      offscreenRenderer.dispose();
      reject(new Error('Failed to get canvas context'));
      return;
    }

    // Calculate source region (crop)
    const sourceX = crop ? Math.round(crop.left * originalImage.width) : 0;
    const sourceY = crop ? Math.round(crop.top * originalImage.height) : 0;
    const sourceWidth = crop ? Math.round(crop.width * originalImage.width) : originalImage.width;
    const sourceHeight = crop ? Math.round(crop.height * originalImage.height) : originalImage.height;

    // Apply transforms
    ctx.save();
    ctx.translate(outputWidth / 2, outputHeight / 2);

    // Rotation
    if (rotation !== 0) {
      ctx.rotate((rotation * Math.PI) / 180);
    }

    // Straighten (fine angle)
    if (editState.straighten) {
      ctx.rotate((editState.straighten * Math.PI) / 180);
    }

    // Flip
    if (editState.flipH) {
      ctx.scale(-1, 1);
    }
    if (editState.flipV) {
      ctx.scale(1, -1);
    }

    // Calculate draw dimensions (account for rotation)
    const drawWidth = isRotated90 ? outputHeight : outputWidth;
    const drawHeight = isRotated90 ? outputWidth : outputHeight;

    // Draw the rendered image with crop and transforms
    ctx.drawImage(
      renderCanvas,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );

    ctx.restore();

    // Clean up offscreen renderer
    offscreenRenderer.dispose();

    // Export to blob
    const mimeType = `image/${format}`;
    outputCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to export image'));
        }
      },
      mimeType,
      format === 'png' ? undefined : quality
    );
  });
}
