'use client';

import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/lib/editor/state';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CompactHistogram } from './Histogram';

interface ToolbarProps {
  onExport?: () => void;
}

export function Toolbar({ onExport }: ToolbarProps) {
  const router = useRouter();
  const { undo, redo, canUndo, canRedo, resetEditState, image } = useEditorStore();
  const comparisonMode = useEditorStore((state) => state.comparisonMode);
  const setComparisonMode = useEditorStore((state) => state.setComparisonMode);
  const showHistogram = useEditorStore((state) => state.showHistogram);
  const setShowHistogram = useEditorStore((state) => state.setShowHistogram);
  const histogramData = useEditorStore((state) => state.histogramData);

  return (
    <header
      className="h-14 flex items-center justify-between px-4"
      style={{ backgroundColor: 'var(--editor-bg-primary)', borderBottom: '1px solid var(--editor-border)' }}
    >
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/')}
          style={{ color: 'var(--editor-text-secondary)' }}
        >
          Back
        </Button>
        {image && (
          <span className="text-sm ml-2" style={{ color: 'var(--editor-text-muted)' }}>
            {image.fileName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={!canUndo()}
          className="disabled:opacity-30"
          style={{ color: 'var(--editor-text-secondary)' }}
        >
          Undo
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={!canRedo()}
          className="disabled:opacity-30"
          style={{ color: 'var(--editor-text-secondary)' }}
        >
          Redo
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetEditState}
          style={{ color: 'var(--editor-text-secondary)' }}
        >
          Reset
        </Button>

        <div className="w-px h-6 mx-1" style={{ backgroundColor: 'var(--editor-border)' }} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              style={{
                color: 'var(--editor-text-secondary)',
                backgroundColor: comparisonMode !== 'off' ? 'var(--editor-bg-active)' : 'transparent'
              }}
              disabled={!image}
            >
              Compare
              {comparisonMode !== 'off' && (
                <span className="ml-1 text-xs" style={{ color: 'var(--editor-text-muted)' }}>
                  ({comparisonMode === 'split' ? 'Split' : 'Hold'})
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem
              onClick={() => setComparisonMode('off')}
              style={comparisonMode === 'off' ? { backgroundColor: 'var(--editor-bg-active)' } : undefined}
            >
              Off
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setComparisonMode('split')}
              style={comparisonMode === 'split' ? { backgroundColor: 'var(--editor-bg-active)' } : undefined}
            >
              Split View
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setComparisonMode('hold')}
              style={comparisonMode === 'hold' ? { backgroundColor: 'var(--editor-bg-active)' } : undefined}
            >
              Hold Space
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-3">
        {/* Histogram toggle and display */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistogram(!showHistogram)}
            style={{
              color: 'var(--editor-text-secondary)',
              backgroundColor: showHistogram ? 'var(--editor-bg-active)' : 'transparent'
            }}
            disabled={!image}
          >
            Histogram
          </Button>
          {showHistogram && image && (
            <CompactHistogram data={histogramData} className="ml-1" />
          )}
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={onExport}
          disabled={!image}
          style={{ backgroundColor: 'var(--editor-accent)', color: 'var(--editor-accent-foreground)' }}
        >
          Export
        </Button>
      </div>
    </header>
  );
}
