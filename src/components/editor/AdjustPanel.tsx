'use client';

import { useEditorStore, batchedUpdate } from '@/lib/editor/state';
import { AdjustmentSlider, sliderPresets } from '@/components/ui/adjustment-slider';
import { PanelSection, PanelContainer, PanelDivider } from '@/components/ui/panel-section';
import { SkinToneSettings } from '@/types/editor';

export function AdjustPanel() {
  const editState = useEditorStore((state) => state.editState);
  const skinTone = editState.skinTone;

  const handleSkinToneUpdate = <K extends keyof SkinToneSettings>(key: K, value: SkinToneSettings[K]) => {
    useEditorStore.setState((state) => ({
      editState: {
        ...state.editState,
        skinTone: { ...state.editState.skinTone, [key]: value },
      },
    }));
  };

  return (
    <PanelContainer>
      {/* Light Section */}
      <PanelSection title="Light">
        <AdjustmentSlider
          label="Exposure"
          value={editState.exposure}
          {...sliderPresets.exposure}
          onChange={(v) => batchedUpdate('exposure', v)}
        />
        <AdjustmentSlider
          label="Contrast"
          value={editState.contrast}
          {...sliderPresets.contrast}
          onChange={(v) => batchedUpdate('contrast', v)}
        />
        <AdjustmentSlider
          label="Highlights"
          value={editState.highlights}
          {...sliderPresets.highlights}
          onChange={(v) => batchedUpdate('highlights', v)}
        />
        <AdjustmentSlider
          label="Shadows"
          value={editState.shadows}
          {...sliderPresets.shadows}
          onChange={(v) => batchedUpdate('shadows', v)}
        />
        <AdjustmentSlider
          label="Whites"
          value={editState.whites}
          {...sliderPresets.whites}
          onChange={(v) => batchedUpdate('whites', v)}
        />
        <AdjustmentSlider
          label="Blacks"
          value={editState.blacks}
          {...sliderPresets.blacks}
          onChange={(v) => batchedUpdate('blacks', v)}
        />
      </PanelSection>

      <PanelDivider />

      {/* Color Section */}
      <PanelSection title="Color">
        <AdjustmentSlider
          label="Saturation"
          value={editState.saturation}
          {...sliderPresets.saturation}
          onChange={(v) => batchedUpdate('saturation', v)}
        />
        <AdjustmentSlider
          label="Vibrance"
          value={editState.vibrance}
          {...sliderPresets.vibrance}
          onChange={(v) => batchedUpdate('vibrance', v)}
        />
        <AdjustmentSlider
          label="Temperature"
          value={editState.temperature}
          {...sliderPresets.temperature}
          gradient="temperature"
          onChange={(v) => batchedUpdate('temperature', v)}
        />
        <AdjustmentSlider
          label="Tint"
          value={editState.tint}
          {...sliderPresets.tint}
          gradient="tint"
          onChange={(v) => batchedUpdate('tint', v)}
        />
      </PanelSection>

      <PanelDivider />

      {/* Skin Tone Section */}
      <PanelSection title="Skin Tone" collapsible>
        <AdjustmentSlider
          label="Hue"
          value={skinTone.hue}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => handleSkinToneUpdate('hue', v)}
        />
        <AdjustmentSlider
          label="Saturation"
          value={skinTone.saturation}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => handleSkinToneUpdate('saturation', v)}
        />
        <AdjustmentSlider
          label="Luminance"
          value={skinTone.luminance}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => handleSkinToneUpdate('luminance', v)}
        />
      </PanelSection>

      <PanelDivider />

      {/* Effects Section */}
      <PanelSection title="Effects" collapsible>
        <AdjustmentSlider
          label="Clarity"
          value={editState.clarity}
          {...sliderPresets.clarity}
          onChange={(v) => batchedUpdate('clarity', v)}
        />
      </PanelSection>
    </PanelContainer>
  );
}
