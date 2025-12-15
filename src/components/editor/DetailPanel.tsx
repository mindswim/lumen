'use client';

import { useEditorStore } from '@/lib/editor/state';
import { useGalleryStore } from '@/lib/gallery/store';
import { AdjustmentSlider } from '@/components/ui/adjustment-slider';
import {
  PanelSection,
  PanelContainer,
  PanelDivider,
  PanelHint,
} from '@/components/ui/panel-section';
import { SharpeningSettings, NoiseReductionSettings } from '@/types/editor';

export function DetailPanel() {
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

  const sharpening = editState.sharpening;
  const noiseReduction = editState.noiseReduction;

  const handleSharpeningUpdate = (key: keyof SharpeningSettings, value: number) => {
    if (isGalleryMode) {
      selectedGalleryImages.forEach((img) => {
        updateImageEditState(img.id, {
          ...img.editState,
          sharpening: { ...img.editState.sharpening, [key]: value },
        });
      });
    } else {
      useEditorStore.setState((state) => ({
        editState: {
          ...state.editState,
          sharpening: { ...state.editState.sharpening, [key]: value },
        },
      }));
    }
  };

  const handleNoiseReductionUpdate = (key: keyof NoiseReductionSettings, value: number) => {
    if (isGalleryMode) {
      selectedGalleryImages.forEach((img) => {
        updateImageEditState(img.id, {
          ...img.editState,
          noiseReduction: { ...img.editState.noiseReduction, [key]: value },
        });
      });
    } else {
      useEditorStore.setState((state) => ({
        editState: {
          ...state.editState,
          noiseReduction: { ...state.editState.noiseReduction, [key]: value },
        },
      }));
    }
  };

  return (
    <PanelContainer>
      <PanelSection title="Sharpening" collapsible>
        <AdjustmentSlider
          label="Amount"
          value={sharpening.amount}
          min={0}
          max={100}
          defaultValue={0}
          onChange={(v) => handleSharpeningUpdate('amount', v)}
        />
        <AdjustmentSlider
          label="Radius"
          value={sharpening.radius}
          min={0.5}
          max={3}
          step={0.1}
          defaultValue={1}
          onChange={(v) => handleSharpeningUpdate('radius', v)}
          formatValue={(v) => v.toFixed(1)}
        />
        <AdjustmentSlider
          label="Detail"
          value={sharpening.detail}
          min={0}
          max={100}
          defaultValue={50}
          onChange={(v) => handleSharpeningUpdate('detail', v)}
        />
      </PanelSection>

      <PanelDivider />

      <PanelSection title="Noise Reduction" collapsible>
        <AdjustmentSlider
          label="Luminance"
          value={noiseReduction.luminance}
          min={0}
          max={100}
          defaultValue={0}
          onChange={(v) => handleNoiseReductionUpdate('luminance', v)}
        />
        <AdjustmentSlider
          label="Color"
          value={noiseReduction.color}
          min={0}
          max={100}
          defaultValue={0}
          onChange={(v) => handleNoiseReductionUpdate('color', v)}
        />
        <AdjustmentSlider
          label="Detail"
          value={noiseReduction.detail}
          min={0}
          max={100}
          defaultValue={50}
          onChange={(v) => handleNoiseReductionUpdate('detail', v)}
        />
      </PanelSection>

      <PanelHint>
        Sharpening enhances edge definition. Noise reduction smooths out grain and artifacts.
      </PanelHint>
    </PanelContainer>
  );
}
