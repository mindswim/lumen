'use client';

import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '@/lib/editor/state';
import { useGalleryStore } from '@/lib/gallery/store';
import { PanelContainer, PanelHint } from '@/components/ui/panel-section';
import { Slider } from '@/components/ui/slider';
import { sliderPresets } from '@/components/ui/adjustment-slider';
import { EditState, ensureCompleteEditState } from '@/types/editor';

// Parameter metadata for display
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
  sharpening: 'Sharpening',
  noiseReduction: 'Noise Reduction',
};

// Get slider config for a parameter
function getSliderConfig(key: string): { min: number; max: number; step: number } {
  const preset = sliderPresets[key as keyof typeof sliderPresets];
  if (preset) {
    return { min: preset.min, max: preset.max, step: preset.step };
  }
  // Default for nested/unknown params
  if (key === 'exposure') return { min: -5, max: 5, step: 0.1 };
  return { min: -100, max: 100, step: 1 };
}

// Flatten nested adjustments for display
function flattenAdjustments(
  adjustments: Partial<EditState>
): Array<{ key: string; path: string[]; value: number; label: string }> {
  const result: Array<{ key: string; path: string[]; value: number; label: string }> = [];

  function recurse(obj: Record<string, unknown>, path: string[] = []) {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = [...path, key];

      if (typeof value === 'number') {
        const label =
          path.length > 0
            ? `${path[path.length - 1]} ${key}`.replace(/([A-Z])/g, ' $1').trim()
            : PARAM_LABELS[key] || key.replace(/([A-Z])/g, ' $1').trim();
        result.push({
          key,
          path: currentPath,
          value,
          label: label.charAt(0).toUpperCase() + label.slice(1),
        });
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        recurse(value as Record<string, unknown>, currentPath);
      }
    }
  }

  recurse(adjustments as Record<string, unknown>);
  return result;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  adjustments?: Partial<EditState>;
  timestamp: number;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine mode
  const isGalleryMode = !image && selectedIds.length > 0;
  const hasImage = !!image || selectedIds.length > 0;

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update a single parameter value (for inline slider editing)
  const updateParameter = (path: string[], value: number) => {
    // Build the nested update object
    let update: Record<string, unknown> = {};
    let current = update;

    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = {};
      current = current[path[i]] as Record<string, unknown>;
    }
    current[path[path.length - 1]] = value;

    // Apply to edit state
    if (isGalleryMode) {
      const selectedImages = galleryImages.filter((img) => selectedIds.includes(img.id));
      selectedImages.forEach((img) => {
        const newState = deepMerge(img.editState, update);
        updateImageEditState(img.id, ensureCompleteEditState(newState));
      });
    } else {
      const newState = deepMerge(editState, update);
      setEditState(ensureCompleteEditState(newState));
    }
  };

  // Apply full adjustments
  const applyAdjustments = (adjustments: Partial<EditState>) => {
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

  // Auto-enhance handler
  const handleAutoEnhance = async () => {
    if (!hasImage) return;

    setIsLoading(true);
    setError(null);

    // Add user message
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
      applyAdjustments(data.adjustments);

      // Add assistant message
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.reasoning || 'Applied automatic enhancements.',
        adjustments: data.adjustments,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
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

    // Add user message
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userPrompt,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // Build conversation history for context
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content:
          m.role === 'assistant' && m.adjustments
            ? JSON.stringify({ adjustments: m.adjustments, reasoning: m.content })
            : m.content,
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
      applyAdjustments(data.adjustments);

      // Add assistant message
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.reasoning || 'Adjustments applied.',
        adjustments: data.adjustments,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Edit failed');
      // Remove the user message if there was an error
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setIsLoading(false);
    }
  };

  // Clear chat
  const handleClearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <PanelContainer className="flex flex-col h-full">
      {/* Header with Auto-Enhance */}
      <div className="flex-shrink-0 pb-4">
        <button
          onClick={handleAutoEnhance}
          disabled={!hasImage || isLoading}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'var(--editor-accent)',
            color: 'white',
          }}
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
      <div
        className="flex-1 overflow-y-auto space-y-3 min-h-0"
        style={{ maxHeight: 'calc(100vh - 320px)' }}
      >
        {messages.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--editor-text-muted)' }}>
              Describe how you want to edit your photo
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
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
            <div key={message.id} className="space-y-2">
              {/* Message bubble */}
              <div
                className={`rounded-lg px-3 py-2 ${
                  message.role === 'user' ? 'ml-4' : 'mr-4'
                }`}
                style={{
                  backgroundColor:
                    message.role === 'user'
                      ? 'var(--editor-accent)'
                      : 'var(--editor-bg-secondary)',
                  color: message.role === 'user' ? 'white' : 'var(--editor-text-primary)',
                }}
              >
                <p className="text-sm">{message.content}</p>
              </div>

              {/* Adjustment sliders for assistant messages */}
              {message.role === 'assistant' && message.adjustments && (
                <div
                  className="rounded-lg p-3 mr-4 space-y-3"
                  style={{
                    backgroundColor: 'var(--editor-bg-tertiary)',
                    border: '1px solid var(--editor-border)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-medium uppercase tracking-wide"
                      style={{ color: 'var(--editor-text-muted)' }}
                    >
                      Adjustments
                    </span>
                  </div>
                  {flattenAdjustments(message.adjustments).map((param) => (
                    <InlineSlider
                      key={param.path.join('.')}
                      label={param.label}
                      value={param.value}
                      path={param.path}
                      paramKey={param.key}
                      onChange={updateParameter}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <p className="text-xs py-2" style={{ color: 'var(--editor-error, #ef4444)' }}>
          {error}
        </p>
      )}

      {/* Input area */}
      <div className="flex-shrink-0 pt-3 space-y-2" style={{ borderTop: '1px solid var(--editor-border)' }}>
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
            style={{
              backgroundColor: 'var(--editor-accent)',
              color: 'white',
            }}
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

// Inline slider component for adjustment cards
interface InlineSliderProps {
  label: string;
  value: number;
  path: string[];
  paramKey: string;
  onChange: (path: string[], value: number) => void;
}

function InlineSlider({ label, value, path, paramKey, onChange }: InlineSliderProps) {
  const [localValue, setLocalValue] = useState(value);
  const config = getSliderConfig(paramKey);

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: number) => {
    setLocalValue(newValue);
    onChange(path, newValue);
  };

  const displayValue =
    config.step < 1 ? localValue.toFixed(1) : localValue.toFixed(0);

  const isPositive = localValue > 0;
  const prefix = isPositive ? '+' : '';

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs" style={{ color: 'var(--editor-text-secondary)' }}>
          {label}
        </span>
        <span
          className="text-xs tabular-nums font-medium"
          style={{ color: 'var(--editor-text-primary)' }}
        >
          {prefix}{displayValue}
        </span>
      </div>
      <Slider
        value={[localValue]}
        min={config.min}
        max={config.max}
        step={config.step}
        onValueChange={([v]) => handleChange(v)}
        className="w-full"
      />
    </div>
  );
}

// Deep merge utility
function deepMerge<T>(target: T, source: Record<string, unknown>): T {
  const result = { ...target } as Record<string, unknown>;
  const targetRecord = target as Record<string, unknown>;

  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = targetRecord[key];

    if (
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>
      );
    } else {
      result[key] = sourceVal;
    }
  }

  return result as T;
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
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
