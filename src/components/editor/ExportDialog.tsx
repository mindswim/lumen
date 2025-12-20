'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useEditorStore } from '@/lib/editor/state';
import { useExport } from '@/contexts/export-context';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExportTier = 'web' | 'print';
type ExportFormat = 'jpeg' | 'png' | 'webp' | 'tiff';
type ResolutionOption = 'full' | '75' | '50' | 'custom';

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const image = useEditorStore((state) => state.image);
  const editState = useEditorStore((state) => state.editState);
  const showToast = useEditorStore((state) => state.showToast);
  const { exportFunction } = useExport();

  const [tier, setTier] = useState<ExportTier>('web');
  const [format, setFormat] = useState<ExportFormat>('jpeg');
  const [quality, setQuality] = useState(95);
  const [resolution, setResolution] = useState<ResolutionOption>('full');
  const [maxDimension, setMaxDimension] = useState(2048);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available formats depend on tier
  const availableFormats: ExportFormat[] = tier === 'print'
    ? ['jpeg', 'png', 'tiff']
    : ['jpeg', 'png', 'webp'];

  // Reset format when changing tier if current format not available
  const handleTierChange = (newTier: ExportTier) => {
    setTier(newTier);
    if (newTier === 'print') {
      if (format === 'webp') setFormat('jpeg');
      setQuality(100); // Default to max quality for print
      setResolution('full'); // Default to full resolution for print
    } else {
      if (format === 'tiff') setFormat('jpeg');
    }
  };

  // Calculate output dimensions based on settings
  const outputDimensions = useMemo(() => {
    if (!image) return { width: 0, height: 0 };

    let width = image.width;
    let height = image.height;

    // Apply crop
    const crop = editState.crop;
    if (crop) {
      width = Math.round(crop.width * image.width);
      height = Math.round(crop.height * image.height);
    }

    // Apply rotation (swap for 90/270)
    const rotation = editState.rotation || 0;
    if (Math.abs(rotation) === 90 || Math.abs(rotation) === 270) {
      [width, height] = [height, width];
    }

    // Apply scale based on resolution option
    let scale = 1;
    switch (resolution) {
      case '75':
        scale = 0.75;
        break;
      case '50':
        scale = 0.5;
        break;
      case 'custom':
        const maxSide = Math.max(width, height);
        if (maxSide > maxDimension) {
          scale = maxDimension / maxSide;
        }
        break;
    }

    return {
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    };
  }, [image, editState.crop, editState.rotation, resolution, maxDimension]);

  // Calculate print size at 300 DPI
  const printSize = useMemo(() => {
    const dpi = 300;
    const widthInches = outputDimensions.width / dpi;
    const heightInches = outputDimensions.height / dpi;
    return {
      width: widthInches.toFixed(1),
      height: heightInches.toFixed(1),
    };
  }, [outputDimensions]);

  // Estimate file size
  const estimatedSize = useMemo(() => {
    const pixels = outputDimensions.width * outputDimensions.height;
    let bytesPerPixel: number;

    if (format === 'png') {
      bytesPerPixel = 3;
    } else if (format === 'tiff') {
      bytesPerPixel = 4; // Uncompressed-ish
    } else if (format === 'webp') {
      bytesPerPixel = 0.5 + (quality / 100) * 1.5;
    } else {
      // JPEG - print tier uses better encoder so slightly larger
      const baseRatio = tier === 'print' ? 0.4 : 0.3;
      bytesPerPixel = baseRatio + (quality / 100) * 2;
    }

    const bytes = pixels * bytesPerPixel;

    if (bytes < 1024) return `~${Math.round(bytes)} B`;
    if (bytes < 1024 * 1024) return `~${Math.round(bytes / 1024)} KB`;
    return `~${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [outputDimensions, format, quality, tier]);

  const handleExport = useCallback(async () => {
    if (!image || !exportFunction) {
      setError('Export not available. Please try again.');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      // Calculate scale based on resolution option
      let scale = 1;
      let maxDim: number | undefined;

      switch (resolution) {
        case '75':
          scale = 0.75;
          break;
        case '50':
          scale = 0.5;
          break;
        case 'custom':
          maxDim = maxDimension;
          break;
      }

      let finalBlob: Blob;
      const baseName = image.fileName?.replace(/\.[^/.]+$/, '') || 'photo';

      if (tier === 'print') {
        // Print tier: Render to PNG first, then send to server for high-quality encode
        const pngBlob = await exportFunction(editState, image.original, {
          format: 'png', // Lossless intermediate
          quality: 1,
          scale,
          maxDimension: maxDim,
        });

        // Convert blob to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(pngBlob);
        });

        // Send to server for high-quality encode
        const response = await fetch('/api/export/print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: base64,
            options: {
              format: format === 'tiff' ? 'tiff' : format,
              quality,
              dpi: 300,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Server export failed');
        }

        finalBlob = await response.blob();
      } else {
        // Web tier: Direct browser export
        finalBlob = await exportFunction(editState, image.original, {
          format: format as 'jpeg' | 'png' | 'webp',
          quality: quality / 100,
          scale,
          maxDimension: maxDim,
        });
      }

      // Create download link
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      const ext = format === 'jpeg' ? 'jpg' : format;
      const suffix = tier === 'print' ? '-print' : '-web';
      a.href = url;
      a.download = `${baseName}${suffix}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const tierLabel = tier === 'print' ? 'Print quality' : 'Web';
      showToast(`${tierLabel} export: ${outputDimensions.width} x ${outputDimensions.height}`);
      onOpenChange(false);
    } catch (err) {
      console.error('Export failed:', err);
      setError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [image, editState, exportFunction, format, quality, resolution, maxDimension, outputDimensions, onOpenChange, showToast, tier]);

  const resolutionOptions: { value: ResolutionOption; label: string }[] = [
    { value: 'full', label: 'Full' },
    { value: '75', label: '75%' },
    { value: '50', label: '50%' },
    { value: 'custom', label: 'Max' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        style={{ backgroundColor: 'var(--editor-bg-primary)', borderColor: 'var(--editor-border)', color: 'var(--editor-text-primary)' }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--editor-text-primary)' }}>Export Image</DialogTitle>
          <DialogDescription style={{ color: 'var(--editor-text-muted)' }}>
            Choose export quality and format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Tier Selection */}
          <div className="space-y-2">
            <Label style={{ color: 'var(--editor-text-primary)' }}>Quality Tier</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleTierChange('web')}
                className="p-3 rounded-lg text-left transition-colors"
                style={{
                  backgroundColor: tier === 'web' ? 'var(--editor-accent)' : 'var(--editor-bg-tertiary)',
                  color: tier === 'web' ? 'var(--editor-accent-foreground)' : 'var(--editor-text-primary)',
                  border: `1px solid ${tier === 'web' ? 'var(--editor-accent)' : 'var(--editor-border)'}`,
                }}
              >
                <div className="font-medium text-sm">Web / Social</div>
                <div className="text-xs mt-1 opacity-70">Fast, smaller files</div>
              </button>
              <button
                onClick={() => handleTierChange('print')}
                className="p-3 rounded-lg text-left transition-colors"
                style={{
                  backgroundColor: tier === 'print' ? 'var(--editor-accent)' : 'var(--editor-bg-tertiary)',
                  color: tier === 'print' ? 'var(--editor-accent-foreground)' : 'var(--editor-text-primary)',
                  border: `1px solid ${tier === 'print' ? 'var(--editor-accent)' : 'var(--editor-border)'}`,
                }}
              >
                <div className="font-medium text-sm">Print</div>
                <div className="text-xs mt-1 opacity-70">ICC profile, 300 DPI</div>
              </button>
            </div>
          </div>

          {/* Output dimensions */}
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--editor-bg-tertiary)' }}>
            <div className="text-sm" style={{ color: 'var(--editor-text-muted)' }}>Output size</div>
            <div className="text-lg font-medium" style={{ color: 'var(--editor-text-primary)' }}>
              {outputDimensions.width} x {outputDimensions.height} px
            </div>
            {tier === 'print' && (
              <div className="text-xs mt-1" style={{ color: 'var(--editor-text-muted)' }}>
                Print size at 300 DPI: {printSize.width}" x {printSize.height}"
              </div>
            )}
            {image && (outputDimensions.width !== image.width || outputDimensions.height !== image.height) && (
              <div className="text-xs mt-1" style={{ color: 'var(--editor-text-muted)' }}>
                Original: {image.width} x {image.height} px
              </div>
            )}
          </div>

          {/* Resolution selection */}
          <div className="space-y-2">
            <Label style={{ color: 'var(--editor-text-primary)' }}>Resolution</Label>
            <div className="grid grid-cols-4 gap-2">
              {resolutionOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={resolution === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setResolution(option.value)}
                  style={
                    resolution === option.value
                      ? { backgroundColor: 'var(--editor-accent)', color: 'var(--editor-accent-foreground)' }
                      : { backgroundColor: 'var(--editor-bg-tertiary)', borderColor: 'var(--editor-border)', color: 'var(--editor-text-primary)' }
                  }
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Max dimension input for custom resolution */}
          {resolution === 'custom' && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label style={{ color: 'var(--editor-text-primary)' }}>Max dimension</Label>
                <span className="text-sm" style={{ color: 'var(--editor-text-muted)' }}>{maxDimension} px</span>
              </div>
              <Slider
                value={[maxDimension]}
                min={512}
                max={8192}
                step={256}
                onValueChange={([v]) => setMaxDimension(v)}
              />
              <div className="flex justify-between text-xs" style={{ color: 'var(--editor-text-muted)' }}>
                <span>512</span>
                <span>8192</span>
              </div>
            </div>
          )}

          {/* Format selection */}
          <div className="space-y-2">
            <Label style={{ color: 'var(--editor-text-primary)' }}>Format</Label>
            <div className={`grid gap-2 ${availableFormats.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
              {availableFormats.map((f) => (
                <Button
                  key={f}
                  variant={format === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormat(f)}
                  style={
                    format === f
                      ? { backgroundColor: 'var(--editor-accent)', color: 'var(--editor-accent-foreground)' }
                      : { backgroundColor: 'var(--editor-bg-tertiary)', borderColor: 'var(--editor-border)', color: 'var(--editor-text-primary)' }
                  }
                >
                  {f.toUpperCase()}
                </Button>
              ))}
            </div>
            <p className="text-xs" style={{ color: 'var(--editor-text-muted)' }}>
              {format === 'png' && 'Lossless, larger files, supports transparency'}
              {format === 'jpeg' && (tier === 'print'
                ? 'High-quality JPEG with ICC profile, no chroma subsampling'
                : 'Best for photos, smaller files, no transparency')}
              {format === 'webp' && 'Modern format, great compression, wide support'}
              {format === 'tiff' && 'Archival format, maximum quality, very large files'}
            </p>
          </div>

          {/* Quality slider (not for PNG or TIFF) */}
          {format !== 'png' && format !== 'tiff' && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label style={{ color: 'var(--editor-text-primary)' }}>Quality</Label>
                <span className="text-sm" style={{ color: 'var(--editor-text-muted)' }}>{quality}%</span>
              </div>
              <Slider
                value={[quality]}
                min={10}
                max={100}
                step={5}
                onValueChange={([v]) => setQuality(v)}
              />
              <div className="flex justify-between text-xs" style={{ color: 'var(--editor-text-muted)' }}>
                <span>Smaller file</span>
                <span>Higher quality</span>
              </div>
            </div>
          )}

          {/* Estimated size */}
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--editor-text-muted)' }}>Estimated file size</span>
            <span style={{ color: 'var(--editor-text-primary)' }}>{estimatedSize}</span>
          </div>

          {/* Print tier info */}
          {tier === 'print' && (
            <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: 'var(--editor-bg-tertiary)', color: 'var(--editor-text-secondary)' }}>
              Print export includes: sRGB ICC profile, 300 DPI metadata, no chroma subsampling (4:4:4), mozjpeg encoder for optimal quality.
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            style={{ backgroundColor: 'var(--editor-bg-tertiary)', borderColor: 'var(--editor-border)', color: 'var(--editor-text-primary)' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || !image || !exportFunction}
            className="min-w-[100px]"
            style={{ backgroundColor: 'var(--editor-accent)', color: 'var(--editor-accent-foreground)' }}
          >
            {isExporting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {tier === 'print' ? 'Processing...' : 'Exporting'}
              </span>
            ) : (
              'Export'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
