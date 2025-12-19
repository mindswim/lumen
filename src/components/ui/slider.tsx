"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

// Gradient presets for special sliders
const GRADIENT_TRACKS = {
  temperature: 'linear-gradient(to right, #3b82f6, #fbbf24)',
  tint: 'linear-gradient(to right, #22c55e, #ec4899)',
} as const;

type GradientType = keyof typeof GRADIENT_TRACKS;

interface SliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  gradient?: GradientType;
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  gradient,
  ...props
}: SliderProps) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1"
        style={gradient ? { background: GRADIENT_TRACKS[gradient] } : { backgroundColor: 'var(--editor-neutral-300)' }}
      >
        {!gradient && (
          <SliderPrimitive.Range
            data-slot="slider-range"
            className="absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
            style={{ backgroundColor: 'var(--editor-accent)' }}
          />
        )}
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="block size-4 shrink-0 rounded-full shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
          style={{ backgroundColor: 'var(--editor-accent)', boxShadow: '0 0 0 0 var(--editor-accent-foreground)' }}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
export type { GradientType }
