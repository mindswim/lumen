'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useEditorStore } from '@/lib/editor/state';
import { useGalleryStore } from '@/lib/gallery/store';
import { PRESETS, applyPreset } from '@/lib/editor/presets';
import { createDefaultEditState } from '@/types/editor';
import {
  loadUserPresets,
  addUserPreset,
  deleteUserPreset,
  exportPresetsAsJSON,
  importPresetsFromJSON,
  applyUserPreset,
  UserPreset,
} from '@/lib/editor/user-presets';
import { SavePresetDialog } from './SavePresetDialog';

// Category colors - distinct color for each preset category
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Basic: { bg: 'bg-neutral-500', text: 'text-white' },
  VSCO: { bg: 'bg-teal-500', text: 'text-white' },
  Film: { bg: 'bg-amber-600', text: 'text-white' },
  Portrait: { bg: 'bg-pink-400', text: 'text-black' },
  Moody: { bg: 'bg-indigo-600', text: 'text-white' },
  Vibrant: { bg: 'bg-rose-500', text: 'text-white' },
  Cinematic: { bg: 'bg-cyan-600', text: 'text-white' },
  'B&W': { bg: 'bg-neutral-700', text: 'text-white' },
  Vintage: { bg: 'bg-orange-500', text: 'text-black' },
  Clean: { bg: 'bg-sky-400', text: 'text-black' },
};

// Preset pill component - compact single row
interface PresetPillProps {
  code: string;
  category: string;
  isActive: boolean;
  onClick: () => void;
}

