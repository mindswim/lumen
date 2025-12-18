'use client';

import { useState } from 'react';
import { AdjustPanel } from './AdjustPanel';
import { CurvePanel } from './CurvePanel';
import { HSLPanel } from './HSLPanel';
import { EffectsPanel } from './EffectsPanel';
import { DetailPanel } from './DetailPanel';
import { PresetPanel } from './PresetPanel';
import { MaskPanel } from './MaskPanel';
import { TransformPanel } from './TransformPanel';

type PanelType = 'presets' | 'tools' | 'hsl' | 'effects' | 'export';

// Tab icons
const PresetsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const ToolsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v2m0 16v2M2 12h2m16 0h2" />
    <path d="m4.93 4.93 1.41 1.41m11.32 11.32 1.41 1.41M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" />
  </svg>
);

const HSLIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    <circle cx="12" cy="12" r="4" />
  </svg>
);

const EffectsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a10 10 0 0 0 0 20" fill="currentColor" opacity="0.3" />
  </svg>
);

const ExportIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17,8 12,3 7,8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

interface TabButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function TabButton({ icon, label, active, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`
        w-10 h-10 flex items-center justify-center transition-colors
        ${active ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}
      `}
    >
      {icon}
    </button>
  );
}

const PANEL_TITLES: Record<PanelType, string> = {
  presets: 'Presets',
  tools: 'Tools',
  hsl: 'HSL',
  effects: 'Effects',
  export: 'Export',
};

export function Sidebar() {
  const [activePanel, setActivePanel] = useState<PanelType>('presets');

  return (
    <aside className="w-80 bg-neutral-950 border-l border-neutral-800 flex h-full overflow-hidden">
      {/* Panel content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-neutral-800 flex-shrink-0">
          <h2 className="text-sm font-medium text-white">{PANEL_TITLES[activePanel]}</h2>
          <button className="text-neutral-500 hover:text-neutral-300">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
        </div>

        {/* Panel content area */}
        <div className="flex-1 overflow-y-auto">
          {activePanel === 'presets' && <PresetPanel />}
          {activePanel === 'tools' && (
            <div className="space-y-0">
              <AdjustPanel />
              <DetailPanel />
              <CurvePanel />
              <TransformPanel />
            </div>
          )}
          {activePanel === 'hsl' && <HSLPanel />}
          {activePanel === 'effects' && (
            <div className="space-y-0">
              <EffectsPanel />
              <MaskPanel />
            </div>
          )}
          {activePanel === 'export' && (
            <div className="p-4 text-neutral-400 text-sm">
              Use the export button in the toolbar or press Cmd+E
            </div>
          )}
        </div>
      </div>

      {/* Tab icons on right edge */}
      <div className="w-12 bg-neutral-950 border-l border-neutral-800 flex flex-col items-center py-2">
        <TabButton
          icon={<PresetsIcon />}
          label="Presets"
          active={activePanel === 'presets'}
          onClick={() => setActivePanel('presets')}
        />
        <TabButton
          icon={<ToolsIcon />}
          label="Tools"
          active={activePanel === 'tools'}
          onClick={() => setActivePanel('tools')}
        />
        <TabButton
          icon={<HSLIcon />}
          label="HSL"
          active={activePanel === 'hsl'}
          onClick={() => setActivePanel('hsl')}
        />
        <TabButton
          icon={<EffectsIcon />}
          label="Effects"
          active={activePanel === 'effects'}
          onClick={() => setActivePanel('effects')}
        />
        <div className="flex-1" />
        <TabButton
          icon={<ExportIcon />}
          label="Export"
          active={activePanel === 'export'}
          onClick={() => setActivePanel('export')}
        />
      </div>
    </aside>
  );
}
