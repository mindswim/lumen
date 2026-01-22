'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useEditorStore } from '@/lib/editor/state';
import { useGalleryStore } from '@/lib/gallery/store';
import { PanelContainer } from '@/components/ui/panel-section';
import { Slider } from '@/components/ui/slider';
import { sliderPresets } from '@/components/ui/adjustment-slider';
import { EditState, ensureCompleteEditState, createDefaultEditState } from '@/types/editor';

// All available parameters organized by category
const PARAMETER_CATEGORIES = {
  Light: ['exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks'],
  Color: ['temperature', 'tint', 'vibrance', 'saturation'],
  Presence: ['clarity', 'texture', 'dehaze'],
  Effects: ['fade', 'grain.amount', 'vignette.amount', 'bloom.amount'],
  Detail: ['sharpening.amount', 'noiseReduction.luminance'],
} as const;

// Flat list of all parameters
const ALL_PARAMETERS: readonly string[] = Object.values(PARAMETER_CATEGORIES).flat();

// Parameter display names
const PARAM_LABELS: Record<string, string> = {
  exposure: 'Exposure',
  contrast: 'Contrast',
  highlights: 'Highlights',
  shadows: 'Shadows',
  whites: 'Whites',
  blacks: 'Blacks',
  temperature: 'Temperature',
  tint: 'Tint',
  clarity: 'Clarity',
  texture: 'Texture',
  dehaze: 'Dehaze',
  vibrance: 'Vibrance',
  saturation: 'Saturation',
  fade: 'Fade',
  'grain.amount': 'Grain',
  'vignette.amount': 'Vignette',
  'bloom.amount': 'Bloom',
  'sharpening.amount': 'Sharpening',
  'noiseReduction.luminance': 'Noise Reduction',
};

// Get slider config for a parameter
function getSliderConfig(key: string): { min: number; max: number; step: number; default: number } {
  const baseKey = key.split('.')[0];
  const preset = sliderPresets[baseKey as keyof typeof sliderPresets];
  if (preset) {
    return { min: preset.min, max: preset.max, step: preset.step, default: preset.defaultValue };
  }
  if (baseKey === 'exposure') return { min: -5, max: 5, step: 0.1, default: 0 };
  return { min: -100, max: 100, step: 1, default: 0 };
}

// Get nested value from object using dot notation path
function getNestedValue(obj: Record<string, unknown>, path: string): number {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return 0;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'number' ? current : 0;
}

// Set nested value in object using dot notation path
function setNestedValue(obj: Record<string, unknown>, path: string, value: number): Record<string, unknown> {
  const keys = path.split('.');
  const result = { ...obj };
  let current = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    current[key] = { ...(current[key] as Record<string, unknown> || {}) };
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return result;
}

// Extract changed parameters from AI adjustments
function extractChangedParams(adjustments: Partial<EditState>): Map<string, number> {
  const changes = new Map<string, number>();

  function recurse(obj: Record<string, unknown>, prefix: string = '') {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'number') {
        // Only track if it's in our known parameters or is a top-level param
        const isKnown = ALL_PARAMETERS.includes(path) || ALL_PARAMETERS.some(p => p.startsWith(path + '.'));
        if (isKnown || !path.includes('.')) {
          changes.set(path, value);
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        recurse(value as Record<string, unknown>, path);
      }
    }
  }

  recurse(adjustments as Record<string, unknown>);
  return changes;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface TrackedAdjustment {
  path: string;
  originalValue: number;
  currentValue: number;
}

