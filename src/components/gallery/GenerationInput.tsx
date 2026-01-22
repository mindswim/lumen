'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useGalleryStore } from '@/lib/gallery/store';

type ImageSize = 'square' | 'landscape_4_3' | 'landscape_16_9' | 'portrait_4_3' | 'portrait_16_9';
type FluxModel = 'schnell' | 'dev' | 'pro';

const SIZE_OPTIONS: { value: ImageSize; label: string }[] = [
  { value: 'landscape_4_3', label: '4:3' },
  { value: 'landscape_16_9', label: '16:9' },
  { value: 'square', label: '1:1' },
  { value: 'portrait_4_3', label: '3:4' },
  { value: 'portrait_16_9', label: '9:16' },
];

const MODEL_OPTIONS: { value: FluxModel; label: string; description: string }[] = [
  { value: 'schnell', label: 'Fast', description: 'Quick generation' },
  { value: 'dev', label: 'Quality', description: 'Better details' },
  { value: 'pro', label: 'Pro', description: 'Best quality' },
];

export function GenerationInput() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize>('landscape_4_3');
  const [model, setModel] = useState<FluxModel>('schnell');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addImageFromUrl = useGalleryStore((state) => state.addImageFromUrl);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [prompt, adjustTextareaHeight]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model,
          imageSize,
          numImages: 1,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Generation failed');
      }

      const result = await response.json();

      for (const image of result.images) {
        const timestamp = Date.now();
        const fileName = `generated-${timestamp}.png`;
        await addImageFromUrl(image.url, fileName);
      }

      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="px-4 md:px-6 pt-4 pb-2">
      <div className="max-w-2xl mx-auto space-y-3">
        {/* Main input */}
        <div
          className="rounded-xl overflow-hidden transition-all focus-within:ring-2 focus-within:ring-offset-2"
          style={{
            backgroundColor: 'var(--editor-bg-secondary)',
            border: '1px solid var(--editor-border)',
            '--tw-ring-color': 'var(--editor-accent)',
            '--tw-ring-offset-color': 'var(--editor-canvas-bg)',
          } as React.CSSProperties}
        >
          <div className="flex items-end">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the image you want to create..."
              disabled={isGenerating}
              rows={1}
              className="flex-1 px-4 py-3 text-sm resize-none bg-transparent outline-none disabled:opacity-50"
              style={{
                color: 'var(--editor-text-primary)',
                minHeight: '48px',
                maxHeight: '100px',
              }}
            />
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="m-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
              style={{
                backgroundColor: 'var(--editor-accent)',
                color: 'white',
              }}
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner />
                  <span>Creating</span>
                </>
              ) : (
                <>
                  <SparklesIcon />
                  <span>Create</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Settings row */}
        <div className="flex items-center justify-center gap-6">
          {/* Model selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: 'var(--editor-text-muted)' }}>Model</span>
            <div
              className="flex rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--editor-border)' }}
            >
              {MODEL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setModel(option.value)}
                  className="px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: model === option.value ? 'var(--editor-accent)' : 'var(--editor-bg-secondary)',
                    color: model === option.value ? 'white' : 'var(--editor-text-muted)',
                  }}
                  title={option.description}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-4" style={{ backgroundColor: 'var(--editor-border)' }} />

          {/* Size selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: 'var(--editor-text-muted)' }}>Size</span>
            <div
              className="flex rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--editor-border)' }}
            >
              {SIZE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setImageSize(option.value)}
                  className="px-2.5 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: imageSize === option.value ? 'var(--editor-accent)' : 'var(--editor-bg-secondary)',
                    color: imageSize === option.value ? 'white' : 'var(--editor-text-muted)',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            className="text-center text-sm py-2 rounded-lg"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
