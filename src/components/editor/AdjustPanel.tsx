'use client';

import { useEditorStore, batchedUpdate } from '@/lib/editor/state';
import { useGalleryStore } from '@/lib/gallery/store';
import { AdjustmentSlider, sliderPresets } from '@/components/ui/adjustment-slider';
import { PanelSection, PanelContainer, PanelDivider } from '@/components/ui/panel-section';
import { SkinToneSettings, EditState } from '@/types/editor';

export function AdjustPanel() {
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

  const skinTone = editState.skinTone;

  // Batch update helper for gallery mode
  const handleBatchUpdate = <K extends keyof EditState>(key: K, value: EditState[K]) => {
    if (isGalleryMode) {
      selectedGalleryImages.forEach((img) => {
        updateImageEditState(img.id, { ...img.editState, [key]: value });
      });
    } else {
      batchedUpdate(key, value);
    }
  };

  const handleSkinToneUpdate = <K extends keyof SkinToneSettings>(key: K, value: SkinToneSettings[K]) => {
    if (isGalleryMode) {
      selectedGalleryImages.forEach((img) => {
        updateImageEditState(img.id, {
          ...img.editState,
          skinTone: { ...img.editState.skinTone, [key]: value },
        });
      });
    } else {
      useEditorStore.setState((state) => ({
        editState: {
          ...state.editState,
          skinTone: { ...state.editState.skinTone, [key]: value },
        },
      }));
    }
  };

  return (
    <PanelContainer>
      {/* Light Section */}
      <PanelSection title="Light">
        <AdjustmentSlider
          label="Exposure"
          value={editState.exposure}
          {...sliderPresets.exposure}
          onChange={(v) => handleBatchUpdate('exposure', v)}
        />
        <AdjustmentSlider
          label="Contrast"
          value={editState.contrast}
          {...sliderPresets.contrast}
          onChange={(v) => handleBatchUpdate('contrast', v)}
        />
        <AdjustmentSlider
          label="Highlights"
          value={editState.highlights}
          {...sliderPresets.highlights}
          onChange={(v) => handleBatchUpdate('highlights', v)}
        />
        <AdjustmentSlider
          label="Shadows"
          value={editState.shadows}
          {...sliderPresets.shadows}
          onChange={(v) => handleBatchUpdate('shadows', v)}
        />
        <AdjustmentSlider
          label="Whites"
          value={editState.whites}
          {...sliderPresets.whites}
          onChange={(v) => handleBatchUpdate('whites', v)}
        />
        <AdjustmentSlider
          label="Blacks"
          value={editState.blacks}
          {...sliderPresets.blacks}
          onChange={(v) => handleBatchUpdate('blacks', v)}
        />
      </PanelSection>

      <PanelDivider />

      {/* Color Section */}
      <PanelSection title="Color">
        <AdjustmentSlider
          label="Saturation"
          value={editState.saturation}
          {...sliderPresets.saturation}
          onChange={(v) => handleBatchUpdate('saturation', v)}
        />
        <AdjustmentSlider
          label="Vibrance"
          value={editState.vibrance}
          {...sliderPresets.vibrance}
          onChange={(v) => handleBatchUpdate('vibrance', v)}
        />
        <AdjustmentSlider
          label="Temperature"
          value={editState.temperature}
          {...sliderPresets.temperature}
          gradient="temperature"
          onChange={(v) => handleBatchUpdate('temperature', v)}
        />
        <AdjustmentSlider
          label="Tint"
          value={editState.tint}
          {...sliderPresets.tint}
          gradient="tint"
          onChange={(v) => handleBatchUpdate('tint', v)}
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

      {/* Presence Section */}
      <PanelSection title="Presence" collapsible>
        <AdjustmentSlider
          label="Clarity"
          value={editState.clarity}
          {...sliderPresets.clarity}
          onChange={(v) => handleBatchUpdate('clarity', v)}
        />
        <AdjustmentSlider
          label="Texture"
          value={editState.texture}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => handleBatchUpdate('texture', v)}
        />
        <AdjustmentSlider
          label="Dehaze"
          value={editState.dehaze}
          min={-100}
          max={100}
          defaultValue={0}
          onChange={(v) => handleBatchUpdate('dehaze', v)}
        />
      </PanelSection>
    </PanelContainer>
  );
}
