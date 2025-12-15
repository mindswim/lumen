'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from '@/lib/editor/state';
import { CropRect } from '@/types/editor';

interface CropOverlayProps {
  canvasWidth: number;
  canvasHeight: number;
  imageWidth: number;
  imageHeight: number;
}

type DragHandle =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'move'
  | null;

export function CropOverlay({
  canvasWidth,
  canvasHeight,
  imageWidth,
  imageHeight,
}: CropOverlayProps) {
  const editState = useEditorStore((state) => state.editState);
  const updateEditState = useEditorStore((state) => state.updateEditState);
  const cropAspectRatio = useEditorStore((state) => state.cropAspectRatio);
  const isCropping = useEditorStore((state) => state.isCropping);

  const overlayRef = useRef<HTMLDivElement>(null);
  const [dragHandle, setDragHandle] = useState<DragHandle>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState<CropRect | null>(null);

  // Calculate scale factor between canvas and image
  const scale = Math.min(canvasWidth / imageWidth, canvasHeight / imageHeight);
  const offsetX = (canvasWidth - imageWidth * scale) / 2;
  const offsetY = (canvasHeight - imageHeight * scale) / 2;

  // Initialize crop rect if not set
  useEffect(() => {
    if (isCropping && !editState.crop) {
      // Default crop is full image
      updateEditState({
        crop: {
          top: 0,
          left: 0,
          width: imageWidth,
          height: imageHeight,
        },
      });
    }
  }, [isCropping, editState.crop, imageWidth, imageHeight, updateEditState]);

  // Convert image coordinates to canvas coordinates
  const toCanvas = useCallback(
    (crop: CropRect) => ({
      left: offsetX + crop.left * scale,
      top: offsetY + crop.top * scale,
      width: crop.width * scale,
      height: crop.height * scale,
    }),
    [offsetX, offsetY, scale]
  );

  // Convert canvas coordinates to image coordinates
  const toImage = useCallback(
    (canvasRect: { left: number; top: number; width: number; height: number }) => ({
      left: Math.max(0, Math.min(imageWidth, (canvasRect.left - offsetX) / scale)),
      top: Math.max(0, Math.min(imageHeight, (canvasRect.top - offsetY) / scale)),
      width: Math.max(10, canvasRect.width / scale),
      height: Math.max(10, canvasRect.height / scale),
    }),
    [offsetX, offsetY, scale, imageWidth, imageHeight]
  );

  const crop = editState.crop || {
    top: 0,
    left: 0,
    width: imageWidth,
    height: imageHeight,
  };

  const canvasCrop = toCanvas(crop);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle: DragHandle) => {
      e.preventDefault();
      e.stopPropagation();
      setDragHandle(handle);
      setDragStart({ x: e.clientX, y: e.clientY });
      setCropStart({ ...crop });
    },
    [crop]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragHandle || !cropStart) return;

      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      // Convert delta to image coordinates
      const dxImg = dx / scale;
      const dyImg = dy / scale;

      let newCrop = { ...cropStart };

      if (dragHandle === 'move') {
        // Move the entire crop area
        newCrop.left = Math.max(
          0,
          Math.min(imageWidth - cropStart.width, cropStart.left + dxImg)
        );
        newCrop.top = Math.max(
          0,
          Math.min(imageHeight - cropStart.height, cropStart.top + dyImg)
        );
      } else {
        // Resize based on handle
        if (dragHandle.includes('w')) {
          const newLeft = Math.max(0, cropStart.left + dxImg);
          const newWidth = cropStart.width - (newLeft - cropStart.left);
          if (newWidth >= 10) {
            newCrop.left = newLeft;
            newCrop.width = newWidth;
          }
        }
        if (dragHandle.includes('e')) {
          const newWidth = Math.min(
            imageWidth - cropStart.left,
            cropStart.width + dxImg
          );
          if (newWidth >= 10) {
            newCrop.width = newWidth;
          }
        }
        if (dragHandle.includes('n')) {
          const newTop = Math.max(0, cropStart.top + dyImg);
          const newHeight = cropStart.height - (newTop - cropStart.top);
          if (newHeight >= 10) {
            newCrop.top = newTop;
            newCrop.height = newHeight;
          }
        }
        if (dragHandle.includes('s')) {
          const newHeight = Math.min(
            imageHeight - cropStart.top,
            cropStart.height + dyImg
          );
          if (newHeight >= 10) {
            newCrop.height = newHeight;
          }
        }

        // Apply aspect ratio constraint if set
        if (cropAspectRatio !== null) {
          const targetRatio = cropAspectRatio;
          const currentRatio = newCrop.width / newCrop.height;

          if (
            dragHandle.includes('n') ||
            dragHandle.includes('s') ||
            dragHandle === 'n' ||
            dragHandle === 's'
          ) {
            // Height changed, adjust width
            newCrop.width = newCrop.height * targetRatio;
            // Center horizontally if we can
            const maxWidth = imageWidth - newCrop.left;
            if (newCrop.width > maxWidth) {
              newCrop.width = maxWidth;
              newCrop.height = newCrop.width / targetRatio;
            }
          } else {
            // Width changed, adjust height
            newCrop.height = newCrop.width / targetRatio;
            // Ensure height fits
            const maxHeight = imageHeight - newCrop.top;
            if (newCrop.height > maxHeight) {
              newCrop.height = maxHeight;
              newCrop.width = newCrop.height * targetRatio;
            }
          }
        }
      }

      // Clamp to image bounds
      newCrop.left = Math.max(0, Math.min(imageWidth - newCrop.width, newCrop.left));
      newCrop.top = Math.max(0, Math.min(imageHeight - newCrop.height, newCrop.top));

      updateEditState({ crop: newCrop });
    },
    [
      dragHandle,
      cropStart,
      dragStart,
      scale,
      imageWidth,
      imageHeight,
      cropAspectRatio,
      updateEditState,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setDragHandle(null);
    setCropStart(null);
  }, []);

  useEffect(() => {
    if (dragHandle) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragHandle, handleMouseMove, handleMouseUp]);

  if (!isCropping) return null;

  const handleSize = 10;
  const halfHandle = handleSize / 2;

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 20 }}
    >
      {/* Darkened areas outside crop */}
      <div
        className="absolute bg-black/50"
        style={{
          top: 0,
          left: 0,
          right: 0,
          height: canvasCrop.top,
        }}
      />
      <div
        className="absolute bg-black/50"
        style={{
          bottom: 0,
          left: 0,
          right: 0,
          height: canvasHeight - canvasCrop.top - canvasCrop.height,
        }}
      />
      <div
        className="absolute bg-black/50"
        style={{
          top: canvasCrop.top,
          left: 0,
          width: canvasCrop.left,
          height: canvasCrop.height,
        }}
      />
      <div
        className="absolute bg-black/50"
        style={{
          top: canvasCrop.top,
          right: 0,
          width: canvasWidth - canvasCrop.left - canvasCrop.width,
          height: canvasCrop.height,
        }}
      />

      {/* Crop area border */}
      <div
        className="absolute border-2 border-white pointer-events-auto cursor-move"
        style={{
          top: canvasCrop.top,
          left: canvasCrop.left,
          width: canvasCrop.width,
          height: canvasCrop.height,
        }}
        onMouseDown={(e) => handleMouseDown(e, 'move')}
      >
        {/* Rule of thirds grid */}
        <div className="absolute inset-0">
          <div
            className="absolute w-full h-px bg-white/30"
            style={{ top: '33.33%' }}
          />
          <div
            className="absolute w-full h-px bg-white/30"
            style={{ top: '66.66%' }}
          />
          <div
            className="absolute h-full w-px bg-white/30"
            style={{ left: '33.33%' }}
          />
          <div
            className="absolute h-full w-px bg-white/30"
            style={{ left: '66.66%' }}
          />
        </div>
      </div>

      {/* Corner handles */}
      {(['nw', 'ne', 'se', 'sw'] as const).map((corner) => {
        const isTop = corner.includes('n');
        const isLeft = corner.includes('w');
        return (
          <div
            key={corner}
            className="absolute bg-white border border-neutral-300 pointer-events-auto"
            style={{
              width: handleSize,
              height: handleSize,
              top: isTop
                ? canvasCrop.top - halfHandle
                : canvasCrop.top + canvasCrop.height - halfHandle,
              left: isLeft
                ? canvasCrop.left - halfHandle
                : canvasCrop.left + canvasCrop.width - halfHandle,
              cursor: `${corner}-resize`,
            }}
            onMouseDown={(e) => handleMouseDown(e, corner)}
          />
        );
      })}

      {/* Edge handles */}
      {(['n', 'e', 's', 'w'] as const).map((edge) => {
        const isVertical = edge === 'n' || edge === 's';
        const handleWidth = isVertical ? 40 : handleSize;
        const handleHeight = isVertical ? handleSize : 40;

        let top, left;
        if (edge === 'n') {
          top = canvasCrop.top - halfHandle;
          left = canvasCrop.left + canvasCrop.width / 2 - handleWidth / 2;
        } else if (edge === 's') {
          top = canvasCrop.top + canvasCrop.height - halfHandle;
          left = canvasCrop.left + canvasCrop.width / 2 - handleWidth / 2;
        } else if (edge === 'w') {
          top = canvasCrop.top + canvasCrop.height / 2 - handleHeight / 2;
          left = canvasCrop.left - halfHandle;
        } else {
          top = canvasCrop.top + canvasCrop.height / 2 - handleHeight / 2;
          left = canvasCrop.left + canvasCrop.width - halfHandle;
        }

        return (
          <div
            key={edge}
            className="absolute bg-white border border-neutral-300 pointer-events-auto"
            style={{
              width: handleWidth,
              height: handleHeight,
              top,
              left,
              cursor: isVertical ? 'ns-resize' : 'ew-resize',
            }}
            onMouseDown={(e) => handleMouseDown(e, edge)}
          />
        );
      })}
    </div>
  );
}
