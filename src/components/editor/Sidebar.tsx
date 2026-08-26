'use client';

import { useEffect, useState } from 'react';
import { Sparkles, SlidersHorizontal, SwatchBook } from 'lucide-react';
import { AdjustPanel } from './AdjustPanel';
import { CurvePanel } from './CurvePanel';
import { HSLPanel } from './HSLPanel';
import { EffectsPanel } from './EffectsPanel';
import { DetailPanel } from './DetailPanel';
import { PresetPanel } from './PresetPanel';
import { MaskPanel } from './MaskPanel';
import { TransformPanel } from './TransformPanel';
import { AIPanel } from './AIPanel';
import { useEditorStore } from '@/lib/editor/state';

type WorkspaceMode = 'looks' | 'tune' | 'ai';
type TuneMode = 'light' | 'color' | 'detail' | 'effects' | 'crop';

const MODES: Array<{ id: WorkspaceMode; label: string; icon: React.ReactNode }> = [
  { id: 'looks', label: 'Looks', icon: <SwatchBook className="h-4 w-4" /> },
  { id: 'tune', label: 'Tune', icon: <SlidersHorizontal className="h-4 w-4" /> },
  { id: 'ai', label: 'AI', icon: <Sparkles className="h-4 w-4" /> },
];

const TUNE_MODES: Array<{ id: TuneMode; label: string }> = [
  { id: 'light', label: 'Light' },
  { id: 'color', label: 'Color' },
  { id: 'detail', label: 'Detail' },
  { id: 'effects', label: 'Effects' },
  { id: 'crop', label: 'Crop' },
];

export function Sidebar() {
  const [mode, setMode] = useState<WorkspaceMode>('looks');
  const [tuneMode, setTuneMode] = useState<TuneMode>('light');
  const setIsTransformPanelActive = useEditorStore((state) => state.setIsTransformPanelActive);
  const setIsCropping = useEditorStore((state) => state.setIsCropping);

  useEffect(() => {
    const transformIsActive = mode === 'tune' && tuneMode === 'crop';
    setIsTransformPanelActive(transformIsActive);
    setIsCropping(transformIsActive);
  }, [mode, setIsCropping, setIsTransformPanelActive, tuneMode]);

  return (
    <aside
      className="w-[380px] flex h-full flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--editor-bg-primary)', borderLeft: '1px solid var(--editor-border)' }}
    >
      <div className="p-3" style={{ borderBottom: '1px solid var(--editor-border)' }}>
        <div className="grid grid-cols-3 rounded-xl p-1" style={{ backgroundColor: 'var(--editor-bg-secondary)' }}>
          {MODES.map((item) => (
            <button
              key={item.id}
              onClick={() => setMode(item.id)}
              className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
              style={{
                backgroundColor: mode === item.id ? 'var(--editor-bg-primary)' : 'transparent',
                color: mode === item.id ? 'var(--editor-text-primary)' : 'var(--editor-text-muted)',
                boxShadow: mode === item.id ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'tune' && (
        <div className="flex gap-1 overflow-x-auto px-3 py-2" style={{ borderBottom: '1px solid var(--editor-border)' }}>
          {TUNE_MODES.map((item) => (
            <button
              key={item.id}
              onClick={() => setTuneMode(item.id)}
              className="rounded-full px-3 py-1.5 text-xs font-medium"
              style={{
                backgroundColor: tuneMode === item.id ? 'var(--editor-accent)' : 'transparent',
                color: tuneMode === item.id ? 'var(--editor-accent-foreground)' : 'var(--editor-text-tertiary)',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div className={`flex-1 min-h-0 ${mode === 'ai' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {mode === 'looks' && <PresetPanel />}
        {mode === 'ai' && <AIPanel />}
        {mode === 'tune' && tuneMode === 'light' && (
          <AdjustPanel />
        )}
        {mode === 'tune' && tuneMode === 'color' && <HSLPanel />}
        {mode === 'tune' && tuneMode === 'detail' && (
          <div>
            <DetailPanel />
            <CurvePanel />
          </div>
        )}
        {mode === 'tune' && tuneMode === 'effects' && (
          <div>
            <EffectsPanel />
            <MaskPanel />
          </div>
        )}
        {mode === 'tune' && tuneMode === 'crop' && <TransformPanel />}
      </div>
    </aside>
  );
}
