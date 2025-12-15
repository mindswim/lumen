'use client';

import { useRouter } from 'next/navigation';
import { useEditorStore } from '@/lib/editor/state';

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}

function ToolButton({ icon, label, onClick, disabled, active }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`
        w-10 h-10 flex items-center justify-center rounded-lg transition-colors
        ${active ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : ''}
      `}
    >
      {icon}
    </button>
  );
}

// SVG Icons
const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const UndoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7v6h6" />
    <path d="M3 13a9 9 0 1 0 3-7.7L3 7" />
  </svg>
);

const RedoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 7v6h-6" />
    <path d="M21 13a9 9 0 1 1-3-7.7L21 7" />
  </svg>
);

const ResetIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const CropIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 2v4h12v12h4" />
    <path d="M6 18H2" />
    <path d="M18 6V2" />
    <rect x="6" y="6" width="12" height="12" />
  </svg>
);

const CopyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const PasteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" />
  </svg>
);

const CompareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="12" y1="3" x2="12" y2="21" />
  </svg>
);

const ExportIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17,8 12,3 7,8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

interface ToolSidebarProps {
  onExport: () => void;
}

export function ToolSidebar({ onExport }: ToolSidebarProps) {
  const router = useRouter();
  const { undo, redo, canUndo, canRedo, resetEditState, copySettings, pasteSettings, hasCopiedSettings, historyIndex, history } = useEditorStore();
  const isCropping = useEditorStore((state) => state.isCropping);
  const setIsCropping = useEditorStore((state) => state.setIsCropping);
  const comparisonMode = useEditorStore((state) => state.comparisonMode);
  const setComparisonMode = useEditorStore((state) => state.setComparisonMode);
  const image = useEditorStore((state) => state.image);

  const toggleComparison = () => {
    if (comparisonMode === 'off') {
      setComparisonMode('hold');
    } else {
      setComparisonMode('off');
    }
  };

  return (
    <aside className="w-14 bg-neutral-900 border-r border-neutral-800 flex flex-col items-center py-3">
      {/* Top section */}
      <div className="flex flex-col items-center gap-1">
        <ToolButton
          icon={<BackIcon />}
          label="Back to Home"
          onClick={() => router.push('/')}
        />
      </div>

      {/* Divider */}
      <div className="w-6 h-px bg-neutral-700 my-3" />

      {/* History */}
      <div className="flex flex-col items-center gap-1">
        <ToolButton
          icon={<UndoIcon />}
          label={`Undo (Cmd+Z)${history.length > 0 ? ` - ${historyIndex + 1}/${history.length}` : ''}`}
          onClick={undo}
          disabled={!canUndo()}
        />
        <ToolButton
          icon={<RedoIcon />}
          label="Redo (Cmd+Shift+Z)"
          onClick={redo}
          disabled={!canRedo()}
        />
        <ToolButton
          icon={<ResetIcon />}
          label="Reset All"
          onClick={resetEditState}
        />
      </div>

      {/* Divider */}
      <div className="w-6 h-px bg-neutral-700 my-3" />

      {/* Tools */}
      <div className="flex flex-col items-center gap-1">
        <ToolButton
          icon={<CropIcon />}
          label="Crop & Transform"
          onClick={() => setIsCropping(!isCropping)}
          active={isCropping}
        />
        <ToolButton
          icon={<CopyIcon />}
          label="Copy Settings (Cmd+C)"
          onClick={copySettings}
          disabled={!image}
        />
        <ToolButton
          icon={<PasteIcon />}
          label="Paste Settings (Cmd+V)"
          onClick={pasteSettings}
          disabled={!image || !hasCopiedSettings()}
        />
        <ToolButton
          icon={<CompareIcon />}
          label="Compare (Hold Space)"
          onClick={toggleComparison}
          active={comparisonMode !== 'off'}
          disabled={!image}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom section */}
      <div className="flex flex-col items-center gap-1">
        <ToolButton
          icon={<ExportIcon />}
          label="Export (Cmd+E)"
          onClick={onExport}
          disabled={!image}
        />
      </div>
    </aside>
  );
}
