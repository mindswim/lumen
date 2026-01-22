'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useEditorStore } from '@/lib/editor/state';
import { useGalleryStore } from '@/lib/gallery/store';
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

const ALL_PARAMETERS: readonly string[] = Object.values(PARAMETER_CATEGORIES).flat();

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

function getSliderConfig(key: string): { min: number; max: number; step: number; default: number } {
  const baseKey = key.split('.')[0];
  const preset = sliderPresets[baseKey as keyof typeof sliderPresets];
  if (preset) {
    return { min: preset.min, max: preset.max, step: preset.step, default: preset.defaultValue };
  }
  if (baseKey === 'exposure') return { min: -5, max: 5, step: 0.1, default: 0 };
  return { min: -100, max: 100, step: 1, default: 0 };
}

function getNestedValue(obj: Record<string, unknown>, path: string): number {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') return 0;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'number' ? current : 0;
}

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

function extractChangedParams(adjustments: Partial<EditState>): Map<string, number> {
  const changes = new Map<string, number>();
  function recurse(obj: Record<string, unknown>, prefix: string = '') {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'number') {
        const isKnown = ALL_PARAMETERS.includes(path) || ALL_PARAMETERS.some(p => p.startsWith(path + '.'));
        if (isKnown || !path.includes('.')) changes.set(path, value);
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

  const { selectedIds, images: galleryImages, updateImageEditState } = useGalleryStore();

  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [trackedAdjustments, setTrackedAdjustments] = useState<Map<string, TrackedAdjustment>>(new Map());
  const [isTrayExpanded, setIsTrayExpanded] = useState(true);
  const [showAddParam, setShowAddParam] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isGalleryMode = !image && selectedIds.length > 0;
  const hasImage = !!image || selectedIds.length > 0;
  const defaultState = useMemo(() => createDefaultEditState(), []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [prompt, adjustTextareaHeight]);

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
    setTrackedAdjustments((prev) => {
      const updated = new Map(prev);
      const existing = updated.get(path);
      if (existing) updated.set(path, { ...existing, currentValue: value });
      return updated;
    });
  };

  const addParameter = (path: string) => {
    const currentValue = getNestedValue(editState as unknown as Record<string, unknown>, path);
    const originalValue = getNestedValue(defaultState as unknown as Record<string, unknown>, path);
    setTrackedAdjustments((prev) => {
      const updated = new Map(prev);
      if (!updated.has(path)) updated.set(path, { path, originalValue, currentValue });
      return updated;
    });
    setShowAddParam(false);
  };

  const removeParameter = (path: string) => {
    setTrackedAdjustments((prev) => {
      const updated = new Map(prev);
      updated.delete(path);
      return updated;
    });
  };

  const applyAndTrackAdjustments = (adjustments: Partial<EditState>) => {
    const changes = extractChangedParams(adjustments);
    setTrackedAdjustments((prev) => {
      const updated = new Map(prev);
      changes.forEach((value, path) => {
        const existing = updated.get(path);
        const originalValue = existing?.originalValue ?? getNestedValue(defaultState as unknown as Record<string, unknown>, path);
        updated.set(path, { path, originalValue, currentValue: value });
      });
      return updated;
    });

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

  const handleReset = () => {
    trackedAdjustments.forEach((adj) => updateParameter(adj.path, adj.originalValue));
    setTrackedAdjustments(new Map());
  };

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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
      const conversationHistory = messages.map((m) => ({ role: m.role, content: m.content }));
      const response = await fetch('/api/ai/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt, currentState: editState, conversationHistory }),
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setError(null);
  };

  const suggestions = ['warmer', 'cooler', 'film look', 'cinematic', 'more contrast', 'softer'];

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--editor-bg-primary)' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3">
        <button
          onClick={handleAutoEnhance}
          disabled={!hasImage || isLoading}
          className="w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg, var(--editor-accent) 0%, color-mix(in srgb, var(--editor-accent) 80%, purple) 100%)',
            color: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <SparklesIcon />
          Auto-Enhance
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3 min-h-0">
        {messages.length === 0 && !isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--editor-bg-secondary)' }}
            >
              <SparklesIcon size={24} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--editor-text-primary)' }}>
              AI Photo Editor
            </p>
            <p className="text-xs max-w-[200px]" style={{ color: 'var(--editor-text-muted)' }}>
              Describe how you want to edit your photo in natural language
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && <ThinkingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="px-4 py-2">
          <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
            {error}
          </p>
        </div>
      )}

      {/* Adjustments Tray */}
      {trackedAdjustments.size > 0 && (
        <div className="flex-shrink-0 mx-4 mb-3 rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--editor-bg-secondary)', border: '1px solid var(--editor-border)' }}>
          <div
            className="px-3 py-2 flex items-center justify-between cursor-pointer"
            onClick={() => setIsTrayExpanded(!isTrayExpanded)}
          >
            <span className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--editor-text-secondary)' }}>
              <ChevronIcon expanded={isTrayExpanded} />
              {trackedAdjustments.size} adjustment{trackedAdjustments.size !== 1 ? 's' : ''}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleReset(); }}
              className="text-xs px-2 py-0.5 rounded-md transition-colors"
              style={{ color: 'var(--editor-text-muted)' }}
            >
              Reset
            </button>
          </div>

          {isTrayExpanded && (
            <div className="px-3 pb-3 space-y-2.5 max-h-40 overflow-y-auto">
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

              <div className="relative pt-1">
                <button
                  onClick={() => setShowAddParam(!showAddParam)}
                  className="w-full py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                  style={{ color: 'var(--editor-text-muted)', border: '1px dashed var(--editor-border)' }}
                >
                  <PlusIcon /> Add
                </button>

                {showAddParam && (
                  <div
                    className="absolute bottom-full left-0 right-0 mb-1 rounded-lg shadow-xl overflow-hidden z-10 max-h-48 overflow-y-auto"
                    style={{ backgroundColor: 'var(--editor-bg-primary)', border: '1px solid var(--editor-border)' }}
                  >
                    {Object.entries(PARAMETER_CATEGORIES).map(([category, params]) => {
                      const available = params.filter((p) => !trackedAdjustments.has(p));
                      if (available.length === 0) return null;
                      return (
                        <div key={category}>
                          <div className="px-3 py-1.5 text-xs font-medium" style={{ backgroundColor: 'var(--editor-bg-secondary)', color: 'var(--editor-text-muted)' }}>
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
      <div className="flex-shrink-0 px-4 pb-4">
        <div
          className="rounded-xl overflow-hidden transition-shadow focus-within:ring-2 focus-within:ring-offset-1"
          style={{
            backgroundColor: 'var(--editor-bg-secondary)',
            border: '1px solid var(--editor-border)',
            '--tw-ring-color': 'var(--editor-accent)',
            '--tw-ring-offset-color': 'var(--editor-bg-primary)',
          } as React.CSSProperties}
        >
          <div className="flex items-end gap-2 p-2">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasImage ? 'Describe your edit...' : 'Load an image first'}
              disabled={!hasImage || isLoading}
              rows={1}
              className="flex-1 px-2 py-1.5 text-sm resize-none bg-transparent outline-none disabled:opacity-50"
              style={{ color: 'var(--editor-text-primary)', minHeight: '36px', maxHeight: '120px' }}
            />
            <button
              onClick={() => handleSubmit()}
              disabled={!prompt.trim() || !hasImage || isLoading}
              className="p-2 rounded-lg transition-all disabled:opacity-30 flex-shrink-0"
              style={{ backgroundColor: prompt.trim() ? 'var(--editor-accent)' : 'transparent', color: prompt.trim() ? 'white' : 'var(--editor-text-muted)' }}
            >
              <ArrowUpIcon />
            </button>
          </div>
        </div>

        {/* Suggestions */}
        <div className="flex gap-1.5 flex-wrap mt-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setPrompt(s)}
              disabled={!hasImage}
              className="px-2.5 py-1 rounded-full text-xs transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--editor-bg-secondary)', color: 'var(--editor-text-muted)', border: '1px solid var(--editor-border)' }}
            >
              {s}
            </button>
          ))}
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="w-full mt-2 text-xs py-1 transition-colors"
            style={{ color: 'var(--editor-text-muted)' }}
          >
            Clear conversation
          </button>
        )}
      </div>
    </div>
  );
}

