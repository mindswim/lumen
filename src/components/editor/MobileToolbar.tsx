'use client';

import { useEditorStore } from '@/lib/editor/state';
import { Crop, Download, PlusCircle, SlidersHorizontal, Sparkles, SwatchBook } from 'lucide-react';

export type MobilePanelType = 'presets' | 'tune' | 'ai' | 'transform';

interface MobileToolbarProps {
  mode: 'gallery' | 'editor';
  onOpenPanel: (panel: MobilePanelType) => void;
  activePanel: MobilePanelType | null;
  onExport?: () => void;
  onAddPhotos?: () => void;
}

function ToolbarButton({
  icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 transition-colors ${disabled ? 'opacity-30' : ''}`}
      style={{
        color: active ? 'var(--editor-text-primary)' : 'var(--editor-text-tertiary)',
        backgroundColor: active ? 'var(--editor-bg-active)' : 'transparent',
      }}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export function MobileToolbar({ mode, onOpenPanel, activePanel, onExport, onAddPhotos }: MobileToolbarProps) {
  const image = useEditorStore((state) => state.image);

  return (
    <nav
      aria-label={mode === 'editor' ? 'Editor tools' : 'Library tools'}
      className="fixed inset-x-0 bottom-0 z-40 px-2 pt-1 pb-[max(.5rem,env(safe-area-inset-bottom))]"
      style={{ backgroundColor: 'color-mix(in srgb, var(--editor-bg-primary) 94%, transparent)', borderTop: '1px solid var(--editor-border)', backdropFilter: 'blur(18px)' }}
    >
      <div className="mx-auto flex max-w-lg items-center gap-1">
        {mode === 'gallery' && (
          <ToolbarButton icon={<PlusCircle className="h-5 w-5" />} label="Add" onClick={onAddPhotos} />
        )}
        <ToolbarButton icon={<SwatchBook className="h-5 w-5" />} label="Looks" onClick={() => onOpenPanel('presets')} active={activePanel === 'presets'} />
        <ToolbarButton icon={<SlidersHorizontal className="h-5 w-5" />} label="Tune" onClick={() => onOpenPanel('tune')} active={activePanel === 'tune'} />
        <ToolbarButton icon={<Sparkles className="h-5 w-5" />} label="AI" onClick={() => onOpenPanel('ai')} active={activePanel === 'ai'} />
        {mode === 'editor' && (
          <ToolbarButton icon={<Crop className="h-5 w-5" />} label="Crop" onClick={() => onOpenPanel('transform')} active={activePanel === 'transform'} />
        )}
        {mode === 'editor' && (
          <ToolbarButton icon={<Download className="h-5 w-5" />} label="Export" onClick={onExport} disabled={!image} />
        )}
      </div>
    </nav>
  );
}
