import { EditState, createDefaultEditState } from '@/types/editor';

export interface UserPreset {
  id: string;
  name: string;
  createdAt: number;
  editState: Partial<EditState>;
}

const STORAGE_KEY = 'vsco-editor-user-presets';

// Generate a unique ID
function generateId(): string {
  return `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get only non-default values from edit state to keep presets compact
function getChangedValues(editState: EditState): Partial<EditState> {
  const defaults = createDefaultEditState();
  const changes: Partial<EditState> = {};

  // Basic adjustments
  if (editState.exposure !== defaults.exposure) changes.exposure = editState.exposure;
  if (editState.contrast !== defaults.contrast) changes.contrast = editState.contrast;
  if (editState.highlights !== defaults.highlights) changes.highlights = editState.highlights;
  if (editState.shadows !== defaults.shadows) changes.shadows = editState.shadows;
  if (editState.whites !== defaults.whites) changes.whites = editState.whites;
  if (editState.blacks !== defaults.blacks) changes.blacks = editState.blacks;
  if (editState.temperature !== defaults.temperature) changes.temperature = editState.temperature;
  if (editState.tint !== defaults.tint) changes.tint = editState.tint;
  if (editState.clarity !== defaults.clarity) changes.clarity = editState.clarity;
  if (editState.vibrance !== defaults.vibrance) changes.vibrance = editState.vibrance;
  if (editState.saturation !== defaults.saturation) changes.saturation = editState.saturation;

  // Curve - check if any channel has more than 2 points or non-default values
  const curveChanged = ['rgb', 'red', 'green', 'blue'].some((channel) => {
    const key = channel as keyof typeof editState.curve;
    const curve = editState.curve[key];
    const defaultCurve = defaults.curve[key];
    if (curve.length !== defaultCurve.length) return true;
    return curve.some((point, i) =>
      point.x !== defaultCurve[i].x || point.y !== defaultCurve[i].y
    );
  });
  if (curveChanged) changes.curve = editState.curve;

  // HSL - check each color channel
  const colors = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'] as const;
  const hslChanged = colors.some((color) => {
    const hsl = editState.hsl[color];
    const defaultHsl = defaults.hsl[color];
    return hsl.hue !== defaultHsl.hue ||
           hsl.saturation !== defaultHsl.saturation ||
           hsl.luminance !== defaultHsl.luminance;
  });
  if (hslChanged) changes.hsl = editState.hsl;

  // Effects
  const grainChanged =
    editState.grain.amount !== defaults.grain.amount ||
    editState.grain.size !== defaults.grain.size ||
    editState.grain.roughness !== defaults.grain.roughness;
  if (grainChanged) changes.grain = editState.grain;

  const vignetteChanged =
    editState.vignette.amount !== defaults.vignette.amount ||
    editState.vignette.midpoint !== defaults.vignette.midpoint ||
    editState.vignette.roundness !== defaults.vignette.roundness ||
    editState.vignette.feather !== defaults.vignette.feather;
  if (vignetteChanged) changes.vignette = editState.vignette;

  // Detail
  const sharpeningChanged =
    editState.sharpening.amount !== defaults.sharpening.amount ||
    editState.sharpening.radius !== defaults.sharpening.radius ||
    editState.sharpening.detail !== defaults.sharpening.detail;
  if (sharpeningChanged) changes.sharpening = editState.sharpening;

  const noiseReductionChanged =
    editState.noiseReduction.luminance !== defaults.noiseReduction.luminance ||
    editState.noiseReduction.color !== defaults.noiseReduction.color ||
    editState.noiseReduction.detail !== defaults.noiseReduction.detail;
  if (noiseReductionChanged) changes.noiseReduction = editState.noiseReduction;

  // LUT
  if (editState.lutId !== defaults.lutId) changes.lutId = editState.lutId;
  if (editState.lutIntensity !== defaults.lutIntensity) changes.lutIntensity = editState.lutIntensity;

  return changes;
}

// Load presets from localStorage
export function loadUserPresets(): UserPreset[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load user presets:', error);
    return [];
  }
}

// Save presets to localStorage
export function saveUserPresets(presets: UserPreset[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch (error) {
    console.error('Failed to save user presets:', error);
  }
}

// Create a new preset from current edit state
export function createUserPreset(name: string, editState: EditState): UserPreset {
  return {
    id: generateId(),
    name,
    createdAt: Date.now(),
    editState: getChangedValues(editState),
  };
}

// Add a preset
export function addUserPreset(name: string, editState: EditState): UserPreset[] {
  const presets = loadUserPresets();
  const newPreset = createUserPreset(name, editState);
  presets.unshift(newPreset); // Add to beginning
  saveUserPresets(presets);
  return presets;
}

// Delete a preset
export function deleteUserPreset(id: string): UserPreset[] {
  const presets = loadUserPresets();
  const filtered = presets.filter((p) => p.id !== id);
  saveUserPresets(filtered);
  return filtered;
}

// Rename a preset
export function renameUserPreset(id: string, newName: string): UserPreset[] {
  const presets = loadUserPresets();
  const preset = presets.find((p) => p.id === id);
  if (preset) {
    preset.name = newName;
    saveUserPresets(presets);
  }
  return presets;
}

// Export presets as JSON
export function exportPresetsAsJSON(presets: UserPreset[]): void {
  const blob = new Blob([JSON.stringify(presets, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vsco-presets-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import presets from JSON file
export function importPresetsFromJSON(file: File): Promise<UserPreset[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as UserPreset[];
        const currentPresets = loadUserPresets();

        // Merge imported presets, avoiding duplicates by name
        const existingNames = new Set(currentPresets.map((p) => p.name));
        const newPresets = imported.filter((p) => !existingNames.has(p.name));

        // Regenerate IDs for imported presets
        const presetsWithNewIds = newPresets.map((p) => ({
          ...p,
          id: generateId(),
          createdAt: Date.now(),
        }));

        const merged = [...presetsWithNewIds, ...currentPresets];
        saveUserPresets(merged);
        resolve(merged);
      } catch (error) {
        reject(new Error('Invalid preset file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// Apply preset to edit state
export function applyUserPreset(preset: UserPreset, currentEditState: EditState): EditState {
  return {
    ...currentEditState,
    ...preset.editState,
  };
}
