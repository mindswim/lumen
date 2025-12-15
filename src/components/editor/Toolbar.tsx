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
    <header className="h-14 border-b border-neutral-200 bg-white flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/')}
          className="text-neutral-600 hover:text-neutral-900"
        >
          Back
        </Button>
        {image && (
          <span className="text-sm text-neutral-500 ml-2">
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
          className="text-neutral-600 hover:text-neutral-900 disabled:opacity-30"
        >
          Undo
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={!canRedo()}
          className="text-neutral-600 hover:text-neutral-900 disabled:opacity-30"
        >
          Redo
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetEditState}
          className="text-neutral-600 hover:text-neutral-900"
        >
          Reset
        </Button>

        <div className="w-px h-6 bg-neutral-200 mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`text-neutral-600 hover:text-neutral-900 ${
                comparisonMode !== 'off' ? 'bg-neutral-100' : ''
              }`}
              disabled={!image}
            >
              Compare
              {comparisonMode !== 'off' && (
                <span className="ml-1 text-xs text-neutral-400">
                  ({comparisonMode === 'split' ? 'Split' : 'Hold'})
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem
              onClick={() => setComparisonMode('off')}
              className={comparisonMode === 'off' ? 'bg-neutral-100' : ''}
            >
              Off
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setComparisonMode('split')}
              className={comparisonMode === 'split' ? 'bg-neutral-100' : ''}
            >
              Split View
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setComparisonMode('hold')}
              className={comparisonMode === 'hold' ? 'bg-neutral-100' : ''}
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
            className={`text-neutral-600 hover:text-neutral-900 ${
              showHistogram ? 'bg-neutral-100' : ''
            }`}
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
          className="bg-neutral-900 text-white hover:bg-neutral-800"
        >
          Export
        </Button>
      </div>
    </header>
  );
}
