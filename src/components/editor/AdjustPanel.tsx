'use client';

import { useEditorStore, batchedUpdate } from '@/lib/editor/state';
import { AdjustmentSlider, sliderPresets } from '@/components/ui/adjustment-slider';
import { PanelSection, PanelContainer, PanelDivider } from '@/components/ui/panel-section';

export function AdjustPanel() {
  const editState = useEditorStore((state) => state.editState);
  const updateEditState = useEditorStore((state) => state.updateEditState);

  const resetLight = () => {
    updateEditState({
      exposure: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
    });
  };

  const resetWhiteBalance = () => {
    updateEditState({
      temperature: 0,
      tint: 0,
    });
  };

  const resetPresence = () => {
    updateEditState({
      clarity: 0,
      vibrance: 0,
      saturation: 0,
    });
  };

  return (
    <PanelContainer>
      <PanelSection title="Light" onReset={resetLight}>
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

      <PanelSection title="White Balance" onReset={resetWhiteBalance}>
        <AdjustmentSlider
          label="Temperature"
          value={editState.temperature}
          {...sliderPresets.temperature}
          onChange={(v) => batchedUpdate('temperature', v)}
        />
        <AdjustmentSlider
          label="Tint"
          value={editState.tint}
          {...sliderPresets.tint}
          onChange={(v) => batchedUpdate('tint', v)}
        />
      </PanelSection>

      <PanelDivider />

      <PanelSection title="Presence" onReset={resetPresence}>
        <AdjustmentSlider
          label="Clarity"
          value={editState.clarity}
          {...sliderPresets.clarity}
          onChange={(v) => batchedUpdate('clarity', v)}
        />
        <AdjustmentSlider
          label="Vibrance"
          value={editState.vibrance}
          {...sliderPresets.vibrance}
          onChange={(v) => batchedUpdate('vibrance', v)}
        />
        <AdjustmentSlider
          label="Saturation"
          value={editState.saturation}
          {...sliderPresets.saturation}
          onChange={(v) => batchedUpdate('saturation', v)}
        />
      </PanelSection>
    </PanelContainer>
  );
}
