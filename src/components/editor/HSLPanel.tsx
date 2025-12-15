'use client';

import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { useEditorStore } from '@/lib/editor/state';
import { useGalleryStore } from '@/lib/gallery/store';
import { ColorRange, HSLAdjustment } from '@/types/editor';

const COLOR_RANGES: { id: ColorRange; label: string; hue: string }[] = [
  { id: 'red', label: 'Red', hue: '0deg' },
  { id: 'orange', label: 'Orange', hue: '30deg' },
  { id: 'yellow', label: 'Yellow', hue: '60deg' },
  { id: 'green', label: 'Green', hue: '120deg' },
  { id: 'aqua', label: 'Aqua', hue: '180deg' },
  { id: 'blue', label: 'Blue', hue: '240deg' },
  { id: 'purple', label: 'Purple', hue: '270deg' },
  { id: 'magenta', label: 'Magenta', hue: '330deg' },
];

interface HSLSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  color?: string;
}

function HSLSlider({ label, value, onChange, color }: HSLSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-neutral-400">{label}</span>
        <span className="text-white tabular-nums w-10 text-right">
          {value.toFixed(0)}
        </span>
      </div>
      <Slider
        value={[value]}
        min={-100}
        max={100}
        step={1}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
        style={
          color
            ? {
                '--slider-color': color,
              } as React.CSSProperties
            : undefined
        }
      />
    </div>
  );
}

export function HSLPanel() {
  const [selectedColor, setSelectedColor] = useState<ColorRange>('red');
  const image = useEditorStore((state) => state.image);
  const editorHsl = useEditorStore((state) => state.editState.hsl);
  const setHSL = useEditorStore((state) => state.setHSL);

  // Gallery store for batch mode
  const { selectedIds, images: galleryImages, updateImageEditState } = useGalleryStore();

  // Determine mode: editor (single image) or gallery (batch)
  const isGalleryMode = !image && selectedIds.length > 0;
  const selectedGalleryImages = isGalleryMode
    ? galleryImages.filter((img) => selectedIds.includes(img.id))
    : [];

  // Use first selected image's HSL for display in gallery mode
  const hsl = isGalleryMode && selectedGalleryImages.length > 0
    ? selectedGalleryImages[0].editState.hsl
    : editorHsl;

  const currentColor = COLOR_RANGES.find((c) => c.id === selectedColor);
  const currentHSL = hsl[selectedColor];

  const handleUpdate = (key: 'hue' | 'saturation' | 'luminance', value: number) => {
    const newHSL = { ...hsl[selectedColor], [key]: value };

    if (isGalleryMode) {
      selectedGalleryImages.forEach((img) => {
        updateImageEditState(img.id, {
          ...img.editState,
          hsl: { ...img.editState.hsl, [selectedColor]: newHSL },
        });
      });
    } else {
      useEditorStore.setState((state) => ({
        editState: {
          ...state.editState,
          hsl: { ...state.editState.hsl, [selectedColor]: newHSL },
        },
      }));
    }
  };

  const handleReset = () => {
    const resetHSL: HSLAdjustment = { hue: 0, saturation: 0, luminance: 0 };

    if (isGalleryMode) {
      selectedGalleryImages.forEach((img) => {
        updateImageEditState(img.id, {
          ...img.editState,
          hsl: { ...img.editState.hsl, [selectedColor]: resetHSL },
        });
      });
    } else {
      setHSL(selectedColor, resetHSL);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Color selector */}
      <div className="grid grid-cols-8 gap-1">
        {COLOR_RANGES.map((color) => (
          <button
            key={color.id}
            onClick={() => setSelectedColor(color.id)}
            className={`
              w-full aspect-square rounded-full transition-all
              ${selectedColor === color.id ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-110' : 'hover:scale-105'}
            `}
            style={{
              backgroundColor: `hsl(${color.hue}, 70%, 50%)`,
            }}
            title={color.label}
          />
        ))}
      </div>

      <div className="text-center text-sm text-neutral-400 mb-2">
        {currentColor?.label}
      </div>

      {/* HSL Sliders */}
      <div className="space-y-4">
        <HSLSlider
          label="Hue"
          value={currentHSL.hue}
          onChange={(v) => handleUpdate('hue', v)}
        />
        <HSLSlider
          label="Saturation"
          value={currentHSL.saturation}
          onChange={(v) => handleUpdate('saturation', v)}
        />
        <HSLSlider
          label="Luminance"
          value={currentHSL.luminance}
          onChange={(v) => handleUpdate('luminance', v)}
        />
      </div>

      {/* Reset button */}
      <button
        onClick={handleReset}
        className="w-full text-sm text-neutral-500 hover:text-white transition-colors"
      >
        Reset {currentColor?.label}
      </button>
    </div>
  );
}