// Message bubble component
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${isUser ? 'rounded-br-md' : 'rounded-bl-md'}`}
        style={{
          backgroundColor: isUser ? 'var(--editor-accent)' : 'var(--editor-bg-secondary)',
          color: isUser ? 'white' : 'var(--editor-text-primary)',
        }}
      >
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1">
            <SparklesIcon size={12} />
            <span className="text-xs font-medium" style={{ color: 'var(--editor-text-muted)' }}>AI</span>
          </div>
        )}
        <p className="text-sm leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}

// Thinking indicator
function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className="rounded-2xl rounded-bl-md px-4 py-3"
        style={{ backgroundColor: 'var(--editor-bg-secondary)' }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <SparklesIcon size={12} />
          <span className="text-xs font-medium" style={{ color: 'var(--editor-text-muted)' }}>AI</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="thinking-dot" style={{ animationDelay: '0ms' }} />
          <span className="thinking-dot" style={{ animationDelay: '150ms' }} />
          <span className="thinking-dot" style={{ animationDelay: '300ms' }} />
        </div>
        <style jsx>{`
          .thinking-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: var(--editor-text-muted);
            animation: thinking 1.4s ease-in-out infinite;
          }
          @keyframes thinking {
            0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
            40% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    </div>
  );
}

// Delta Slider
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

  useEffect(() => { setLocalValue(currentValue); }, [currentValue]);

  const handleChange = (value: number) => {
    setLocalValue(value);
    onChange(value);
  };

  const displayValue = config.step < 1 ? localValue.toFixed(1) : localValue.toFixed(0);
  const prefix = localValue > 0 ? '+' : '';
  const delta = localValue - originalValue;
  const deltaDisplay = delta !== 0 ? ` (${delta > 0 ? '+' : ''}${config.step < 1 ? delta.toFixed(1) : delta.toFixed(0)})` : '';

  const range = config.max - config.min;
  const originalPercent = ((originalValue - config.min) / range) * 100;
  const currentPercent = ((localValue - config.min) / range) * 100;
  const deltaStart = Math.min(originalPercent, currentPercent);
  const deltaWidth = Math.abs(currentPercent - originalPercent);
  const isIncrease = localValue > originalValue;

  return (
    <div className="space-y-1 group">
      <div className="flex justify-between items-center">
        <span className="text-xs" style={{ color: 'var(--editor-text-secondary)' }}>{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums" style={{ color: 'var(--editor-text-primary)' }}>
            {prefix}{displayValue}
            <span style={{ color: 'var(--editor-text-muted)' }}>{deltaDisplay}</span>
          </span>
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
            style={{ color: 'var(--editor-text-muted)' }}
          >
            <XIcon />
          </button>
        </div>
      </div>
      <div className="relative h-5">
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
        {delta !== 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full pointer-events-none"
            style={{ left: `${originalPercent}%`, backgroundColor: 'var(--editor-text-muted)', opacity: 0.5 }}
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
function SparklesIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z" />
      <path d="M19 11l1 2 1-2 2-1-2-1-1-2-1 2-2 1 2 1z" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`}>
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
