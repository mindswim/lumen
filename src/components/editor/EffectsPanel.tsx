'use client';

import { useEditorStore } from '@/lib/editor/state';
import { AdjustmentSlider } from '@/components/ui/adjustment-slider';
import { PanelSection, PanelContainer, PanelDivider } from '@/components/ui/panel-section';

export function EffectsPanel() {
  const grain = useEditorStore((state) => state.editState.grain);
  const vignette = useEditorStore((state) => state.editState.vignette);

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

  return (
    <PanelContainer>
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
        <AdjustmentSlider
          label="Roughness"
          value={grain.roughness}
          min={0}
          max={100}
          defaultValue={50}
          onChange={(v) => handleGrainUpdate('roughness', v)}
        />
      </PanelSection>

      <PanelDivider />

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
          label="Roundness"
          value={vignette.roundness}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => handleVignetteUpdate('roundness', v)}
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
    </PanelContainer>
  );
}
