'use client';

import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/lib/editor/state';
import { AdjustmentSlider } from '@/components/ui/adjustment-slider';
import {
  PanelSection,
  PanelContainer,
  PanelDivider,
  PanelHint,
} from '@/components/ui/panel-section';
import { RotateCcw, RotateCw, FlipHorizontal, FlipVertical } from 'lucide-react';

// Aspect ratio presets
const ASPECT_RATIOS = [
  { label: 'Free', value: null },
  { label: '1:1', value: 1 },
  { label: '4:5', value: 4 / 5 },
  { label: '5:4', value: 5 / 4 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
  { label: '3:2', value: 3 / 2 },
  { label: '2:3', value: 2 / 3 },
] as const;

export function TransformPanel() {
  const editState = useEditorStore((state) => state.editState);
  const updateEditState = useEditorStore((state) => state.updateEditState);
  const pushHistory = useEditorStore((state) => state.pushHistory);
  const cropAspectRatio = useEditorStore((state) => state.cropAspectRatio);
  const setCropAspectRatio = useEditorStore((state) => state.setCropAspectRatio);
  const isCropping = useEditorStore((state) => state.isCropping);
  const setIsCropping = useEditorStore((state) => state.setIsCropping);

  const handleRotationChange = (value: number) => {
    useEditorStore.setState((state) => ({
      editState: { ...state.editState, rotation: value },
    }));
  };

  const rotate90 = (direction: 'cw' | 'ccw') => {
    pushHistory();
    const delta = direction === 'cw' ? 90 : -90;
    let newRotation = editState.rotation + delta;
    // Normalize to -180 to 180
    if (newRotation > 180) newRotation -= 360;
    if (newRotation < -180) newRotation += 360;
    updateEditState({ rotation: newRotation });
  };

  const flipHorizontal = () => {
    pushHistory();
    updateEditState({ flipH: !editState.flipH });
  };

  const flipVertical = () => {
    pushHistory();
    updateEditState({ flipV: !editState.flipV });
  };

  const resetTransform = () => {
    pushHistory();
    updateEditState({
      rotation: 0,
      flipH: false,
      flipV: false,
      crop: null,
    });
    setCropAspectRatio(null);
  };

  const startCropping = () => {
    setIsCropping(true);
  };

  const applyCrop = () => {
    setIsCropping(false);
    // The crop is already stored in editState by CropOverlay
  };

  const cancelCrop = () => {
    setIsCropping(false);
    updateEditState({ crop: null });
  };

  const clearCrop = () => {
    pushHistory();
    updateEditState({ crop: null });
    setCropAspectRatio(null);
  };

  return (
    <PanelContainer>
      {/* Crop Section */}
      <PanelSection title="Crop" collapsible={false}>
        {!isCropping ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={startCropping}
              className="w-full bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white"
            >
              {editState.crop ? 'Edit Crop' : 'Start Cropping'}
            </Button>
            {editState.crop && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCrop}
                className="w-full text-neutral-500 hover:text-white"
              >
                Clear Crop
              </Button>
            )}
          </>
        ) : (
          <>
            {/* Aspect ratio selector */}
            <div className="space-y-2">
              <span className="text-sm text-neutral-400">Aspect Ratio</span>
              <div className="grid grid-cols-4 gap-1">
                {ASPECT_RATIOS.map((ratio) => (
                  <Button
                    key={ratio.label}
                    variant="outline"
                    size="sm"
                    onClick={() => setCropAspectRatio(ratio.value)}
                    className={`text-xs px-2 ${
                      cropAspectRatio === ratio.value
                        ? 'bg-white text-black border-white hover:bg-neutral-200'
                        : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white'
                    }`}
                  >
                    {ratio.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={cancelCrop}
                className="flex-1 bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={applyCrop}
                className="flex-1 bg-white text-black hover:bg-neutral-200"
              >
                Apply
              </Button>
            </div>
          </>
        )}
      </PanelSection>

      <PanelDivider />

      {/* Rotation Section */}
      <PanelSection title="Rotation" onReset={() => updateEditState({ rotation: 0 })}>
        <AdjustmentSlider
          label="Angle"
          value={editState.rotation}
          min={-180}
          max={180}
          step={0.1}
          defaultValue={0}
          onChange={handleRotationChange}
          formatValue={(v) => `${v.toFixed(1)}°`}
        />

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => rotate90('ccw')}
            className="flex-1 bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            90
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => rotate90('cw')}
            className="flex-1 bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white"
          >
            <RotateCw className="w-4 h-4 mr-1" />
            90
          </Button>
        </div>
      </PanelSection>

      <PanelDivider />

      {/* Flip Section */}
      <PanelSection title="Flip" collapsible={false}>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={flipHorizontal}
            className={`flex-1 ${
              editState.flipH
                ? 'bg-white text-black border-white hover:bg-neutral-200'
                : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white'
            }`}
          >
            <FlipHorizontal className="w-4 h-4 mr-1" />
            Horizontal
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={flipVertical}
            className={`flex-1 ${
              editState.flipV
                ? 'bg-white text-black border-white hover:bg-neutral-200'
                : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white'
            }`}
          >
            <FlipVertical className="w-4 h-4 mr-1" />
            Vertical
          </Button>
        </div>
      </PanelSection>

      <PanelDivider />

      {/* Reset All */}
      <Button
        variant="ghost"
        size="sm"
        onClick={resetTransform}
        className="w-full text-neutral-500 hover:text-white"
      >
        Reset All Transforms
      </Button>

      <PanelHint>
        {isCropping
          ? 'Drag the corners or edges to adjust the crop area.'
          : 'Use crop to remove unwanted areas. Rotation and flip are applied non-destructively.'}
      </PanelHint>
    </PanelContainer>
  );
}
