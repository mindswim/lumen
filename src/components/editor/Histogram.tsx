'use client';

import { useMemo } from 'react';
import { HistogramData, createEmptyHistogram } from '@/lib/histogram';

interface HistogramProps {
  data: HistogramData | null;
  width?: number;
  height?: number;
  showRGB?: boolean;
  showLuminance?: boolean;
  className?: string;
}

export function Histogram({
  data,
  width = 256,
  height = 80,
  showRGB = true,
  showLuminance = true,
  className = '',
}: HistogramProps) {
  const histogram = data || createEmptyHistogram();
  const { red, green, blue, luminance, max } = histogram;

  // Generate SVG paths for each channel
  const paths = useMemo(() => {
    if (max === 0) return { red: '', green: '', blue: '', luminance: '' };

    const generatePath = (values: number[]): string => {
      const points = values.map((value, i) => {
        const x = (i / 255) * width;
        const y = height - (value / max) * height;
        return `${x},${y}`;
      });

      // Create a closed path for filled area
      return `M0,${height} L${points.join(' L')} L${width},${height} Z`;
    };

    return {
      red: generatePath(red),
      green: generatePath(green),
      blue: generatePath(blue),
      luminance: generatePath(luminance),
    };
  }, [red, green, blue, luminance, max, width, height]);

  return (
    <div className={`relative ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="bg-neutral-900 rounded"
      >
        {/* Background grid lines */}
        <g className="text-neutral-700" opacity="0.3">
          <line x1={width * 0.25} y1={0} x2={width * 0.25} y2={height} stroke="currentColor" />
          <line x1={width * 0.5} y1={0} x2={width * 0.5} y2={height} stroke="currentColor" />
          <line x1={width * 0.75} y1={0} x2={width * 0.75} y2={height} stroke="currentColor" />
          <line x1={0} y1={height * 0.5} x2={width} y2={height * 0.5} stroke="currentColor" />
        </g>

        {/* Luminance (rendered first, behind RGB) */}
        {showLuminance && (
          <path
            d={paths.luminance}
            fill="white"
            opacity="0.3"
          />
        )}

        {/* RGB channels with blend mode */}
        {showRGB && (
          <g style={{ mixBlendMode: 'screen' }}>
            <path d={paths.red} fill="#ef4444" opacity="0.7" />
            <path d={paths.green} fill="#22c55e" opacity="0.7" />
            <path d={paths.blue} fill="#3b82f6" opacity="0.7" />
          </g>
        )}
      </svg>

      {/* Labels */}
      <div className="flex justify-between text-[9px] text-neutral-500 mt-1 px-0.5">
        <span>0</span>
        <span>128</span>
        <span>255</span>
      </div>
    </div>
  );
}

// Compact histogram for toolbar/header
export function CompactHistogram({
  data,
  className = '',
}: {
  data: HistogramData | null;
  className?: string;
}) {
  return (
    <Histogram
      data={data}
      width={120}
      height={40}
      showRGB={true}
      showLuminance={false}
      className={className}
    />
  );
}
