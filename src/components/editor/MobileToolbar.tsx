'use client';

import { useEditorStore } from '@/lib/editor/state';
import { useGalleryStore } from '@/lib/gallery/store';
import {
  Undo2,
  Redo2,
  Sliders,
  Sparkles,
  Palette,
  Download,
  ArrowLeft,
  PlusCircle,
  Trash2,
  Image,
} from 'lucide-react';

type PanelType = 'presets' | 'tools' | 'hsl' | 'effects';

interface MobileToolbarProps {
  mode: 'gallery' | 'editor';
  onOpenPanel: (panel: PanelType) => void;
  activePanel: PanelType | null;
  onExport?: () => void;
  onBack?: () => void;
  onAddPhotos?: () => void;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}

function ToolbarButton({ icon, label, onClick, active, disabled }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]
        ${active ? 'text-white bg-white/10' : 'text-neutral-400'}
        ${disabled ? 'opacity-30' : 'active:bg-white/5'}
      `}
    >
      {icon}
      <span className="text-[10px]">{label}</span>
    </button>
  );
}

export function MobileToolbar({
  mode,
  onOpenPanel,
  activePanel,
  onExport,
  onBack,
  onAddPhotos,
}: MobileToolbarProps) {
  const { undo, redo, canUndo, canRedo } = useEditorStore();
  const image = useEditorStore((state) => state.image);
  const { selectedIds, removeImages } = useGalleryStore();

  if (mode === 'editor') {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 px-2 py-2 z-40">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <ToolbarButton
            icon={<ArrowLeft className="w-5 h-5" />}
            label="Back"
            onClick={onBack}
          />
          <ToolbarButton
            icon={<Undo2 className="w-5 h-5" />}
            label="Undo"
            onClick={undo}
            disabled={!canUndo()}
          />
          <ToolbarButton
            icon={<Redo2 className="w-5 h-5" />}
            label="Redo"
            onClick={redo}
            disabled={!canRedo()}
          />
          <div className="w-px h-8 bg-neutral-700" />
          <ToolbarButton
            icon={<Image className="w-5 h-5" />}
            label="Presets"
            onClick={() => onOpenPanel('presets')}
            active={activePanel === 'presets'}
          />
          <ToolbarButton
            icon={<Sliders className="w-5 h-5" />}
            label="Tools"
            onClick={() => onOpenPanel('tools')}
            active={activePanel === 'tools'}
          />
          <ToolbarButton
            icon={<Palette className="w-5 h-5" />}
            label="HSL"
            onClick={() => onOpenPanel('hsl')}
            active={activePanel === 'hsl'}
          />
          <ToolbarButton
            icon={<Sparkles className="w-5 h-5" />}
            label="Effects"
            onClick={() => onOpenPanel('effects')}
            active={activePanel === 'effects'}
          />
          <div className="w-px h-8 bg-neutral-700" />
          <ToolbarButton
            icon={<Download className="w-5 h-5" />}
            label="Export"
            onClick={onExport}
            disabled={!image}
          />
        </div>
      </div>
    );
  }

  // Gallery mode
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 px-2 py-2 z-40">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <ToolbarButton
          icon={<PlusCircle className="w-5 h-5" />}
          label="Add"
          onClick={onAddPhotos}
        />
        <ToolbarButton
          icon={<Trash2 className="w-5 h-5" />}
          label="Delete"
          onClick={() => removeImages(selectedIds)}
          disabled={selectedIds.length === 0}
        />
        <div className="w-px h-8 bg-neutral-700" />
        <ToolbarButton
          icon={<Image className="w-5 h-5" />}
          label="Presets"
          onClick={() => onOpenPanel('presets')}
          active={activePanel === 'presets'}
        />
        <ToolbarButton
          icon={<Sliders className="w-5 h-5" />}
          label="Tools"
          onClick={() => onOpenPanel('tools')}
          active={activePanel === 'tools'}
        />
        <ToolbarButton
          icon={<Palette className="w-5 h-5" />}
          label="HSL"
          onClick={() => onOpenPanel('hsl')}
          active={activePanel === 'hsl'}
        />
        <ToolbarButton
          icon={<Sparkles className="w-5 h-5" />}
          label="Effects"
          onClick={() => onOpenPanel('effects')}
          active={activePanel === 'effects'}
        />
        <div className="w-px h-8 bg-neutral-700" />
        <ToolbarButton
          icon={<Download className="w-5 h-5" />}
          label="Export"
          onClick={onExport}
          disabled={selectedIds.length === 0}
        />
      </div>
    </div>
  );
}
