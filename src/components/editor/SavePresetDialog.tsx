'use client';

import { useState } from 'react';

interface SavePresetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

export function SavePresetDialog({ isOpen, onClose, onSave }: SavePresetDialogProps) {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
      setName('');
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        className="rounded-lg shadow-xl w-full max-w-sm p-6"
        style={{ backgroundColor: 'var(--editor-bg-primary)', border: '1px solid var(--editor-border)' }}
      >
        <h2 className="text-lg font-medium mb-4" style={{ color: 'var(--editor-text-primary)' }}>Save Preset</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="preset-name"
              className="block text-sm mb-2"
              style={{ color: 'var(--editor-text-muted)' }}
            >
              Preset Name
            </label>
            <input
              id="preset-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Custom Preset"
              autoFocus
              className="w-full px-3 py-2 rounded-lg focus:outline-none"
              style={{
                backgroundColor: 'var(--editor-bg-tertiary)',
                border: '1px solid var(--editor-border)',
                color: 'var(--editor-text-primary)'
              }}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm transition-colors"
              style={{ color: 'var(--editor-text-muted)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: 'var(--editor-accent)', color: 'var(--editor-accent-foreground)' }}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
