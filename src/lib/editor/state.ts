import { create } from 'zustand';
import {
  EditState,
  ImageData,
  Mask,
  Point,
  HSLAdjustment,
  ColorRange,
  createDefaultEditState,
  ensureCompleteEditState,
} from '@/types/editor';
import { HistogramData, createEmptyHistogram } from '@/lib/histogram';

interface HistoryEntry {
  editState: EditState;
  timestamp: number;
}

interface EditorStore {
  // Image
  image: ImageData | null;
  setImage: (image: ImageData | null) => void;

  // Edit state
  editState: EditState;
  setEditState: (state: EditState) => void;
  updateEditState: (updates: Partial<EditState>) => void;
  resetEditState: () => void;

  // Individual adjustments
  setExposure: (value: number) => void;
  setContrast: (value: number) => void;
  setHighlights: (value: number) => void;
  setShadows: (value: number) => void;
  setWhites: (value: number) => void;
  setBlacks: (value: number) => void;
  setTemperature: (value: number) => void;
  setTint: (value: number) => void;
  setClarity: (value: number) => void;
  setTexture: (value: number) => void;
  setDehaze: (value: number) => void;
  setVibrance: (value: number) => void;
  setSaturation: (value: number) => void;

  // Curve
  setCurvePoints: (channel: 'rgb' | 'red' | 'green' | 'blue', points: Point[]) => void;

  // HSL
  setHSL: (color: ColorRange, adjustment: Partial<HSLAdjustment>) => void;

  // LUT
  setLutId: (id: string | null) => void;
  setLutIntensity: (value: number) => void;

  // Effects
  setGrain: (updates: Partial<EditState['grain']>) => void;
  setVignette: (updates: Partial<EditState['vignette']>) => void;
  setChromaticAberration: (updates: Partial<EditState['chromaticAberration']>) => void;
  setColorGrading: (updates: Partial<EditState['colorGrading']>) => void;
  setColorGradingWheel: (wheel: 'shadows' | 'midtones' | 'highlights' | 'global', updates: Partial<EditState['colorGrading']['shadows']>) => void;

  // Masks
  addMask: (mask: Mask) => void;
  updateMask: (id: string, updates: Partial<Mask>) => void;
  removeMask: (id: string) => void;
  setMaskVisibility: (id: string, visible: boolean) => void;

  // History
  history: HistoryEntry[];
  historyIndex: number;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // UI state
  activePanel: string;
  setActivePanel: (panel: string) => void;
  selectedMaskId: string | null;
  setSelectedMaskId: (id: string | null) => void;

  // Cropping state
  isCropping: boolean;
  setIsCropping: (isCropping: boolean) => void;
  cropAspectRatio: number | null;
  setCropAspectRatio: (ratio: number | null) => void;
  isTransformPanelActive: boolean;
  setIsTransformPanelActive: (active: boolean) => void;

  // Comparison state
  comparisonMode: 'off' | 'split' | 'hold';
  setComparisonMode: (mode: 'off' | 'split' | 'hold') => void;
  comparisonSplitPosition: number; // 0 to 1, position of the split divider
  setComparisonSplitPosition: (position: number) => void;
  isHoldingOriginal: boolean;
  setIsHoldingOriginal: (holding: boolean) => void;

  // Zoom state
  zoomLevel: number; // 1 = 100%
  setZoomLevel: (level: number) => void;
  zoomToFit: boolean;
  setZoomToFit: (fit: boolean) => void;

  // Histogram
  histogramData: HistogramData;
  setHistogramData: (data: HistogramData) => void;
  showHistogram: boolean;
  setShowHistogram: (show: boolean) => void;

  // Copy/Paste settings
  copiedSettings: EditState | null;
  copySettings: () => void;
  pasteSettings: () => void;
  hasCopiedSettings: () => boolean;

  // Toast notifications
  toast: { message: string; id: number } | null;
  showToast: (message: string) => void;
}

const MAX_HISTORY = 50;

