'use client';

import { useState, useRef } from 'react';
import { useEditorStore } from '@/lib/editor/state';
import { EditState } from '@/types/editor';

interface DevDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function DevDrawer({ isOpen, onToggle }: DevDrawerProps) {
  const editState = useEditorStore((state) => state.editState);
  const setEditState = useEditorStore((state) => state.setEditState);
  const pushHistory = useEditorStore((state) => state.pushHistory);
  const showToast = useEditorStore((state) => state.showToast);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [jsonValue, setJsonValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sync textarea with editState when drawer opens
  const formattedJson = JSON.stringify(editState, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedJson);
      showToast('Copied to clipboard');
    } catch {
      showToast('Failed to copy');
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJsonValue(text);
      setError(null);
    } catch {
      showToast('Failed to paste');
    }
  };

  const handleApply = () => {
    try {
      const parsed = JSON.parse(jsonValue || formattedJson) as EditState;
      pushHistory();
      setEditState(parsed);
      setError(null);
      showToast('Edit state applied');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="flex flex-col"
      style={{
        borderTop: '1px solid var(--editor-border)',
        backgroundColor: 'var(--editor-bg-secondary)',
        maxHeight: '300px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium" style={{ color: 'var(--editor-text-muted)' }}>
          Edit State JSON
        </span>
        <div className="flex gap-1">
          <button
            onClick={handleCopy}
            className="px-2 py-1 text-xs rounded transition-colors"
            style={{ color: 'var(--editor-text-muted)' }}
            title="Copy to clipboard"
          >
            Copy
          </button>
          <button
            onClick={handlePaste}
            className="px-2 py-1 text-xs rounded transition-colors"
            style={{ color: 'var(--editor-text-muted)' }}
            title="Paste from clipboard"
          >
            Paste
          </button>
          <button
            onClick={handleApply}
            className="px-2 py-1 text-xs rounded transition-colors"
            style={{ backgroundColor: 'var(--editor-accent)', color: 'var(--editor-accent-foreground)' }}
            title="Apply JSON to editor"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-3 pb-2">
          <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
            {error}
          </div>
        </div>
      )}

      {/* JSON textarea */}
      <div className="flex-1 px-3 pb-3 overflow-hidden">
        <textarea
          ref={textareaRef}
          value={jsonValue || formattedJson}
          onChange={(e) => {
            setJsonValue(e.target.value);
            setError(null);
          }}
          className="w-full h-full min-h-[180px] p-2 text-xs font-mono rounded resize-none focus:outline-none"
          style={{
            backgroundColor: 'var(--editor-bg-tertiary)',
            color: 'var(--editor-text-secondary)',
            border: '1px solid var(--editor-border)',
          }}
          spellCheck={false}
        />
      </div>
    </div>
  );
}

// Icon for the dev drawer toggle
export function DevDrawerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
