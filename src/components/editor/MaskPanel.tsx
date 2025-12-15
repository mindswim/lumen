'use client';

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/lib/editor/state';
import { AdjustmentSlider, sliderPresets } from '@/components/ui/adjustment-slider';
import {
  PanelSection,
  PanelContainer,
  PanelDivider,
  PanelEmptyState,
  PanelHint,
} from '@/components/ui/panel-section';
import {
  Mask,
  MaskType,
  LocalAdjustments,
  DEFAULT_LOCAL_ADJUSTMENTS,
  RadialMaskData,
  LinearMaskData,
  BrushMaskData,
} from '@/types/editor';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

interface MaskItemProps {
  mask: Mask;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
}

function MaskItem({
  mask,
  isSelected,
  onSelect,
  onDelete,
  onToggleVisibility,
}: MaskItemProps) {
  const typeLabels: Record<MaskType, string> = {
    brush: 'Brush',
    radial: 'Radial',
    linear: 'Linear',
  };

  return (
    <div
      className={`
        flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors
        ${isSelected ? 'bg-white/10' : 'hover:bg-white/5'}
      `}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
          className={`w-4 h-4 rounded border transition-colors ${
            mask.visible
              ? 'bg-white border-white'
              : 'bg-transparent border-neutral-600'
          }`}
        />
        <span className="text-sm text-white">
          {typeLabels[mask.type]}
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="text-neutral-500 hover:text-red-400 text-xs transition-colors"
      >
        Delete
      </button>
    </div>
  );
}

export function MaskPanel() {
  const masks = useEditorStore((state) => state.editState.masks);
  const selectedMaskId = useEditorStore((state) => state.selectedMaskId);
  const setSelectedMaskId = useEditorStore((state) => state.setSelectedMaskId);
  const addMask = useEditorStore((state) => state.addMask);
  const updateMask = useEditorStore((state) => state.updateMask);
  const removeMask = useEditorStore((state) => state.removeMask);
  const setMaskVisibility = useEditorStore((state) => state.setMaskVisibility);

  const selectedMask = masks.find((m) => m.id === selectedMaskId);

  const createMask = useCallback(
    (type: MaskType) => {
      let data: RadialMaskData | LinearMaskData | BrushMaskData;

      if (type === 'radial') {
        data = {
          centerX: 0.5,
          centerY: 0.5,
          radiusX: 0.3,
          radiusY: 0.3,
          feather: 0.2,
          invert: false,
        } as RadialMaskData;
      } else if (type === 'linear') {
        data = {
          startX: 0.3,
          startY: 0.5,
          endX: 0.7,
          endY: 0.5,
          feather: 0.2,
        } as LinearMaskData;
      } else {
        data = {
          strokes: [],
        } as BrushMaskData;
      }

      const newMask: Mask = {
        id: generateId(),
        type,
        data,
        adjustments: { ...DEFAULT_LOCAL_ADJUSTMENTS },
        opacity: 100,
        visible: true,
      };

      addMask(newMask);
      setSelectedMaskId(newMask.id);
    },
    [addMask, setSelectedMaskId]
  );

  const handleAdjustmentChange = useCallback(
    (key: keyof LocalAdjustments, value: number) => {
      if (!selectedMaskId) return;
      const mask = masks.find((m) => m.id === selectedMaskId);
      if (!mask) return;

      updateMask(selectedMaskId, {
        adjustments: { ...mask.adjustments, [key]: value },
      });
    },
    [selectedMaskId, masks, updateMask]
  );

  const handleOpacityChange = useCallback(
    (value: number) => {
      if (!selectedMaskId) return;
      updateMask(selectedMaskId, { opacity: value });
    },
    [selectedMaskId, updateMask]
  );

  const resetMaskAdjustments = () => {
    if (!selectedMaskId) return;
    updateMask(selectedMaskId, {
      adjustments: { ...DEFAULT_LOCAL_ADJUSTMENTS },
      opacity: 100,
    });
  };

  return (
    <PanelContainer>
      <PanelSection title="Add Mask" collapsible={false}>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => createMask('radial')}
            className="text-xs bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white"
          >
            Radial
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => createMask('linear')}
            className="text-xs bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white"
          >
            Linear
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => createMask('brush')}
            className="text-xs bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white"
          >
            Brush
          </Button>
        </div>
      </PanelSection>

      <PanelDivider />

      <PanelSection title="Masks" collapsible={false}>
        {masks.length === 0 ? (
          <PanelEmptyState
            title="No masks created yet"
            description="Add a mask to make local adjustments"
          />
        ) : (
          <div className="space-y-1">
            {masks.map((mask) => (
              <MaskItem
                key={mask.id}
                mask={mask}
                isSelected={mask.id === selectedMaskId}
                onSelect={() => setSelectedMaskId(mask.id)}
                onDelete={() => {
                  removeMask(mask.id);
                  if (selectedMaskId === mask.id) {
                    setSelectedMaskId(null);
                  }
                }}
                onToggleVisibility={() =>
                  setMaskVisibility(mask.id, !mask.visible)
                }
              />
            ))}
          </div>
        )}
      </PanelSection>

      {selectedMask && (
        <>
          <PanelDivider />
          <PanelSection title="Mask Adjustments">
            <AdjustmentSlider
              label="Exposure"
              value={selectedMask.adjustments.exposure}
              min={-3}
              max={3}
              step={0.1}
              defaultValue={0}
              onChange={(v) => handleAdjustmentChange('exposure', v)}
            />
            <AdjustmentSlider
              label="Contrast"
              value={selectedMask.adjustments.contrast}
              {...sliderPresets.contrast}
              onChange={(v) => handleAdjustmentChange('contrast', v)}
            />
            <AdjustmentSlider
              label="Saturation"
              value={selectedMask.adjustments.saturation}
              {...sliderPresets.saturation}
              onChange={(v) => handleAdjustmentChange('saturation', v)}
            />
            <AdjustmentSlider
              label="Clarity"
              value={selectedMask.adjustments.clarity}
              {...sliderPresets.clarity}
              onChange={(v) => handleAdjustmentChange('clarity', v)}
            />

            <PanelDivider className="my-3" />

            <AdjustmentSlider
              label="Opacity"
              value={selectedMask.opacity}
              {...sliderPresets.opacity}
              onChange={handleOpacityChange}
            />
          </PanelSection>

          <PanelHint>
            {selectedMask.type === 'radial' &&
              'Drag the center to position. Drag edges to resize.'}
            {selectedMask.type === 'linear' &&
              'Drag handles to adjust gradient direction.'}
            {selectedMask.type === 'brush' &&
              'Click and drag on the image to paint the mask.'}
          </PanelHint>
        </>
      )}

      {!selectedMask && masks.length === 0 && (
        <PanelHint>Select a mask type to begin.</PanelHint>
      )}
    </PanelContainer>
  );
}
