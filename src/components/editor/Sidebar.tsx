'use client';

import { useState, useEffect } from 'react';
import { AdjustPanel } from './AdjustPanel';
import { CurvePanel } from './CurvePanel';
import { HSLPanel } from './HSLPanel';
import { EffectsPanel } from './EffectsPanel';
import { DetailPanel } from './DetailPanel';
import { PresetPanel } from './PresetPanel';
import { MaskPanel } from './MaskPanel';
import { TransformPanel } from './TransformPanel';
import { AIPanel } from './AIPanel';
import { DevDrawer, DevDrawerIcon } from './DevDrawer';
import { useEditorStore } from '@/lib/editor/state';

type PanelType = 'presets' | 'tools' | 'hsl' | 'effects' | 'transform' | 'ai';

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

const TransformIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M6 3H3v3M18 3h3v3M6 21H3v-3M18 21h3v-3" />
    <rect x="6" y="6" width="12" height="12" rx="1" />
  </svg>
);

const AIIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
    <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z" />
    <path d="M19 11l1 2 1-2 2-1-2-1-1-2-1 2-2 1 2 1z" />
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
      className="w-10 h-10 flex items-center justify-center transition-colors"
      style={{
        color: active ? 'var(--editor-text-primary)' : 'var(--editor-text-muted)'
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = 'var(--editor-text-secondary)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = 'var(--editor-text-muted)';
      }}
    >
      {icon}
    </button>
  );
}

const PANEL_TITLES: Record<PanelType, string> = {
  presets: 'Presets',
  tools: 'Adjust',
  hsl: 'HSL',
  effects: 'Effects',
  transform: 'Transform',
  ai: 'AI Assistant',
};

export function Sidebar() {
  const [activePanel, setActivePanel] = useState<PanelType>('presets');
  const [devDrawerOpen, setDevDrawerOpen] = useState(false);
  const setIsTransformPanelActive = useEditorStore((state) => state.setIsTransformPanelActive);
  const setIsCropping = useEditorStore((state) => state.setIsCropping);

  // Sync transform panel state with store
  useEffect(() => {
    const isTransform = activePanel === 'transform';
    setIsTransformPanelActive(isTransform);
    // Auto-enable cropping when entering transform tab, disable when leaving
    setIsCropping(isTransform);
  }, [activePanel, setIsTransformPanelActive, setIsCropping]);

  return (
    <aside
      className="w-80 flex h-full overflow-hidden"
      style={{
        backgroundColor: 'var(--editor-bg-primary)',
        borderLeft: '1px solid var(--editor-border)'
      }}
    >
      {/* Panel content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className="h-12 flex items-center justify-between px-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--editor-border)' }}
        >
          <h2 className="text-sm font-medium" style={{ color: 'var(--editor-text-primary)' }}>{PANEL_TITLES[activePanel]}</h2>
          <button style={{ color: 'var(--editor-text-muted)' }}>
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
            </div>
          )}
          {activePanel === 'hsl' && <HSLPanel />}
          {activePanel === 'effects' && (
            <div className="space-y-0">
              <EffectsPanel />
              <MaskPanel />
            </div>
          )}
          {activePanel === 'transform' && <TransformPanel />}
          {activePanel === 'ai' && <AIPanel />}
        </div>

        {/* Dev drawer at bottom */}
        <DevDrawer isOpen={devDrawerOpen} onToggle={() => setDevDrawerOpen(!devDrawerOpen)} />
      </div>

      {/* Tab icons on right edge */}
      <div
        className="w-12 flex flex-col items-center py-2"
        style={{
          backgroundColor: 'var(--editor-bg-primary)',
          borderLeft: '1px solid var(--editor-border)'
        }}
      >
        <TabButton
          icon={<PresetsIcon />}
          label="Presets"
          active={activePanel === 'presets'}
          onClick={() => setActivePanel('presets')}
        />
        <TabButton
          icon={<ToolsIcon />}
          label="Adjust"
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
        <TabButton
          icon={<TransformIcon />}
          label="Transform"
          active={activePanel === 'transform'}
          onClick={() => setActivePanel('transform')}
        />
        <TabButton
          icon={<AIIcon />}
          label="AI"
          active={activePanel === 'ai'}
          onClick={() => setActivePanel('ai')}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Dev drawer toggle at bottom */}
        <TabButton
          icon={<DevDrawerIcon />}
          label="JSON"
          active={devDrawerOpen}
          onClick={() => setDevDrawerOpen(!devDrawerOpen)}
        />
      </div>
    </aside>
  );
}