function PresetPill({ code, category, isActive, onClick }: PresetPillProps) {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.Basic;

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors
        ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}
      `}
    >
      <span
        className={`
          px-3 py-1 rounded text-xs font-medium min-w-[60px] text-center
          ${colors.bg} ${colors.text}
        `}
      >
        {code}
      </span>
      <span className={`text-sm ${isActive ? 'text-white font-medium' : 'text-neutral-400'}`}>
        {category}
      </span>
    </button>
  );
}

// User preset pill - compact styling
interface UserPresetPillProps {
  preset: UserPreset;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

function UserPresetPill({ preset, isActive, onClick, onDelete }: UserPresetPillProps) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`
          w-full flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors
          ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}
        `}
      >
        <span className="px-3 py-1 rounded text-xs font-medium min-w-[60px] text-center bg-emerald-600 text-white">
          {preset.name.substring(0, 3).toUpperCase()}
        </span>
        <span className={`text-sm flex-1 text-left ${isActive ? 'text-white font-medium' : 'text-neutral-400'}`}>
          {preset.name}
        </span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
        title="Delete preset"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function PresetPanel() {
  // Editor store (single image mode)
  const image = useEditorStore((state) => state.image);
  const editState = useEditorStore((state) => state.editState);
  const setEditState = useEditorStore((state) => state.setEditState);
  const pushHistory = useEditorStore((state) => state.pushHistory);
  const showToast = useEditorStore((state) => state.showToast);

  // Gallery store (batch mode)
  const { selectedIds, images: galleryImages, updateImageEditState } = useGalleryStore();

  // Determine mode: editor (single image) or gallery (batch)
  const isGalleryMode = !image && selectedIds.length > 0;
  const selectedGalleryImages = isGalleryMode
    ? galleryImages.filter((img) => selectedIds.includes(img.id))
    : [];

  const [userPresets, setUserPresets] = useState<UserPreset[]>([]);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [activeUserPresetId, setActiveUserPresetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user presets on mount
  useEffect(() => {
    setUserPresets(loadUserPresets());
  }, []);

  const handlePresetClick = (preset: (typeof PRESETS)[number]) => {
    if (isGalleryMode) {
      // Batch apply to selected gallery images
      selectedGalleryImages.forEach((galleryImg) => {
        let newEditState;
        if (preset.id === 'original') {
          newEditState = createDefaultEditState();
        } else {
          const presetState = applyPreset(preset);
          const defaultState = createDefaultEditState();
          // Deep merge: start with defaults, overlay preset values
          newEditState = {
            ...defaultState,
            ...presetState,
            // Ensure nested objects are properly merged
            curve: { ...defaultState.curve, ...presetState.curve },
            hsl: { ...defaultState.hsl, ...presetState.hsl },
            grain: { ...defaultState.grain, ...presetState.grain },
            vignette: { ...defaultState.vignette, ...presetState.vignette },
            splitTone: { ...defaultState.splitTone, ...presetState.splitTone },
            blur: { ...defaultState.blur, ...presetState.blur },
            border: { ...defaultState.border, ...presetState.border },
            bloom: { ...defaultState.bloom, ...presetState.bloom },
            halation: { ...defaultState.halation, ...presetState.halation },
            skinTone: { ...defaultState.skinTone, ...presetState.skinTone },
            calibration: { ...defaultState.calibration, ...presetState.calibration },
            grayMixer: { ...defaultState.grayMixer, ...presetState.grayMixer },
            sharpening: { ...defaultState.sharpening, ...presetState.sharpening },
            noiseReduction: { ...defaultState.noiseReduction, ...presetState.noiseReduction },
          };
        }
        updateImageEditState(galleryImg.id, newEditState);
      });
      showToast(`Applied to ${selectedGalleryImages.length} photo${selectedGalleryImages.length > 1 ? 's' : ''}`);
    } else {
      // Single image mode
      pushHistory();
      setActivePresetId(preset.id);
      setActiveUserPresetId(null);

      if (preset.id === 'original') {
        setEditState(createDefaultEditState());
      } else {
        const presetState = applyPreset(preset);
        const defaultState = createDefaultEditState();
        // Deep merge: start with defaults, overlay preset values
        // Use setEditState for full replacement (not merge)
        setEditState({
          ...defaultState,
          ...presetState,
          // Ensure nested objects are properly merged
          curve: { ...defaultState.curve, ...presetState.curve },
          hsl: { ...defaultState.hsl, ...presetState.hsl },
          grain: { ...defaultState.grain, ...presetState.grain },
          vignette: { ...defaultState.vignette, ...presetState.vignette },
          splitTone: { ...defaultState.splitTone, ...presetState.splitTone },
          blur: { ...defaultState.blur, ...presetState.blur },
          border: { ...defaultState.border, ...presetState.border },
          bloom: { ...defaultState.bloom, ...presetState.bloom },
          halation: { ...defaultState.halation, ...presetState.halation },
          skinTone: { ...defaultState.skinTone, ...presetState.skinTone },
          calibration: { ...defaultState.calibration, ...presetState.calibration },
          grayMixer: { ...defaultState.grayMixer, ...presetState.grayMixer },
          sharpening: { ...defaultState.sharpening, ...presetState.sharpening },
          noiseReduction: { ...defaultState.noiseReduction, ...presetState.noiseReduction },
        });
      }
    }
  };

  const handleUserPresetClick = (preset: UserPreset) => {
    if (isGalleryMode) {
      // Batch apply to selected gallery images
      selectedGalleryImages.forEach((galleryImg) => {
        const newState = applyUserPreset(preset, createDefaultEditState());
        updateImageEditState(galleryImg.id, newState);
      });
      showToast(`Applied to ${selectedGalleryImages.length} photo${selectedGalleryImages.length > 1 ? 's' : ''}`);
    } else {
      pushHistory();
      setActivePresetId(null);
      setActiveUserPresetId(preset.id);
      const newState = applyUserPreset(preset, createDefaultEditState());
      setEditState(newState);
    }
  };

  const handleSavePreset = (name: string) => {
    const updated = addUserPreset(name, editState);
    setUserPresets(updated);
  };

  const handleDeleteUserPreset = (id: string) => {
    const updated = deleteUserPreset(id);
    setUserPresets(updated);
    if (activeUserPresetId === id) {
      setActiveUserPresetId(null);
    }
  };

  const handleExportPresets = () => {
    exportPresetsAsJSON(userPresets);
  };

  const handleImportPresets = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const updated = await importPresetsFromJSON(file);
      setUserPresets(updated);
    } catch (error) {
      console.error('Failed to import presets:', error);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  // Group presets by category
  const presetsByCategory = useMemo(() => {
    const grouped: Record<string, typeof PRESETS> = {};
    PRESETS.forEach((preset) => {
      if (!grouped[preset.category]) {
        grouped[preset.category] = [];
      }
      grouped[preset.category].push(preset);
    });
    return grouped;
  }, []);


  return (
    <div className="py-2">
      {/* User presets section */}
      {userPresets.length > 0 && (
        <div className="px-2 py-2">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              My Presets
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-neutral-500 hover:text-white px-2 py-1"
              >
                Import
              </button>
              <button
                onClick={handleExportPresets}
                className="text-xs text-neutral-500 hover:text-white px-2 py-1"
              >
                Export
              </button>
            </div>
          </div>
          <div className="space-y-0.5">
            {userPresets.map((preset) => {
              const isActive = activeUserPresetId === preset.id;
              return (
                <UserPresetPill
                  key={preset.id}
                  preset={preset}
                  isActive={isActive}
                  onClick={() => handleUserPresetClick(preset)}
                  onDelete={() => handleDeleteUserPreset(preset.id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Save preset button */}
      <div className="px-4 py-2 border-b border-neutral-800">
        <button
          onClick={() => setIsSaveDialogOpen(true)}
          className="w-full py-2 text-sm text-neutral-400 hover:text-white border border-neutral-700 hover:border-neutral-600 rounded-lg transition-colors"
        >
          + Save Current as Preset
        </button>
      </div>

      {/* Preset list by category */}
      {Object.entries(presetsByCategory).map(([category, presets]) => (
        <div key={category} className="px-2 py-2">
          <span className="block px-2 mb-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">
            {category}
          </span>
          <div className="space-y-0.5">
            {presets.map((preset) => {
              const isActive =
                !isGalleryMode &&
                activeUserPresetId === null &&
                activePresetId === preset.id;
              return (
                <PresetPill
                  key={preset.id}
                  code={preset.name}
                  category={category}
                  isActive={isActive}
                  onClick={() => handlePresetClick(preset)}
                />
              );
            })}
          </div>
        </div>
      ))}

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportPresets}
        className="hidden"
      />

      {/* Save preset dialog */}
      <SavePresetDialog
        isOpen={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        onSave={handleSavePreset}
      />
    </div>
  );
}
