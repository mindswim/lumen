'use client';

import { useEditorStore, batchedUpdate } from '@/lib/editor/state';
import { useGalleryStore } from '@/lib/gallery/store';
import { AdjustmentSlider, sliderPresets } from '@/components/ui/adjustment-slider';
import { PanelSection, PanelContainer, PanelDivider } from '@/components/ui/panel-section';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { BlurSettings, BorderSettings, BloomSettings, HalationSettings, EditState, ColorGradingSettings, ColorWheelSettings } from '@/types/editor';
import { ColorWheel } from '@/components/ui/color-wheel';

// Color presets for split tone hue picker
const HUE_PRESETS = [
  { label: 'Red', hue: 0 },
  { label: 'Orange', hue: 30 },
  { label: 'Yellow', hue: 60 },
  { label: 'Green', hue: 120 },
  { label: 'Cyan', hue: 180 },
  { label: 'Blue', hue: 220 },
  { label: 'Purple', hue: 280 },
  { label: 'Magenta', hue: 320 },
];

function HueSlider({
  label,
  hue,
  saturation,
  onHueChange,
  onSatChange,
}: {
  label: string;
  hue: number;
  saturation: number;
  onHueChange: (v: number) => void;
  onSatChange: (v: number) => void;
}) {
  // Generate gradient for hue slider
  const hueGradient = `linear-gradient(to right,
    hsl(0, 70%, 50%),
    hsl(60, 70%, 50%),
    hsl(120, 70%, 50%),
    hsl(180, 70%, 50%),
    hsl(240, 70%, 50%),
    hsl(300, 70%, 50%),
    hsl(360, 70%, 50%)
  )`;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-neutral-300">{label}</span>
        <div
          className="w-4 h-4 rounded-full border border-neutral-600"
          style={{ backgroundColor: `hsl(${hue}, ${saturation}%, 50%)` }}
        />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-neutral-500">
          <span>Hue</span>
          <span>{Math.round(hue)}</span>
        </div>
        <div
          className="relative h-2 rounded-full"
          style={{ background: hueGradient }}
        >
          <Slider
            value={[hue]}
            min={0}
            max={360}
            step={1}
            onValueChange={([v]) => onHueChange(v)}
            className="absolute inset-0"
          />
        </div>
      </div>
      <AdjustmentSlider
        label="Saturation"
        value={saturation}
        min={0}
        max={100}
        defaultValue={0}
        onChange={onSatChange}
      />
    </div>
  );
}