export const useEditorStore = create<EditorStore>((set, get) => ({
  // Image
  image: null,
  setImage: (image) => set({ image }),

  // Edit state
  editState: createDefaultEditState(),
  setEditState: (editState) => set({ editState }),
  updateEditState: (updates) =>
    set((state) => ({
      editState: { ...state.editState, ...updates },
    })),
  resetEditState: () => {
    const { pushHistory } = get();
    pushHistory();
    set({ editState: createDefaultEditState() });
  },

  // Individual adjustments with history
  setExposure: (value) => {
    get().pushHistory();
    set((state) => ({ editState: { ...state.editState, exposure: value } }));
  },
  setContrast: (value) => {
    get().pushHistory();
    set((state) => ({ editState: { ...state.editState, contrast: value } }));
  },
  setHighlights: (value) => {
    get().pushHistory();
    set((state) => ({ editState: { ...state.editState, highlights: value } }));
  },
  setShadows: (value) => {
    get().pushHistory();
    set((state) => ({ editState: { ...state.editState, shadows: value } }));
  },
  setWhites: (value) => {
    get().pushHistory();
    set((state) => ({ editState: { ...state.editState, whites: value } }));
  },
  setBlacks: (value) => {
    get().pushHistory();
    set((state) => ({ editState: { ...state.editState, blacks: value } }));
  },
  setTemperature: (value) => {
    get().pushHistory();
    set((state) => ({ editState: { ...state.editState, temperature: value } }));
  },
  setTint: (value) => {
    get().pushHistory();
    set((state) => ({ editState: { ...state.editState, tint: value } }));
  },
  setClarity: (value) => {
    get().pushHistory();
    set((state) => ({ editState: { ...state.editState, clarity: value } }));
  },
  setTexture: (value) => {
    get().pushHistory();
    set((state) => ({ editState: { ...state.editState, texture: value } }));
  },
  setDehaze: (value) => {
    get().pushHistory();
    set((state) => ({ editState: { ...state.editState, dehaze: value } }));
  },
  setVibrance: (value) => {
    get().pushHistory();
    set((state) => ({ editState: { ...state.editState, vibrance: value } }));
  },
  setSaturation: (value) => {
    get().pushHistory();
    set((state) => ({ editState: { ...state.editState, saturation: value } }));
  },

  // Curve
  setCurvePoints: (channel, points) => {
    get().pushHistory();
    set((state) => ({
      editState: {
        ...state.editState,
        curve: { ...state.editState.curve, [channel]: points },
      },
    }));
  },

  // HSL
  setHSL: (color, adjustment) => {
    get().pushHistory();
    set((state) => ({
      editState: {
        ...state.editState,
        hsl: {
          ...state.editState.hsl,
          [color]: { ...state.editState.hsl[color], ...adjustment },
        },
      },
    }));
  },

  // LUT
  setLutId: (id) => {
    get().pushHistory();
    set((state) => ({ editState: { ...state.editState, lutId: id } }));
  },
  setLutIntensity: (value) => {
    get().pushHistory();
    set((state) => ({ editState: { ...state.editState, lutIntensity: value } }));
  },

  // Effects
  setGrain: (updates) => {
    get().pushHistory();
    set((state) => ({
      editState: {
        ...state.editState,
        grain: { ...state.editState.grain, ...updates },
      },
    }));
  },
  setVignette: (updates) => {
    get().pushHistory();
    set((state) => ({
      editState: {
        ...state.editState,
        vignette: { ...state.editState.vignette, ...updates },
      },
    }));
  },
  setChromaticAberration: (updates) => {
    get().pushHistory();
    set((state) => ({
      editState: {
        ...state.editState,
        chromaticAberration: { ...state.editState.chromaticAberration, ...updates },
      },
    }));
  },
  setColorGrading: (updates) => {
    get().pushHistory();
    set((state) => ({
      editState: {
        ...state.editState,
        colorGrading: { ...state.editState.colorGrading, ...updates },
      },
    }));
  },
  setColorGradingWheel: (wheel, updates) => {
    get().pushHistory();
    set((state) => ({
      editState: {
        ...state.editState,
        colorGrading: {
          ...state.editState.colorGrading,
          [wheel]: { ...state.editState.colorGrading[wheel], ...updates },
        },
      },
    }));
  },

  // Masks
  addMask: (mask) => {
    get().pushHistory();
    set((state) => ({
      editState: {
        ...state.editState,
        masks: [...state.editState.masks, mask],
      },
    }));
  },
  updateMask: (id, updates) => {
    get().pushHistory();
    set((state) => ({
      editState: {
        ...state.editState,
        masks: state.editState.masks.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      },
    }));
  },
  removeMask: (id) => {
    get().pushHistory();
    set((state) => ({
      editState: {
        ...state.editState,
        masks: state.editState.masks.filter((m) => m.id !== id),
      },
    }));
  },
  setMaskVisibility: (id, visible) => {
    set((state) => ({
      editState: {
        ...state.editState,
        masks: state.editState.masks.map((m) =>
          m.id === id ? { ...m, visible } : m
        ),
      },
    }));
  },

  // History
  history: [],
  historyIndex: -1,
  pushHistory: () => {
    const { editState, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      editState: JSON.parse(JSON.stringify(editState)),
      timestamp: Date.now(),
    });
    // Limit history size
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },
  undo: () => {
    const { history, historyIndex, editState } = get();
    if (historyIndex > 0) {
      // Save current state if at end of history
      if (historyIndex === history.length - 1) {
        const newHistory = [...history];
        newHistory.push({
          editState: JSON.parse(JSON.stringify(editState)),
          timestamp: Date.now(),
        });
        set({
          history: newHistory,
          historyIndex: historyIndex - 1,
          editState: JSON.parse(JSON.stringify(history[historyIndex - 1].editState)),
        });
      } else {
        set({
          historyIndex: historyIndex - 1,
          editState: JSON.parse(JSON.stringify(history[historyIndex - 1].editState)),
        });
      }
    }
  },
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({
        historyIndex: historyIndex + 1,
        editState: JSON.parse(JSON.stringify(history[historyIndex + 1].editState)),
      });
    }
  },
  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // UI state
  activePanel: 'adjust',
  setActivePanel: (panel) => set({ activePanel: panel }),
  selectedMaskId: null,
  setSelectedMaskId: (id) => set({ selectedMaskId: id }),

  // Cropping state
  isCropping: false,
  setIsCropping: (isCropping) => set({ isCropping }),
  cropAspectRatio: null,
  setCropAspectRatio: (ratio) => set({ cropAspectRatio: ratio }),
  isTransformPanelActive: false,
  setIsTransformPanelActive: (active) => set({ isTransformPanelActive: active }),

  // Comparison state
  comparisonMode: 'off',
  setComparisonMode: (mode) => set({ comparisonMode: mode }),
  comparisonSplitPosition: 0.5,
  setComparisonSplitPosition: (position) => set({ comparisonSplitPosition: position }),
  isHoldingOriginal: false,
  setIsHoldingOriginal: (holding) => set({ isHoldingOriginal: holding }),

  // Zoom state
  zoomLevel: 1,
  setZoomLevel: (level) => set({ zoomLevel: level, zoomToFit: false }),
  zoomToFit: true,
  setZoomToFit: (fit) => set({ zoomToFit: fit }),

  // Histogram
  histogramData: createEmptyHistogram(),
  setHistogramData: (data) => set({ histogramData: data }),
  showHistogram: false,
  setShowHistogram: (show) => set({ showHistogram: show }),

  // Copy/Paste settings
  copiedSettings: null,
  copySettings: () => {
    const { editState, showToast } = get();
    // Copy without masks and crop (those are image-specific)
    const settingsToCopy = {
      ...editState,
      crop: null,
      masks: [],
    };
    set({ copiedSettings: JSON.parse(JSON.stringify(settingsToCopy)) });
    showToast('Settings copied');
  },
  pasteSettings: () => {
    const { copiedSettings, pushHistory, showToast } = get();
    if (copiedSettings) {
      pushHistory();
      set((state) => ({
        editState: ensureCompleteEditState({
          ...copiedSettings,
          // Preserve image-specific settings
          crop: state.editState.crop,
          masks: state.editState.masks,
        }),
      }));
      showToast('Settings applied');
    }
  },
  hasCopiedSettings: () => get().copiedSettings !== null,

  // Toast notifications
  toast: null,
  showToast: (message) => {
    const id = Date.now();
    set({ toast: { message, id } });
    // Auto-hide after 2 seconds
    setTimeout(() => {
      const currentToast = get().toast;
      if (currentToast?.id === id) {
        set({ toast: null });
      }
    }, 2000);
  },
}));

// Helper to batch updates without creating history entries for every slider tick
let historyTimeout: ReturnType<typeof setTimeout> | null = null;

export function batchedUpdate<T extends keyof EditState>(
  key: T,
  value: EditState[T]
) {
  const store = useEditorStore.getState();

  // Clear existing timeout
  if (historyTimeout) {
    clearTimeout(historyTimeout);
  }

  // Update immediately without history
  useEditorStore.setState((state) => ({
    editState: { ...state.editState, [key]: value },
  }));

  // Debounce history push
  historyTimeout = setTimeout(() => {
    store.pushHistory();
  }, 500);
}
