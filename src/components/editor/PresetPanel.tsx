'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useEditorStore } from '@/lib/editor/state';
import { useGalleryStore } from '@/lib/gallery/store';
import { PRESETS, applyPreset } from '@/lib/editor/presets';
import { Slider } from '@/components/ui/slider';
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
  Film: { bg: 'bg-orange-500', text: 'text-black' },
  'B&W': { bg: 'bg-neutral-700', text: 'text-white' },
  Warm: { bg: 'bg-amber-500', text: 'text-black' },
  Bold: { bg: 'bg-rose-500', text: 'text-white' },
  Light: { bg: 'bg-sky-400', text: 'text-black' },
  Dark: { bg: 'bg-indigo-600', text: 'text-white' },
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
  const updateEditState = useEditorStore((state) => state.updateEditState);
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
          newEditState = { ...defaultState, ...presetState };
        }
        updateImageEditState(galleryImg.id, newEditState);
      });
      showToast(`Applied to ${selectedGalleryImages.length} photo${selectedGalleryImages.length > 1 ? 's' : ''}`);
    } else {
      // Single image mode
      pushHistory();
      setActiveUserPresetId(null);

      if (preset.id === 'original') {
        const defaultState = createDefaultEditState();
        updateEditState(defaultState);
      } else {
        const presetState = applyPreset(preset);
        const defaultState = createDefaultEditState();
        updateEditState({ ...defaultState, ...presetState });
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
      setActiveUserPresetId(preset.id);
      const newState = applyUserPreset(preset, createDefaultEditState());
      updateEditState(newState);
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

  const handleStrengthChange = (value: number) => {
    useEditorStore.setState((state) => ({
      editState: { ...state.editState, lutIntensity: value },
    }));
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

  // Generate short codes for presets
  const getPresetCode = (preset: (typeof PRESETS)[number], index: number) => {
    if (preset.id === 'original') return 'OG';
    const categoryPrefix = preset.category[0].toUpperCase();
    return `${categoryPrefix}${index + 1}`;
  };

  // Inline strength slider component
  const StrengthSlider = () => (
    <div className="px-4 py-2 ml-2 border-l border-neutral-700">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-neutral-500">Strength</span>
        <span className="text-neutral-300 tabular-nums underline">{editState.lutIntensity}</span>
      </div>
      <Slider
        value={[editState.lutIntensity]}
        min={0}
        max={100}
        step={1}
        onValueChange={([v]) => handleStrengthChange(v)}
      />
    </div>
  );

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
                <div key={preset.id}>
                  <UserPresetPill
                    preset={preset}
                    isActive={isActive}
                    onClick={() => handleUserPresetClick(preset)}
                    onDelete={() => handleDeleteUserPreset(preset.id)}
                  />
                  {isActive && !isGalleryMode && <StrengthSlider />}
                </div>
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
            {presets.map((preset, index) => {
              const isActive =
                !isGalleryMode &&
                activeUserPresetId === null &&
                (preset.id === 'original'
                  ? !editState.lutId
                  : editState.lutId === preset.lutFile);
              return (
                <div key={preset.id}>
                  <PresetPill
                    code={getPresetCode(preset, index)}
                    category={category}
                    isActive={isActive}
                    onClick={() => handlePresetClick(preset)}
                  />
                  {isActive && preset.id !== 'original' && <StrengthSlider />}
                </div>
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
