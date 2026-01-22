'use client';

import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '@/lib/editor/state';
import { useGalleryStore } from '@/lib/gallery/store';
import { PanelSection, PanelContainer, PanelDivider, PanelHint } from '@/components/ui/panel-section';
import { EditState, ensureCompleteEditState } from '@/types/editor';

interface AIEdit {
  id: string;
  prompt: string;
  adjustments: Partial<EditState>;
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
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentEdits, setRecentEdits] = useState<AIEdit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine mode
  const isGalleryMode = !image && selectedIds.length > 0;
  const hasImage = !!image || selectedIds.length > 0;

  // Apply adjustments to current image(s)
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

    setIsEnhancing(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // For now, send current state - later we can add histogram
          currentState: editState,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to enhance image');
      }

      const data = await response.json();
      applyAdjustments(data.adjustments);

      // Add to recent edits
      setRecentEdits((prev) => [
        {
          id: `edit-${Date.now()}`,
          prompt: 'Auto-Enhance',
          adjustments: data.adjustments,
          timestamp: Date.now(),
        },
        ...prev.slice(0, 9), // Keep last 10
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enhancement failed');
    } finally {
      setIsEnhancing(false);
    }
  };

  // Natural language edit handler
  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !hasImage) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          currentState: editState,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process edit');
      }

      const data = await response.json();
      applyAdjustments(data.adjustments);

      // Add to recent edits
      setRecentEdits((prev) => [
        {
          id: `edit-${Date.now()}`,
          prompt: prompt.trim(),
          adjustments: data.adjustments,
          timestamp: Date.now(),
        },
        ...prev.slice(0, 9),
      ]);

      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Edit failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Re-apply a recent edit
  const handleReapplyEdit = (edit: AIEdit) => {
    applyAdjustments(edit.adjustments);
  };

  return (
    <PanelContainer>
      {/* Quick Actions */}
      <PanelSection title="Quick Actions">
        <button
          onClick={handleAutoEnhance}
          disabled={!hasImage || isEnhancing}
          className="w-full py-3 px-4 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'var(--editor-accent)',
            color: 'white',
          }}
        >
          {isEnhancing ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner />
              Analyzing...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <SparklesIcon />
              Auto-Enhance
            </span>
          )}
        </button>
        <PanelHint>
          Automatically optimize exposure, contrast, and color balance
        </PanelHint>
      </PanelSection>

      <PanelDivider />

      {/* Natural Language Input */}
      <PanelSection title="Describe Your Edit">
        <form onSubmit={handlePromptSubmit} className="space-y-3">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., make it warmer with a film look"
              disabled={!hasImage || isLoading}
              className="w-full py-2.5 px-3 pr-10 rounded-lg text-sm transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'var(--editor-bg-secondary)',
                color: 'var(--editor-text-primary)',
                border: '1px solid var(--editor-border)',
              }}
            />
            <button
              type="submit"
              disabled={!prompt.trim() || !hasImage || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded transition-colors disabled:opacity-30"
              style={{ color: 'var(--editor-accent)' }}
            >
              {isLoading ? <LoadingSpinner /> : <SendIcon />}
            </button>
          </div>
        </form>

        {error && (
          <p className="text-xs mt-2" style={{ color: 'var(--editor-error, #ef4444)' }}>
            {error}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {['warmer', 'cooler', 'more contrast', 'film look', 'cinematic'].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setPrompt(suggestion)}
              disabled={!hasImage}
              className="px-2.5 py-1 rounded-full text-xs transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'var(--editor-bg-tertiary)',
                color: 'var(--editor-text-secondary)',
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </PanelSection>

      {recentEdits.length > 0 && (
        <>
          <PanelDivider />

          {/* Recent AI Edits */}
          <PanelSection title="Recent AI Edits">
            <div className="space-y-2">
              {recentEdits.map((edit) => (
                <div
                  key={edit.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg"
                  style={{ backgroundColor: 'var(--editor-bg-secondary)' }}
                >
                  <span
                    className="text-sm truncate flex-1"
                    style={{ color: 'var(--editor-text-primary)' }}
                  >
                    {edit.prompt}
                  </span>
                  <button
                    onClick={() => handleReapplyEdit(edit)}
                    className="ml-2 px-2 py-1 rounded text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: 'var(--editor-bg-tertiary)',
                      color: 'var(--editor-text-secondary)',
                    }}
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>
          </PanelSection>
        </>
      )}

      {!hasImage && (
        <div className="mt-6 py-8 text-center">
          <p className="text-sm" style={{ color: 'var(--editor-text-muted)' }}>
            Load an image to use AI features
          </p>
        </div>
      )}
    </PanelContainer>
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
