'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useEditorStore } from '@/lib/editor/state';

interface ComparisonOverlayProps {
  canvasWidth: number;
  canvasHeight: number;
}

export function ComparisonOverlay({ canvasWidth, canvasHeight }: ComparisonOverlayProps) {
  const comparisonMode = useEditorStore((state) => state.comparisonMode);
  const splitPosition = useEditorStore((state) => state.comparisonSplitPosition);
  const setSplitPosition = useEditorStore((state) => state.setComparisonSplitPosition);

  const [isDragging, setIsDragging] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !overlayRef.current) return;

      const rect = overlayRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newPosition = Math.max(0.05, Math.min(0.95, x / canvasWidth));
      setSplitPosition(newPosition);
    },
    [isDragging, canvasWidth, setSplitPosition]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (comparisonMode !== 'split') return null;

  const dividerX = splitPosition * canvasWidth;

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 30 }}
    >
      {/* Labels */}
      <div
        className="absolute top-3 left-3 px-2 py-1 bg-black/60 text-white text-xs rounded"
        style={{ opacity: splitPosition > 0.15 ? 1 : 0 }}
      >
        Original
      </div>
      <div
        className="absolute top-3 right-3 px-2 py-1 bg-black/60 text-white text-xs rounded"
        style={{ opacity: splitPosition < 0.85 ? 1 : 0 }}
      >
        Edited
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-auto cursor-ew-resize"
        style={{ left: dividerX - 1 }}
        onMouseDown={handleMouseDown}
      >
        {/* Handle circle */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center"
        >
          <div className="flex gap-0.5">
            <div className="w-0.5 h-4 bg-neutral-400 rounded-full" />
            <div className="w-0.5 h-4 bg-neutral-400 rounded-full" />
          </div>
        </div>
      </div>

      {/* Left side mask (clip to show original) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ width: dividerX }}
      >
        {/* This will be used by the Canvas to mask the edited version */}
      </div>
    </div>
  );
}
