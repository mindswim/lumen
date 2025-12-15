'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '@/lib/editor/state';
import {
  Mask,
  RadialMaskData,
  LinearMaskData,
  BrushMaskData,
} from '@/types/editor';

interface MaskOverlayProps {
  canvasWidth: number;
  canvasHeight: number;
}

export function MaskOverlay({ canvasWidth, canvasHeight }: MaskOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const masks = useEditorStore((state) => state.editState.masks);
  const selectedMaskId = useEditorStore((state) => state.selectedMaskId);
  const updateMask = useEditorStore((state) => state.updateMask);

  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const selectedMask = masks.find((m) => m.id === selectedMaskId);

  // Draw mask visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasWidth === 0 || canvasHeight === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw selected mask visualization
    if (selectedMask && selectedMask.visible) {
      ctx.save();

      if (selectedMask.type === 'radial') {
        drawRadialMask(ctx, selectedMask.data as RadialMaskData, canvasWidth, canvasHeight);
      } else if (selectedMask.type === 'linear') {
        drawLinearMask(ctx, selectedMask.data as LinearMaskData, canvasWidth, canvasHeight);
      } else if (selectedMask.type === 'brush') {
        drawBrushMask(ctx, selectedMask.data as BrushMaskData, canvasWidth, canvasHeight);
      }

      ctx.restore();
    }
  }, [selectedMask, canvasWidth, canvasHeight, masks]);

  const drawRadialMask = (
    ctx: CanvasRenderingContext2D,
    data: RadialMaskData,
    width: number,
    height: number
  ) => {
    const cx = data.centerX * width;
    const cy = data.centerY * height;
    const rx = data.radiusX * width;
    const ry = data.radiusY * height;

    // Draw ellipse outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Feather edge
    const featherRx = rx * (1 + data.feather);
    const featherRy = ry * (1 + data.feather);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, featherRx, featherRy, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([]);

    // Center handle
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Edge handles
    const handles = [
      { x: cx + rx, y: cy },
      { x: cx - rx, y: cy },
      { x: cx, y: cy + ry },
      { x: cx, y: cy - ry },
    ];

    handles.forEach((h) => {
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(h.x, h.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  };

  const drawLinearMask = (
    ctx: CanvasRenderingContext2D,
    data: LinearMaskData,
    width: number,
    height: number
  ) => {
    const sx = data.startX * width;
    const sy = data.startY * height;
    const ex = data.endX * width;
    const ey = data.endY * height;

    // Draw line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);

    // Start handle
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sx, sy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // End handle
    ctx.beginPath();
    ctx.arc(ex, ey, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw perpendicular lines to show gradient direction
    const dx = ex - sx;
    const dy = ey - sy;
    const len = Math.sqrt(dx * dx + dy * dy);
    const perpX = (-dy / len) * 30;
    const perpY = (dx / len) * 30;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.moveTo(sx + perpX, sy + perpY);
    ctx.lineTo(sx - perpX, sy - perpY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(ex + perpX, ey + perpY);
    ctx.lineTo(ex - perpX, ey - perpY);
    ctx.stroke();
  };

  const drawBrushMask = (
    ctx: CanvasRenderingContext2D,
    data: BrushMaskData,
    width: number,
    height: number
  ) => {
    // Draw brush strokes as semi-transparent overlay
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'rgba(255, 100, 100, 0.5)';

    data.strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      ctx.beginPath();
      const firstPoint = stroke.points[0];
      ctx.moveTo(firstPoint.x * width, firstPoint.y * height);

      stroke.points.forEach((point) => {
        ctx.lineTo(point.x * width, point.y * height);
      });

      ctx.strokeStyle = stroke.erase
        ? 'rgba(100, 100, 255, 0.5)'
        : 'rgba(255, 100, 100, 0.5)';
      ctx.lineWidth = stroke.size * Math.min(width, height) * 0.1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
  };

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / canvasWidth,
        y: (e.clientY - rect.top) / canvasHeight,
      };
    },
    [canvasWidth, canvasHeight]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!selectedMask) return;

      const { x, y } = getCanvasCoords(e);
      setDragStart({ x, y });

      if (selectedMask.type === 'radial') {
        const data = selectedMask.data as RadialMaskData;
        const cx = data.centerX;
        const cy = data.centerY;
        const rx = data.radiusX;
        const ry = data.radiusY;

        // Check if clicking on center
        const distToCenter = Math.sqrt(
          Math.pow(x - cx, 2) + Math.pow(y - cy, 2)
        );
        if (distToCenter < 0.03) {
          setIsDragging(true);
          setDragType('center');
          return;
        }

        // Check edge handles
        const handles = ['right', 'left', 'bottom', 'top'];
        const positions = [
          { x: cx + rx, y: cy },
          { x: cx - rx, y: cy },
          { x: cx, y: cy + ry },
          { x: cx, y: cy - ry },
        ];

        for (let i = 0; i < handles.length; i++) {
          const dist = Math.sqrt(
            Math.pow(x - positions[i].x, 2) + Math.pow(y - positions[i].y, 2)
          );
          if (dist < 0.03) {
            setIsDragging(true);
            setDragType(handles[i]);
            return;
          }
        }
      } else if (selectedMask.type === 'linear') {
        const data = selectedMask.data as LinearMaskData;

        const distToStart = Math.sqrt(
          Math.pow(x - data.startX, 2) + Math.pow(y - data.startY, 2)
        );
        if (distToStart < 0.03) {
          setIsDragging(true);
          setDragType('start');
          return;
        }

        const distToEnd = Math.sqrt(
          Math.pow(x - data.endX, 2) + Math.pow(y - data.endY, 2)
        );
        if (distToEnd < 0.03) {
          setIsDragging(true);
          setDragType('end');
          return;
        }
      } else if (selectedMask.type === 'brush') {
        // Start new brush stroke
        setIsDragging(true);
        setDragType('brush');

        const data = selectedMask.data as BrushMaskData;
        const newStroke = {
          points: [{ x, y }],
          size: 0.5,
          feather: 0.2,
          erase: e.altKey,
        };

        updateMask(selectedMask.id, {
          data: {
            ...data,
            strokes: [...data.strokes, newStroke],
          },
        });
      }
    },
    [selectedMask, getCanvasCoords, updateMask]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !selectedMask || !dragType) return;

      const { x, y } = getCanvasCoords(e);

      if (selectedMask.type === 'radial') {
        const data = selectedMask.data as RadialMaskData;

        if (dragType === 'center') {
          updateMask(selectedMask.id, {
            data: { ...data, centerX: x, centerY: y },
          });
        } else if (dragType === 'right') {
          updateMask(selectedMask.id, {
            data: { ...data, radiusX: Math.abs(x - data.centerX) },
          });
        } else if (dragType === 'left') {
          updateMask(selectedMask.id, {
            data: { ...data, radiusX: Math.abs(data.centerX - x) },
          });
        } else if (dragType === 'bottom') {
          updateMask(selectedMask.id, {
            data: { ...data, radiusY: Math.abs(y - data.centerY) },
          });
        } else if (dragType === 'top') {
          updateMask(selectedMask.id, {
            data: { ...data, radiusY: Math.abs(data.centerY - y) },
          });
        }
      } else if (selectedMask.type === 'linear') {
        const data = selectedMask.data as LinearMaskData;

        if (dragType === 'start') {
          updateMask(selectedMask.id, {
            data: { ...data, startX: x, startY: y },
          });
        } else if (dragType === 'end') {
          updateMask(selectedMask.id, {
            data: { ...data, endX: x, endY: y },
          });
        }
      } else if (selectedMask.type === 'brush' && dragType === 'brush') {
        const data = selectedMask.data as BrushMaskData;
        const strokes = [...data.strokes];
        const lastStroke = strokes[strokes.length - 1];

        if (lastStroke) {
          lastStroke.points.push({ x, y });
          updateMask(selectedMask.id, {
            data: { ...data, strokes },
          });
        }
      }
    },
    [isDragging, selectedMask, dragType, getCanvasCoords, updateMask]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragType(null);
  }, []);

  if (canvasWidth === 0 || canvasHeight === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className="absolute inset-0 pointer-events-auto"
      style={{ width: canvasWidth, height: canvasHeight }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}
