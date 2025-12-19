'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface ColorWheelProps {
  hue: number;           // 0-360
  saturation: number;    // 0-100
  onHueChange: (hue: number) => void;
  onSatChange: (sat: number) => void;
  size?: number;         // Diameter in pixels (default 80)
  disabled?: boolean;
}

export function ColorWheel({
  hue,
  saturation,
  onHueChange,
  onSatChange,
  size = 80,
  disabled = false,
}: ColorWheelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const radius = size / 2;
  const handleRadius = 6;

  // Convert hue/saturation to x/y position
  const getHandlePosition = useCallback(() => {
    const angle = (hue - 90) * (Math.PI / 180); // -90 to start from top
    const distance = (saturation / 100) * (radius - handleRadius - 2);
    return {
      x: radius + Math.cos(angle) * distance,
      y: radius + Math.sin(angle) * distance,
    };
  }, [hue, saturation, radius]);

  // Convert x/y position to hue/saturation
  const updateFromPosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current || disabled) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left - radius;
      const y = clientY - rect.top - radius;

      // Calculate angle (hue)
      let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;

      // Calculate distance (saturation)
      const maxDistance = radius - handleRadius - 2;
      const distance = Math.min(Math.sqrt(x * x + y * y), maxDistance);
      const newSaturation = (distance / maxDistance) * 100;

      onHueChange(Math.round(angle));
      onSatChange(Math.round(newSaturation));
    },
    [radius, onHueChange, onSatChange, disabled]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsDragging(true);
      updateFromPosition(e.clientX, e.clientY);
    },
    [updateFromPosition, disabled]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      updateFromPosition(e.clientX, e.clientY);
    },
    [isDragging, updateFromPosition]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsDragging(true);
      const touch = e.touches[0];
      updateFromPosition(touch.clientX, touch.clientY);
    },
    [updateFromPosition, disabled]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      updateFromPosition(touch.clientX, touch.clientY);
    },
    [isDragging, updateFromPosition]
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  const handlePos = getHandlePosition();

  // Generate color at current hue for preview
  const hueColor = `hsl(${hue}, 100%, 50%)`;

  return (
    <div
      ref={containerRef}
      className={`relative rounded-full cursor-crosshair select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      style={{
        width: size,
        height: size,
        background: `
          conic-gradient(
            from 0deg,
            hsl(0, 100%, 50%),
            hsl(60, 100%, 50%),
            hsl(120, 100%, 50%),
            hsl(180, 100%, 50%),
            hsl(240, 100%, 50%),
            hsl(300, 100%, 50%),
            hsl(360, 100%, 50%)
          )
        `,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* White center overlay for saturation gradient */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(128,128,128,1) 0%, rgba(128,128,128,0) 70%)',
        }}
      />

      {/* Border */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ pointerEvents: 'none', border: '1px solid var(--editor-border)' }}
      />

      {/* Handle */}
      <div
        className="absolute rounded-full border-2 border-white shadow-lg"
        style={{
          width: handleRadius * 2,
          height: handleRadius * 2,
          left: handlePos.x - handleRadius,
          top: handlePos.y - handleRadius,
          backgroundColor: saturation > 0 ? hueColor : '#808080',
          pointerEvents: 'none',
          boxShadow: '0 0 4px rgba(0,0,0,0.5)',
        }}
      />

      {/* Center dot for reset */}
      <div
        className="absolute rounded-full cursor-pointer"
        style={{
          width: 8,
          height: 8,
          left: radius - 4,
          top: radius - 4,
          backgroundColor: 'var(--editor-text-muted)',
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) {
            onSatChange(0);
          }
        }}
      />
    </div>
  );
}