export function AIPanel() {
  const image = useEditorStore((state) => state.image);
  const editState = useEditorStore((state) => state.editState);
  const setEditState = useEditorStore((state) => state.setEditState);
  const pushHistory = useEditorStore((state) => state.pushHistory);

  // Gallery store for batch mode
  const { selectedIds, images: galleryImages, updateImageEditState } = useGalleryStore();

  // Local state
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [trackedAdjustments, setTrackedAdjustments] = useState<Map<string, TrackedAdjustment>>(new Map());
  const [isTrayExpanded, setIsTrayExpanded] = useState(true);
  const [showAddParam, setShowAddParam] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine mode
  const isGalleryMode = !image && selectedIds.length > 0;
  const hasImage = !!image || selectedIds.length > 0;

  // Get default edit state for comparison
  const defaultState = useMemo(() => createDefaultEditState(), []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update a parameter value
  const updateParameter = (path: string, value: number) => {
    const newEditState = setNestedValue(editState as unknown as Record<string, unknown>, path, value);

    if (isGalleryMode) {
      const selectedImages = galleryImages.filter((img) => selectedIds.includes(img.id));
      selectedImages.forEach((img) => {
        const newState = setNestedValue(img.editState as unknown as Record<string, unknown>, path, value);
        updateImageEditState(img.id, ensureCompleteEditState(newState as Partial<EditState>));
      });
    } else {
      setEditState(ensureCompleteEditState(newEditState as Partial<EditState>));
    }

    // Update tracked adjustment
    setTrackedAdjustments((prev) => {
      const updated = new Map(prev);
      const existing = updated.get(path);
      if (existing) {
        updated.set(path, { ...existing, currentValue: value });
      }
      return updated;
    });
  };

  // Add a new parameter to track
  const addParameter = (path: string) => {
    const currentValue = getNestedValue(editState as unknown as Record<string, unknown>, path);
    const originalValue = getNestedValue(defaultState as unknown as Record<string, unknown>, path);

    setTrackedAdjustments((prev) => {
      const updated = new Map(prev);
      if (!updated.has(path)) {
        updated.set(path, {
          path,
          originalValue,
          currentValue,
        });
      }
      return updated;
    });
    setShowAddParam(false);
  };

  // Remove a parameter from tracking
  const removeParameter = (path: string) => {
    setTrackedAdjustments((prev) => {
      const updated = new Map(prev);
      updated.delete(path);
      return updated;
    });
  };

  // Apply AI adjustments and track them
  const applyAndTrackAdjustments = (adjustments: Partial<EditState>) => {
    // Extract changed parameters
    const changes = extractChangedParams(adjustments);

    // Track each change
    setTrackedAdjustments((prev) => {
      const updated = new Map(prev);
      changes.forEach((value, path) => {
        const existing = updated.get(path);
        const originalValue = existing?.originalValue ?? getNestedValue(defaultState as unknown as Record<string, unknown>, path);
        updated.set(path, {
          path,
          originalValue,
          currentValue: value,
        });
      });
      return updated;
    });

    // Apply to edit state
    if (isGalleryMode) {
      const selectedImages = galleryImages.filter((img) => selectedIds.includes(img.id));
      selectedImages.forEach((img) => {
        const newState = ensureCompleteEditState({ ...img.editState, ...adjustments });
        updateImageEditState(img.id, newState);
      });
    } else {
      pushHistory();
      const newState = ensureCompleteEditState({ ...editState, ...adjustments });
      setEditState(newState);
    }
  };

  // Reset all tracked adjustments
  const handleReset = () => {
    trackedAdjustments.forEach((adj) => {
      updateParameter(adj.path, adj.originalValue);
    });
    setTrackedAdjustments(new Map());
  };

  // Auto-enhance handler
  const handleAutoEnhance = async () => {
    if (!hasImage) return;

    setIsLoading(true);
    setError(null);

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: 'Auto-enhance this photo',
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentState: editState }),
      });

      if (!response.ok) throw new Error('Failed to enhance image');

      const data = await response.json();
      applyAndTrackAdjustments(data.adjustments);

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.reasoning || 'Applied automatic enhancements.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTrayExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enhancement failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Natural language edit handler
  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !hasImage || isLoading) return;

    const userPrompt = prompt.trim();
    setPrompt('');
    setIsLoading(true);
    setError(null);

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userPrompt,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/ai/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          currentState: editState,
          conversationHistory,
        }),
      });

      if (!response.ok) throw new Error('Failed to process edit');

      const data = await response.json();
      applyAndTrackAdjustments(data.adjustments);

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.reasoning || 'Adjustments applied.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTrayExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Edit failed');
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setError(null);
  };

  // Get parameters not yet tracked
  const availableParams = ALL_PARAMETERS.filter((p) => !trackedAdjustments.has(p));

  return (
    <PanelContainer className="flex flex-col h-full p-0">
      {/* Header with Auto-Enhance */}
      <div className="flex-shrink-0 p-4 pb-2">
        <button
          onClick={handleAutoEnhance}
          disabled={!hasImage || isLoading}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--editor-accent)', color: 'white' }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner />
              Thinking...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <SparklesIcon />
              Auto-Enhance
            </span>
          )}
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 space-y-2 min-h-0">
        {messages.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm mb-3" style={{ color: 'var(--editor-text-muted)' }}>
              Describe how you want to edit your photo
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['make it warmer', 'film look', 'more contrast', 'cinematic'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setPrompt(suggestion)}
                  disabled={!hasImage}
                  className="px-3 py-1.5 rounded-full text-xs transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--editor-bg-secondary)',
                    color: 'var(--editor-text-secondary)',
                    border: '1px solid var(--editor-border)',
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-lg px-3 py-2 text-sm ${message.role === 'user' ? 'ml-6' : 'mr-6'}`}
              style={{
                backgroundColor: message.role === 'user' ? 'var(--editor-accent)' : 'var(--editor-bg-secondary)',
                color: message.role === 'user' ? 'white' : 'var(--editor-text-primary)',
              }}
            >
              {message.content}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <p className="px-4 text-xs py-1" style={{ color: 'var(--editor-error, #ef4444)' }}>
          {error}
        </p>
      )}

      {/* Adjustments Tray */}
      {trackedAdjustments.size > 0 && (
        <div
          className="flex-shrink-0"
          style={{ borderTop: '1px solid var(--editor-border)', backgroundColor: 'var(--editor-bg-tertiary)' }}
        >
          {/* Tray Header */}
          <div
            className="w-full px-4 py-2 flex items-center justify-between text-xs font-medium cursor-pointer"
            style={{ color: 'var(--editor-text-secondary)' }}
          >
            <span
              className="flex items-center gap-2"
              onClick={() => setIsTrayExpanded(!isTrayExpanded)}
            >
              <ChevronIcon expanded={isTrayExpanded} />
              Active Adjustments ({trackedAdjustments.size})
            </span>
            <button
              onClick={handleReset}
              className="px-2 py-0.5 rounded text-xs transition-colors hover:bg-black/10"
              style={{ color: 'var(--editor-text-muted)' }}
            >
              Reset
            </button>
          </div>

          {/* Tray Content */}
          {isTrayExpanded && (
            <div className="px-4 pb-3 space-y-3 max-h-48 overflow-y-auto">
              {Array.from(trackedAdjustments.values()).map((adj) => (
                <DeltaSlider
                  key={adj.path}
                  path={adj.path}
                  label={PARAM_LABELS[adj.path] || adj.path}
                  originalValue={adj.originalValue}
                  currentValue={getNestedValue(editState as unknown as Record<string, unknown>, adj.path)}
                  onChange={(value) => updateParameter(adj.path, value)}
                  onRemove={() => removeParameter(adj.path)}
                />
              ))}

              {/* Add Parameter Button */}
              <div className="relative">
                <button
                  onClick={() => setShowAddParam(!showAddParam)}
                  className="w-full py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  style={{
                    backgroundColor: 'var(--editor-bg-secondary)',
                    color: 'var(--editor-text-muted)',
                    border: '1px dashed var(--editor-border)',
                  }}
                >
                  <PlusIcon /> Add parameter
                </button>

                {/* Dropdown */}
                {showAddParam && (
                  <div
                    className="absolute bottom-full left-0 right-0 mb-1 rounded-lg shadow-lg overflow-hidden z-10 max-h-48 overflow-y-auto"
                    style={{ backgroundColor: 'var(--editor-bg-primary)', border: '1px solid var(--editor-border)' }}
                  >
                    {Object.entries(PARAMETER_CATEGORIES).map(([category, params]) => {
                      const available = params.filter((p) => !trackedAdjustments.has(p));
                      if (available.length === 0) return null;
                      return (
                        <div key={category}>
                          <div
                            className="px-3 py-1.5 text-xs font-medium"
                            style={{ backgroundColor: 'var(--editor-bg-secondary)', color: 'var(--editor-text-muted)' }}
                          >
                            {category}
                          </div>
                          {available.map((param) => (
                            <button
                              key={param}
                              onClick={() => addParameter(param)}
                              className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-black/5"
                              style={{ color: 'var(--editor-text-primary)' }}
                            >
                              {PARAM_LABELS[param] || param}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 pt-2 space-y-2" style={{ borderTop: trackedAdjustments.size === 0 ? '1px solid var(--editor-border)' : 'none' }}>
        <form onSubmit={handlePromptSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={hasImage ? 'Describe your edit...' : 'Load an image first'}
            disabled={!hasImage || isLoading}
            className="flex-1 py-2 px-3 rounded-lg text-sm transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--editor-bg-secondary)',
              color: 'var(--editor-text-primary)',
              border: '1px solid var(--editor-border)',
            }}
          />
          <button
            type="submit"
            disabled={!prompt.trim() || !hasImage || isLoading}
            className="px-3 py-2 rounded-lg transition-colors disabled:opacity-30"
            style={{ backgroundColor: 'var(--editor-accent)', color: 'white' }}
          >
            <SendIcon />
          </button>
        </form>

        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="w-full text-xs py-1 transition-colors"
            style={{ color: 'var(--editor-text-muted)' }}
          >
            Clear conversation
          </button>
        )}
      </div>
    </PanelContainer>
  );
}

// Delta Slider with visual indicator of change from original
interface DeltaSliderProps {
  path: string;
  label: string;
  originalValue: number;
  currentValue: number;
  onChange: (value: number) => void;
  onRemove: () => void;
}

function DeltaSlider({ path, label, originalValue, currentValue, onChange, onRemove }: DeltaSliderProps) {
  const config = getSliderConfig(path);
  const [localValue, setLocalValue] = useState(currentValue);

  useEffect(() => {
    setLocalValue(currentValue);
  }, [currentValue]);

  const handleChange = (value: number) => {
    setLocalValue(value);
    onChange(value);
  };

  const displayValue = config.step < 1 ? localValue.toFixed(1) : localValue.toFixed(0);
  const prefix = localValue > 0 ? '+' : '';
  const delta = localValue - originalValue;
  const deltaDisplay = delta !== 0 ? ` (${delta > 0 ? '+' : ''}${config.step < 1 ? delta.toFixed(1) : delta.toFixed(0)})` : '';

  // Calculate positions for delta visualization
  const range = config.max - config.min;
  const originalPercent = ((originalValue - config.min) / range) * 100;
  const currentPercent = ((localValue - config.min) / range) * 100;
  const deltaStart = Math.min(originalPercent, currentPercent);
  const deltaWidth = Math.abs(currentPercent - originalPercent);
  const isIncrease = localValue > originalValue;

  return (
    <div className="space-y-1 group">
      <div className="flex justify-between items-center">
        <span className="text-xs" style={{ color: 'var(--editor-text-secondary)' }}>
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums" style={{ color: 'var(--editor-text-primary)' }}>
            {prefix}{displayValue}
            <span style={{ color: 'var(--editor-text-muted)' }}>{deltaDisplay}</span>
          </span>
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/10"
            style={{ color: 'var(--editor-text-muted)' }}
          >
            <XIcon />
          </button>
        </div>
      </div>

      {/* Custom slider with delta visualization */}
      <div className="relative h-5">
        {/* Delta highlight bar */}
        {delta !== 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full pointer-events-none"
            style={{
              left: `${deltaStart}%`,
              width: `${deltaWidth}%`,
              backgroundColor: isIncrease ? 'rgba(59, 130, 246, 0.5)' : 'rgba(249, 115, 22, 0.5)',
            }}
          />
        )}

        {/* Original value marker */}
        {delta !== 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full pointer-events-none"
            style={{
              left: `${originalPercent}%`,
              backgroundColor: 'var(--editor-text-muted)',
              opacity: 0.5,
            }}
          />
        )}

        <Slider
          value={[localValue]}
          min={config.min}
          max={config.max}
          step={config.step}
          onValueChange={([v]) => handleChange(v)}
          className="w-full"
        />
      </div>
    </div>
  );
}

// Icons
function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z" />
      <path d="M19 11l1 2 1-2 2-1-2-1-1-2-1 2-2 1 2 1z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`}
    >
      <path d="M2 4l4 4 4-4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 2v8M2 6h8" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 2l8 8M10 2l-8 8" />
    </svg>
  );
}
