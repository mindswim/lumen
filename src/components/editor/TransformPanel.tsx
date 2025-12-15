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

// Aspect ratio presets with visual dimensions
const ASPECT_RATIOS = [
  { label: 'Free', value: null, w: 20, h: 16 },
  { label: '1:1', value: 1, w: 16, h: 16 },
  { label: '2:3', value: 2 / 3, w: 12, h: 18 },
  { label: '3:2', value: 3 / 2, w: 18, h: 12 },
  { label: '3:4', value: 3 / 4, w: 12, h: 16 },
  { label: '4:3', value: 4 / 3, w: 16, h: 12 },
  { label: '4:5', value: 4 / 5, w: 13, h: 16 },
  { label: '5:4', value: 5 / 4, w: 16, h: 13 },
] as const;

// Visual aspect ratio icon component
function AspectRatioIcon({ w, h, active }: { w: number; h: number; active: boolean }) {
  return (
    <div
      className={`
        border-2 rounded-sm transition-colors
        ${active ? 'border-white' : 'border-neutral-500'}
      `}
      style={{ width: w, height: h }}
    />
  );
}

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
      straighten: 0,
      perspectiveX: 0,
      perspectiveY: 0,
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
              <div className="grid grid-cols-4 gap-2">
                {ASPECT_RATIOS.map((ratio) => {
                  const isActive = cropAspectRatio === ratio.value;
                  return (
                    <button
                      key={ratio.label}
                      onClick={() => setCropAspectRatio(ratio.value)}
                      className={`
                        flex flex-col items-center gap-1.5 py-2 px-1 rounded-lg transition-colors
                        ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}
                      `}
                    >
                      <AspectRatioIcon w={ratio.w} h={ratio.h} active={isActive} />
                      <span className={`text-xs ${isActive ? 'text-white' : 'text-neutral-400'}`}>
                        {ratio.label}
                      </span>
                    </button>
                  );
                })}
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

      {/* Straighten Section */}
      <PanelSection title="Straighten">
        <AdjustmentSlider
          label="Angle"
          value={editState.straighten}
          min={-45}
          max={45}
          step={0.1}
          defaultValue={0}
          onChange={(v) => {
            useEditorStore.setState((state) => ({
              editState: { ...state.editState, straighten: v },
            }));
          }}
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

      {/* Skew/Perspective Section */}
      <PanelSection title="Skew" collapsible>
        <AdjustmentSlider
          label="Horizontal"
          value={editState.perspectiveX}
          min={-100}
          max={100}
          step={1}
          defaultValue={0}
          onChange={(v) => {
            useEditorStore.setState((state) => ({
              editState: { ...state.editState, perspectiveX: v },
            }));
          }}
        />
        <AdjustmentSlider
          label="Vertical"
          value={editState.perspectiveY}
          min={-100}
          max={100}
          step={1}
          defaultValue={0}
          onChange={(v) => {
            useEditorStore.setState((state) => ({
              editState: { ...state.editState, perspectiveY: v },
            }));
          }}
        />
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