export function EffectsPanel() {
  const image = useEditorStore((state) => state.image);
  const editorEditState = useEditorStore((state) => state.editState);

  // Gallery store for batch mode
  const { selectedIds, images: galleryImages, updateImageEditState } = useGalleryStore();

  // Determine mode: editor (single image) or gallery (batch)
  const isGalleryMode = !image && selectedIds.length > 0;
  const selectedGalleryImages = isGalleryMode
    ? galleryImages.filter((img) => selectedIds.includes(img.id))
    : [];

  // Use first selected image's edit state for display in gallery mode
  const editState = isGalleryMode && selectedGalleryImages.length > 0
    ? selectedGalleryImages[0].editState
    : editorEditState;

  const grain = editState.grain;
  const vignette = editState.vignette;
  const splitTone = editState.splitTone;
  const colorGrading = editState.colorGrading;
  const blur = editState.blur;
  const border = editState.border;
  const bloom = editState.bloom;
  const halation = editState.halation;

  // Batch update helper for simple properties
  const handleBatchUpdate = <K extends keyof EditState>(key: K, value: EditState[K]) => {
    if (isGalleryMode) {
      selectedGalleryImages.forEach((img) => {
        updateImageEditState(img.id, { ...img.editState, [key]: value });
      });
    } else {
      batchedUpdate(key, value);
    }
  };

  const handleGrainUpdate = (key: keyof typeof grain, value: number) => {
    if (isGalleryMode) {
      selectedGalleryImages.forEach((img) => {
        updateImageEditState(img.id, {
          ...img.editState,
          grain: { ...img.editState.grain, [key]: value },
        });
      });
    } else {
      useEditorStore.setState((state) => ({
        editState: {
          ...state.editState,
          grain: { ...state.editState.grain, [key]: value },
        },
      }));
    }
  };

  const handleVignetteUpdate = (key: keyof typeof vignette, value: number) => {
    if (isGalleryMode) {
      selectedGalleryImages.forEach((img) => {
        updateImageEditState(img.id, {
          ...img.editState,
          vignette: { ...img.editState.vignette, [key]: value },
        });
      });
    } else {
      useEditorStore.setState((state) => ({
        editState: {
          ...state.editState,
          vignette: { ...state.editState.vignette, [key]: value },
        },
      }));
    }
  };

  const handleSplitToneUpdate = (key: keyof typeof splitTone, value: number) => {
    if (isGalleryMode) {
      selectedGalleryImages.forEach((img) => {
        updateImageEditState(img.id, {
          ...img.editState,
          splitTone: { ...img.editState.splitTone, [key]: value },
        });
      });
    } else {
      useEditorStore.setState((state) => ({
        editState: {
          ...state.editState,
          splitTone: { ...state.editState.splitTone, [key]: value },
        },
      }));
    }
  };

  const handleColorGradingUpdate = <K extends keyof ColorGradingSettings>(
    key: K,
    value: ColorGradingSettings[K]
  ) => {
    if (isGalleryMode) {
      selectedGalleryImages.forEach((img) => {
        updateImageEditState(img.id, {
          ...img.editState,
          colorGrading: { ...img.editState.colorGrading, [key]: value },
        });
      });
    } else {
      useEditorStore.setState((state) => ({
        editState: {
          ...state.editState,
          colorGrading: { ...state.editState.colorGrading, [key]: value },
        },
      }));
    }
  };

  const handleColorWheelUpdate = (
    wheel: 'shadows' | 'midtones' | 'highlights' | 'global',
    updates: Partial<ColorWheelSettings>
  ) => {
    if (isGalleryMode) {
      selectedGalleryImages.forEach((img) => {
        updateImageEditState(img.id, {
          ...img.editState,
          colorGrading: {
            ...img.editState.colorGrading,
            [wheel]: { ...img.editState.colorGrading[wheel], ...updates },
          },
        });
      });
    } else {
      useEditorStore.setState((state) => ({
        editState: {
          ...state.editState,
          colorGrading: {
            ...state.editState.colorGrading,
            [wheel]: { ...state.editState.colorGrading[wheel], ...updates },
          },
        },
      }));
    }
  };

  const handleBlurUpdate = <K extends keyof BlurSettings>(key: K, value: BlurSettings[K]) => {
    if (isGalleryMode) {
      selectedGalleryImages.forEach((img) => {
        updateImageEditState(img.id, {
          ...img.editState,
          blur: { ...img.editState.blur, [key]: value },
        });
      });
    } else {
      useEditorStore.setState((state) => ({
        editState: {
          ...state.editState,
          blur: { ...state.editState.blur, [key]: value },
        },
      }));
    }
  };

  const handleBorderUpdate = <K extends keyof BorderSettings>(key: K, value: BorderSettings[K]) => {
    if (isGalleryMode) {
      selectedGalleryImages.forEach((img) => {
        updateImageEditState(img.id, {
          ...img.editState,
          border: { ...img.editState.border, [key]: value },
        });
      });
    } else {
      useEditorStore.setState((state) => ({
        editState: {
          ...state.editState,
          border: { ...state.editState.border, [key]: value },
        },
      }));
    }
  };

  const handleBloomUpdate = <K extends keyof BloomSettings>(key: K, value: BloomSettings[K]) => {
    if (isGalleryMode) {
      selectedGalleryImages.forEach((img) => {
        updateImageEditState(img.id, {
          ...img.editState,
          bloom: { ...img.editState.bloom, [key]: value },
        });
      });
    } else {
      useEditorStore.setState((state) => ({
        editState: {
          ...state.editState,
          bloom: { ...state.editState.bloom, [key]: value },
        },
      }));
    }
  };

  const handleHalationUpdate = <K extends keyof HalationSettings>(key: K, value: HalationSettings[K]) => {
    if (isGalleryMode) {
      selectedGalleryImages.forEach((img) => {
        updateImageEditState(img.id, {
          ...img.editState,
          halation: { ...img.editState.halation, [key]: value },
        });
      });
    } else {
      useEditorStore.setState((state) => ({
        editState: {
          ...state.editState,
          halation: { ...state.editState.halation, [key]: value },
        },
      }));
    }
  };

  return (
    <PanelContainer>
      {/* Fade */}
      <PanelSection title="Fade">
        <AdjustmentSlider
          label="Amount"
          value={editState.fade}
          min={0}
          max={100}
          defaultValue={0}
          onChange={(v) => handleBatchUpdate('fade', v)}
        />
      </PanelSection>

      <PanelDivider />

      {/* Split Tone */}
      <PanelSection title="Split Tone" collapsible>
        <HueSlider
          label="Highlights"
          hue={splitTone.highlightHue}
          saturation={splitTone.highlightSaturation}
          onHueChange={(v) => handleSplitToneUpdate('highlightHue', v)}
          onSatChange={(v) => handleSplitToneUpdate('highlightSaturation', v)}
        />
        <div className="h-2" />
        <HueSlider
          label="Shadows"
          hue={splitTone.shadowHue}
          saturation={splitTone.shadowSaturation}
          onHueChange={(v) => handleSplitToneUpdate('shadowHue', v)}
          onSatChange={(v) => handleSplitToneUpdate('shadowSaturation', v)}
        />
        <AdjustmentSlider
          label="Balance"
          value={splitTone.balance}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => handleSplitToneUpdate('balance', v)}
        />
      </PanelSection>

      <PanelDivider />

      {/* Color Grading */}
      <PanelSection title="Color Grading" collapsible>
        <div className="grid grid-cols-2 gap-4">
          {/* Shadows */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-neutral-400">Shadows</span>
            <ColorWheel
              hue={colorGrading.shadows.hue}
              saturation={colorGrading.shadows.saturation}
              onHueChange={(v) => handleColorWheelUpdate('shadows', { hue: v })}
              onSatChange={(v) => handleColorWheelUpdate('shadows', { saturation: v })}
              size={70}
            />
            <AdjustmentSlider
              label="Lum"
              value={colorGrading.shadows.luminance}
              min={-100}
              max={100}
              defaultValue={0}
              onChange={(v) => handleColorWheelUpdate('shadows', { luminance: v })}
            />
          </div>

          {/* Midtones */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-neutral-400">Midtones</span>
            <ColorWheel
              hue={colorGrading.midtones.hue}
              saturation={colorGrading.midtones.saturation}
              onHueChange={(v) => handleColorWheelUpdate('midtones', { hue: v })}
              onSatChange={(v) => handleColorWheelUpdate('midtones', { saturation: v })}
              size={70}
            />
            <AdjustmentSlider
              label="Lum"
              value={colorGrading.midtones.luminance}
              min={-100}
              max={100}
              defaultValue={0}
              onChange={(v) => handleColorWheelUpdate('midtones', { luminance: v })}
            />
          </div>

          {/* Highlights */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-neutral-400">Highlights</span>
            <ColorWheel
              hue={colorGrading.highlights.hue}
              saturation={colorGrading.highlights.saturation}
              onHueChange={(v) => handleColorWheelUpdate('highlights', { hue: v })}
              onSatChange={(v) => handleColorWheelUpdate('highlights', { saturation: v })}
              size={70}
            />
            <AdjustmentSlider
              label="Lum"
              value={colorGrading.highlights.luminance}
              min={-100}
              max={100}
              defaultValue={0}
              onChange={(v) => handleColorWheelUpdate('highlights', { luminance: v })}
            />
          </div>

          {/* Global */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-neutral-400">Global</span>
            <ColorWheel
              hue={colorGrading.global.hue}
              saturation={colorGrading.global.saturation}
              onHueChange={(v) => handleColorWheelUpdate('global', { hue: v })}
              onSatChange={(v) => handleColorWheelUpdate('global', { saturation: v })}
              size={70}
            />
            <AdjustmentSlider
              label="Lum"
              value={colorGrading.global.luminance}
              min={-100}
              max={100}
              defaultValue={0}
              onChange={(v) => handleColorWheelUpdate('global', { luminance: v })}
            />
          </div>
        </div>

        <div className="mt-4">
          <AdjustmentSlider
            label="Blending"
            value={colorGrading.blending}
            min={0}
            max={100}
            defaultValue={50}
            onChange={(v) => handleColorGradingUpdate('blending', v)}
          />
        </div>
      </PanelSection>

      <PanelDivider />

      {/* Grain */}
      <PanelSection title="Grain" collapsible>
        <AdjustmentSlider
          label="Amount"
          value={grain.amount}
          min={0}
          max={100}
          defaultValue={0}
          onChange={(v) => handleGrainUpdate('amount', v)}
        />
        <AdjustmentSlider
          label="Size"
          value={grain.size}
          min={0}
          max={100}
          defaultValue={25}
          onChange={(v) => handleGrainUpdate('size', v)}
        />
      </PanelSection>

      <PanelDivider />

      {/* Vignette */}
      <PanelSection title="Vignette" collapsible>
        <AdjustmentSlider
          label="Amount"
          value={vignette.amount}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => handleVignetteUpdate('amount', v)}
        />
        <AdjustmentSlider
          label="Midpoint"
          value={vignette.midpoint}
          min={0}
          max={100}
          defaultValue={50}
          onChange={(v) => handleVignetteUpdate('midpoint', v)}
        />
        <AdjustmentSlider
          label="Feather"
          value={vignette.feather}
          min={0}
          max={100}
          defaultValue={50}
          onChange={(v) => handleVignetteUpdate('feather', v)}
        />
      </PanelSection>

      <PanelDivider />

      {/* Blur */}
      <PanelSection title="Blur" collapsible>
        <AdjustmentSlider
          label="Amount"
          value={blur.amount}
          min={0}
          max={100}
          defaultValue={0}
          onChange={(v) => handleBlurUpdate('amount', v)}
        />
        <div className="space-y-2">
          <span className="text-sm text-neutral-400">Type</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBlurUpdate('type', 'gaussian')}
              className={`flex-1 text-xs ${
                blur.type === 'gaussian'
                  ? 'bg-white text-black border-white hover:bg-neutral-200'
                  : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white'
              }`}
            >
              Gaussian
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBlurUpdate('type', 'lens')}
              className={`flex-1 text-xs ${
                blur.type === 'lens'
                  ? 'bg-white text-black border-white hover:bg-neutral-200'
                  : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white'
              }`}
            >
              Lens
            </Button>
          </div>
        </div>
      </PanelSection>

      <PanelDivider />

      {/* Border */}
      <PanelSection title="Border" collapsible>
        <AdjustmentSlider
          label="Size"
          value={border.size}
          min={0}
          max={100}
          defaultValue={0}
          onChange={(v) => handleBorderUpdate('size', v)}
        />
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-400">Color</span>
            <input
              type="color"
              value={border.color}
              onChange={(e) => handleBorderUpdate('color', e.target.value)}
              className="w-8 h-8 rounded border border-neutral-600 cursor-pointer bg-transparent"
            />
          </div>
        </div>
        <AdjustmentSlider
          label="Opacity"
          value={border.opacity}
          min={0}
          max={100}
          defaultValue={100}
          onChange={(v) => handleBorderUpdate('opacity', v)}
        />
      </PanelSection>

      <PanelDivider />

      {/* Bloom */}
      <PanelSection title="Bloom" collapsible>
        <AdjustmentSlider
          label="Amount"
          value={bloom.amount}
          min={0}
          max={100}
          defaultValue={0}
          onChange={(v) => handleBloomUpdate('amount', v)}
        />
        <AdjustmentSlider
          label="Threshold"
          value={bloom.threshold}
          min={0}
          max={100}
          defaultValue={70}
          onChange={(v) => handleBloomUpdate('threshold', v)}
        />
        <AdjustmentSlider
          label="Radius"
          value={bloom.radius}
          min={0}
          max={100}
          defaultValue={50}
          onChange={(v) => handleBloomUpdate('radius', v)}
        />
      </PanelSection>

      <PanelDivider />

      {/* Halation */}
      <PanelSection title="Halation" collapsible>
        <AdjustmentSlider
          label="Amount"
          value={halation.amount}
          min={0}
          max={100}
          defaultValue={0}
          onChange={(v) => handleHalationUpdate('amount', v)}
        />
        <AdjustmentSlider
          label="Threshold"
          value={halation.threshold}
          min={0}
          max={100}
          defaultValue={80}
          onChange={(v) => handleHalationUpdate('threshold', v)}
        />
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-neutral-500">
            <span>Color</span>
            <span>{Math.round(halation.hue)}°</span>
          </div>
          <div
            className="relative h-2 rounded-full"
            style={{
              background: `linear-gradient(to right,
                hsl(0, 70%, 50%),
                hsl(30, 70%, 50%),
                hsl(60, 70%, 50%),
                hsl(90, 70%, 50%)
              )`,
            }}
          >
            <Slider
              value={[halation.hue]}
              min={0}
              max={90}
              step={1}
              onValueChange={([v]) => handleHalationUpdate('hue', v)}
              className="absolute inset-0"
            />
          </div>
          <div className="flex justify-between text-xs text-neutral-600">
            <span>Red</span>
            <span>Orange</span>
            <span>Yellow</span>
          </div>
        </div>
      </PanelSection>
    </PanelContainer>
  );
}
