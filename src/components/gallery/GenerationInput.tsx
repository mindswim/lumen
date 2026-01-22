'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useGalleryStore } from '@/lib/gallery/store';

type ImageSize = 'square' | 'landscape_4_3' | 'landscape_16_9' | 'portrait_4_3' | 'portrait_16_9';

const SIZE_OPTIONS: { value: ImageSize; label: string; icon: React.ReactNode }[] = [
  { value: 'landscape_4_3', label: '4:3', icon: <RatioIcon w={16} h={12} /> },
  { value: 'landscape_16_9', label: '16:9', icon: <RatioIcon w={16} h={9} /> },
  { value: 'square', label: '1:1', icon: <RatioIcon w={12} h={12} /> },
  { value: 'portrait_4_3', label: '3:4', icon: <RatioIcon w={12} h={16} /> },
  { value: 'portrait_16_9', label: '9:16', icon: <RatioIcon w={9} h={16} /> },
];

function RatioIcon({ w, h }: { w: number; h: number }) {
  const scale = 14 / Math.max(w, h);
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect
        x={(20 - w * scale) / 2}
        y={(20 - h * scale) / 2}
        width={w * scale}
        height={h * scale}
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

export function GenerationInput() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize>('landscape_4_3');
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sizeMenuRef = useRef<HTMLDivElement>(null);

  const addImageFromUrl = useGalleryStore((state) => state.addImageFromUrl);

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

  // Close size menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sizeMenuRef.current && !sizeMenuRef.current.contains(e.target as Node)) {
        setShowSizeMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          model: 'schnell',
          imageSize,
          numImages: 1,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Generation failed');
      }

      const result = await response.json();

      // Add each generated image to the gallery
      for (const image of result.images) {
        const timestamp = Date.now();
        const fileName = `generated-${timestamp}.png`;
        await addImageFromUrl(image.url, fileName);
      }

      // Clear prompt on success
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

  const currentSize = SIZE_OPTIONS.find((s) => s.value === imageSize);

  return (
    <div className="px-4 md:px-6 py-4">
      <div
        className="max-w-2xl mx-auto rounded-xl overflow-hidden transition-shadow focus-within:ring-2 focus-within:ring-offset-1"
        style={{
          backgroundColor: 'var(--editor-bg-secondary)',
          border: '1px solid var(--editor-border)',
          '--tw-ring-color': 'var(--editor-accent)',
          '--tw-ring-offset-color': 'var(--editor-canvas-bg)',
        } as React.CSSProperties}
      >
        <div className="flex items-end gap-2 p-3">
          {/* Size selector */}
          <div className="relative" ref={sizeMenuRef}>
            <button
              onClick={() => setShowSizeMenu(!showSizeMenu)}
              className="p-2 rounded-lg transition-colors flex-shrink-0"
              style={{
                backgroundColor: showSizeMenu ? 'var(--editor-bg-tertiary)' : 'transparent',
                color: 'var(--editor-text-muted)',
              }}
              title={`Aspect ratio: ${currentSize?.label}`}
            >
              {currentSize?.icon}
            </button>

            {showSizeMenu && (
              <div
                className="absolute bottom-full left-0 mb-2 rounded-lg shadow-xl overflow-hidden z-10"
                style={{
                  backgroundColor: 'var(--editor-bg-primary)',
                  border: '1px solid var(--editor-border)',
                }}
              >
                {SIZE_OPTIONS.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => {
                      setImageSize(size.value);
                      setShowSizeMenu(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 w-full transition-colors"
                    style={{
                      backgroundColor: imageSize === size.value ? 'var(--editor-bg-secondary)' : 'transparent',
                      color: imageSize === size.value ? 'var(--editor-text-primary)' : 'var(--editor-text-muted)',
                    }}
                  >
                    {size.icon}
                    <span className="text-sm">{size.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Prompt input */}
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the image you want to create..."
            disabled={isGenerating}
            rows={1}
            className="flex-1 px-2 py-2 text-sm resize-none bg-transparent outline-none disabled:opacity-50"
            style={{
              color: 'var(--editor-text-primary)',
              minHeight: '40px',
              maxHeight: '120px',
            }}
          />

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
            style={{
              backgroundColor: prompt.trim() ? 'var(--editor-accent)' : 'var(--editor-bg-tertiary)',
              color: prompt.trim() ? 'white' : 'var(--editor-text-muted)',
            }}
          >
            {isGenerating ? (
              <>
                <LoadingSpinner />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <SparklesIcon />
                <span>Create</span>
              </>
            )}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div
            className="px-4 py-2 text-sm"
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
