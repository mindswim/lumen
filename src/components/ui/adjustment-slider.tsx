'use client';

import { Slider, GradientType } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface AdjustmentSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  onChange: (value: number) => void;
  onReset?: () => void;
  formatValue?: (value: number) => string;
  className?: string;
  gradient?: GradientType;
}

export function AdjustmentSlider({
  label,
  value,
  min,
  max,
  step = 1,
  defaultValue = 0,
  onChange,
  onReset,
  formatValue,
  className,
  gradient,
}: AdjustmentSliderProps) {
  const isDefault = value === defaultValue;
  const displayValue = formatValue
    ? formatValue(value)
    : step < 1
    ? value.toFixed(1)
    : value.toFixed(0);

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      onChange(defaultValue);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between items-center">
        <span className="text-sm text-neutral-300">{label}</span>
        <button
          onClick={handleReset}
          className={cn(
            'text-sm tabular-nums transition-colors border-b',
            isDefault
              ? 'text-neutral-500 border-transparent'
              : 'text-white border-neutral-600 hover:border-neutral-400'
          )}
        >
          {displayValue}
        </button>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        gradient={gradient}
        onValueChange={([v]) => onChange(v)}
        onDoubleClick={handleReset}
        className="w-full"
      />
    </div>
  );
}

// Preset slider configurations for common adjustment types
export const sliderPresets = {
  exposure: { min: -5, max: 5, step: 0.1, defaultValue: 0 },
  contrast: { min: -100, max: 100, step: 1, defaultValue: 0 },
  highlights: { min: -100, max: 100, step: 1, defaultValue: 0 },
  shadows: { min: -100, max: 100, step: 1, defaultValue: 0 },
  whites: { min: -100, max: 100, step: 1, defaultValue: 0 },
  blacks: { min: -100, max: 100, step: 1, defaultValue: 0 },
  fade: { min: 0, max: 100, step: 1, defaultValue: 0 },
  temperature: { min: -100, max: 100, step: 1, defaultValue: 0 },
  tint: { min: -100, max: 100, step: 1, defaultValue: 0 },
  clarity: { min: -100, max: 100, step: 1, defaultValue: 0 },
  vibrance: { min: -100, max: 100, step: 1, defaultValue: 0 },
  saturation: { min: -100, max: 100, step: 1, defaultValue: 0 },
  skinTone: { min: -100, max: 100, step: 1, defaultValue: 0 },
  sharpening: { min: 0, max: 100, step: 1, defaultValue: 0 },
  noiseReduction: { min: 0, max: 100, step: 1, defaultValue: 0 },
  grain: { min: 0, max: 100, step: 1, defaultValue: 0 },
  vignette: { min: -100, max: 100, step: 1, defaultValue: 0 },
  rotation: { min: -180, max: 180, step: 0.1, defaultValue: 0 },
  straighten: { min: -45, max: 45, step: 0.1, defaultValue: 0 },
  intensity: { min: 0, max: 100, step: 1, defaultValue: 100 },
  opacity: { min: 0, max: 100, step: 1, defaultValue: 100 },
} as const;

// Helper to get preset props
export function getSliderProps(preset: keyof typeof sliderPresets) {
  return sliderPresets[preset];
}
