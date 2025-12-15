'use client';

import { useEditorStore, batchedUpdate } from '@/lib/editor/state';
import { AdjustmentSlider, sliderPresets } from '@/components/ui/adjustment-slider';
import { PanelSection, PanelContainer, PanelDivider } from '@/components/ui/panel-section';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { BlurSettings, BorderSettings, BloomSettings, HalationSettings } from '@/types/editor';

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
  const editState = useEditorStore((state) => state.editState);
  const grain = editState.grain;
  const vignette = editState.vignette;
  const splitTone = editState.splitTone;
  const blur = editState.blur;
  const border = editState.border;
  const bloom = editState.bloom;
  const halation = editState.halation;

  const handleGrainUpdate = (key: keyof typeof grain, value: number) => {
    useEditorStore.setState((state) => ({
      editState: {
        ...state.editState,
        grain: { ...state.editState.grain, [key]: value },
      },
    }));
  };

  const handleVignetteUpdate = (key: keyof typeof vignette, value: number) => {
    useEditorStore.setState((state) => ({
      editState: {
        ...state.editState,
        vignette: { ...state.editState.vignette, [key]: value },
      },
    }));
  };

  const handleSplitToneUpdate = (key: keyof typeof splitTone, value: number) => {
    useEditorStore.setState((state) => ({
      editState: {
        ...state.editState,
        splitTone: { ...state.editState.splitTone, [key]: value },
      },
    }));
  };

  const handleBlurUpdate = <K extends keyof BlurSettings>(key: K, value: BlurSettings[K]) => {
    useEditorStore.setState((state) => ({
      editState: {
        ...state.editState,
        blur: { ...state.editState.blur, [key]: value },
      },
    }));
  };

  const handleBorderUpdate = <K extends keyof BorderSettings>(key: K, value: BorderSettings[K]) => {
    useEditorStore.setState((state) => ({
      editState: {
        ...state.editState,
        border: { ...state.editState.border, [key]: value },
      },
    }));
  };

  const handleBloomUpdate = <K extends keyof BloomSettings>(key: K, value: BloomSettings[K]) => {
    useEditorStore.setState((state) => ({
      editState: {
        ...state.editState,
        bloom: { ...state.editState.bloom, [key]: value },
      },
    }));
  };

  const handleHalationUpdate = <K extends keyof HalationSettings>(key: K, value: HalationSettings[K]) => {
    useEditorStore.setState((state) => ({
      editState: {
        ...state.editState,
        halation: { ...state.editState.halation, [key]: value },
      },
    }));
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
          onChange={(v) => batchedUpdate('fade', v)}
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
