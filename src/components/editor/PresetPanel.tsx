'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useEditorStore } from '@/lib/editor/state';
import { useGalleryStore } from '@/lib/gallery/store';
import { PRESETS, applyPreset } from '@/lib/editor/presets';
import { Slider } from '@/components/ui/slider';
import { createDefaultEditState, Preset } from '@/types/editor';
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

// Generate CSS filter approximation for preset thumbnail
function getPresetFilter(preset: Preset): string {
  const filters: string[] = [];
  const adj = preset.baseAdjustments;

  // Exposure -> brightness (100% = normal)
  if (adj?.exposure) {
    filters.push(`brightness(${100 + adj.exposure * 50}%)`);
  }

  // Contrast (100% = normal)
  if (adj?.contrast) {
    filters.push(`contrast(${100 + adj.contrast}%)`);
  }

  // Saturation (100% = normal)
  if (adj?.saturation) {
    filters.push(`saturate(${100 + adj.saturation * 2}%)`);
  }

  // Temperature -> sepia + hue-rotate approximation
  if (adj?.temperature && adj.temperature > 0) {
    filters.push(`sepia(${adj.temperature * 2}%)`);
  }

  // B&W presets use grayscale
  if (preset.category === 'B&W') {
    filters.push('grayscale(100%)');
    filters.push(`contrast(${100 + (adj?.contrast || 15)}%)`);
  }

  return filters.length > 0 ? filters.join(' ') : 'none';
}

// Preset pill component - VSCO style with thumbnail
interface PresetPillProps {
  code: string;
  name: string;
  isActive: boolean;
  onClick: () => void;
  category: string;
  locked?: boolean;
  thumbnailSrc?: string;
  filter?: string;
}

function PresetPill({ code, name, isActive, onClick, category, locked, thumbnailSrc, filter }: PresetPillProps) {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.Basic;

  return (
    <button
      onClick={onClick}
      disabled={locked}
      className={`
        w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors
        ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}
        ${locked ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {/* Thumbnail preview */}
      {thumbnailSrc ? (
        <div
          className={`
            w-12 h-12 rounded-md overflow-hidden flex-shrink-0
            ${isActive ? 'ring-2 ring-white' : 'ring-1 ring-neutral-700'}
          `}
        >
          <img
            src={thumbnailSrc}
            alt={name}
            className="w-full h-full object-cover"
            style={{ filter: filter || 'none' }}
          />
        </div>
      ) : (
        <span
          className={`
            px-2.5 py-1 rounded-md text-xs font-medium min-w-[48px] text-center
            ${colors.bg} ${colors.text}
            ${isActive ? 'opacity-100' : 'opacity-80'}
          `}
        >
          {code}
        </span>
      )}
      <div className="flex-1 text-left">
        <span className={`text-sm block ${isActive ? 'text-white' : 'text-neutral-300'}`}>
          {name}
        </span>
        <span className="text-xs text-neutral-500">{code}</span>
      </div>
      {locked && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-neutral-500"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )}
    </button>
  );
}

// User preset pill - slightly different styling
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
          w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors
          ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}
        `}
      >
        <span
          className={`
            px-2.5 py-1 rounded-md text-xs font-medium min-w-[48px] text-center
            bg-neutral-600 text-white
          `}
        >
          {preset.name.substring(0, 3).toUpperCase()}
        </span>
        <span className={`text-sm flex-1 text-left ${isActive ? 'text-white' : 'text-neutral-300'}`}>
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

  // Get active preset info
  const activePreset = useMemo(() => {
    if (activeUserPresetId) {
      return userPresets.find((p) => p.id === activeUserPresetId);
    }
    if (editState.lutId) {
      return PRESETS.find((p) => p.lutFile === editState.lutId);
    }
    return null;
  }, [editState.lutId, activeUserPresetId, userPresets]);

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

  return (
    <div className="py-2">
      {/* Strength slider (when a preset is active) */}
      {activePreset && !isGalleryMode && (
        <div className="px-4 py-3 border-b border-neutral-800">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-neutral-400">Strength</span>
            <span className="text-white tabular-nums">{editState.lutIntensity}</span>
          </div>
          <Slider
            value={[editState.lutIntensity]}
            min={0}
            max={100}
            step={1}
            onValueChange={([v]) => handleStrengthChange(v)}
          />
        </div>
      )}

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
            {userPresets.map((preset) => (
              <UserPresetPill
                key={preset.id}
                preset={preset}
                isActive={activeUserPresetId === preset.id}
                onClick={() => handleUserPresetClick(preset)}
                onDelete={() => handleDeleteUserPreset(preset.id)}
              />
            ))}
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
            {presets.map((preset, index) => (
              <PresetPill
                key={preset.id}
                code={getPresetCode(preset, index)}
                name={preset.name}
                category={preset.category}
                isActive={
                  !isGalleryMode &&
                  activeUserPresetId === null &&
                  (preset.id === 'original'
                    ? !editState.lutId
                    : editState.lutId === preset.lutFile)
                }
                onClick={() => handlePresetClick(preset)}
                thumbnailSrc={isGalleryMode ? selectedGalleryImages[0]?.thumbnailUrl : image?.preview.src}
                filter={getPresetFilter(preset)}
              />
            ))}
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
