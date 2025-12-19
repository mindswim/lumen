'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/lib/editor/state';
import { Point } from '@/types/editor';

type CurveChannel = 'rgb' | 'red' | 'green' | 'blue';

const CHANNEL_COLORS: Record<CurveChannel, string> = {
  rgb: '#ffffff',
  red: '#ef4444',
  green: '#22c55e',
  blue: '#3b82f6',
};

interface CurveEditorProps {
  points: Point[];
  onChange: (points: Point[]) => void;
  color: string;
}

function CurveEditor({ points, onChange, color }: CurveEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [size, setSize] = useState(256);

  // Update canvas size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setSize(Math.min(width, 256));
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Draw curve
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get CSS variable values
    const computedStyle = getComputedStyle(document.documentElement);
    const bgColor = computedStyle.getPropertyValue('--editor-bg-tertiary').trim() || '#262626';
    const gridColor = computedStyle.getPropertyValue('--editor-border').trim() || '#404040';
    const refLineColor = computedStyle.getPropertyValue('--editor-text-muted').trim() || '#525252';

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    // Grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const pos = (size / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();
    }

    // Diagonal reference
    ctx.strokeStyle = refLineColor;
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(size, 0);
    ctx.stroke();

    // Curve (Catmull-Rom spline)
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i <= size; i++) {
      const x = i / size;
      const y = interpolateCurve(points, x);
      const canvasX = i;
      const canvasY = size - y * size;

      if (i === 0) {
        ctx.moveTo(canvasX, canvasY);
      } else {
        ctx.lineTo(canvasX, canvasY);
      }
    }
    ctx.stroke();

    // Points
    points.forEach((point) => {
      const canvasX = point.x * size;
      const canvasY = size - point.y * size;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [points, size, color]);

  const interpolateCurve = (pts: Point[], x: number): number => {
    if (pts.length < 2) return x;

    let i = 0;
    while (i < pts.length - 1 && pts[i + 1].x < x) i++;

    if (i >= pts.length - 1) return pts[pts.length - 1].y;
    if (i === 0 && x < pts[0].x) return pts[0].y;

    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[Math.min(pts.length - 1, i + 1)];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const t = (x - p1.x) / (p2.x - p1.x + 0.0001);
    const t2 = t * t;
    const t3 = t2 * t;

    return Math.min(
      1,
      Math.max(
        0,
        0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
      )
    );
  };

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent | MouseEvent): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / size));
      const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / size));
      return { x, y };
    },
    [size]
  );

  const findNearestPoint = useCallback(
    (x: number, y: number): number | null => {
      const threshold = 0.05;
      let minDist = Infinity;
      let nearestIdx: number | null = null;

      points.forEach((point, idx) => {
        const dist = Math.sqrt(
          Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2)
        );
        if (dist < minDist && dist < threshold) {
          minDist = dist;
          nearestIdx = idx;
        }
      });

      return nearestIdx;
    },
    [points]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const { x, y } = getCanvasCoords(e);
      const nearestIdx = findNearestPoint(x, y);

      if (nearestIdx !== null) {
        // Drag existing point (but not endpoints)
        if (nearestIdx > 0 && nearestIdx < points.length - 1) {
          setDragIndex(nearestIdx);
        } else {
          // Drag endpoint (only y)
          setDragIndex(nearestIdx);
        }
      } else {
        // Add new point
        const newPoints = [...points, { x, y }].sort((a, b) => a.x - b.x);
        onChange(newPoints);
        // Find index of new point
        const newIdx = newPoints.findIndex((p) => p.x === x && p.y === y);
        setDragIndex(newIdx);
      }
    },
    [getCanvasCoords, findNearestPoint, points, onChange]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragIndex === null) return;

      const { x, y } = getCanvasCoords(e);
      const newPoints = [...points];

      if (dragIndex === 0 || dragIndex === points.length - 1) {
        // Endpoint: only change y
        newPoints[dragIndex] = { ...newPoints[dragIndex], y };
      } else {
        // Middle point: constrain x between neighbors
        const minX = newPoints[dragIndex - 1].x + 0.01;
        const maxX = newPoints[dragIndex + 1].x - 0.01;
        newPoints[dragIndex] = {
          x: Math.max(minX, Math.min(maxX, x)),
          y,
        };
      }

      onChange(newPoints);
    },
    [dragIndex, points, onChange, getCanvasCoords]
  );

  const handleMouseUp = useCallback(() => {
    setDragIndex(null);
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const { x, y } = getCanvasCoords(e);
      const nearestIdx = findNearestPoint(x, y);

      // Remove point if not endpoint
      if (nearestIdx !== null && nearestIdx > 0 && nearestIdx < points.length - 1) {
        const newPoints = points.filter((_, idx) => idx !== nearestIdx);
        onChange(newPoints);
      }
    },
    [getCanvasCoords, findNearestPoint, points, onChange]
  );

  useEffect(() => {
    if (dragIndex !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragIndex, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="cursor-crosshair rounded"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      />
    </div>
  );
}

export function CurvePanel() {
  const [channel, setChannel] = useState<CurveChannel>('rgb');
  const curve = useEditorStore((state) => state.editState.curve);
  const setCurvePoints = useEditorStore((state) => state.setCurvePoints);

  const resetCurve = () => {
    setCurvePoints(channel, [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <Tabs
          value={channel}
          onValueChange={(v) => setChannel(v as CurveChannel)}
        >
          <TabsList style={{ backgroundColor: 'var(--editor-bg-tertiary)' }}>
            <TabsTrigger
              value="rgb"
              className="text-xs px-3 data-[state=active]:bg-[var(--editor-bg-active)] data-[state=active]:text-[var(--editor-text-primary)]"
            >
              RGB
            </TabsTrigger>
            <TabsTrigger
              value="red"
              className="text-xs px-3 data-[state=active]:bg-red-900/50 data-[state=active]:text-red-400"
            >
              R
            </TabsTrigger>
            <TabsTrigger
              value="green"
              className="text-xs px-3 data-[state=active]:bg-green-900/50 data-[state=active]:text-green-400"
            >
              G
            </TabsTrigger>
            <TabsTrigger
              value="blue"
              className="text-xs px-3 data-[state=active]:bg-blue-900/50 data-[state=active]:text-blue-400"
            >
              B
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetCurve}
          className="text-xs"
          style={{ color: 'var(--editor-text-muted)' }}
        >
          Reset
        </Button>
      </div>

      <CurveEditor
        points={curve[channel]}
        onChange={(points) => setCurvePoints(channel, points)}
        color={CHANNEL_COLORS[channel]}
      />

      <p className="text-xs" style={{ color: 'var(--editor-text-muted)' }}>
        Click to add points. Double-click to remove. Drag to adjust.
      </p>
    </div>
  );
}
