'use client';

import { useState, useCallback } from 'react';
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

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExportFormat = 'jpeg' | 'png' | 'webp';

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const image = useEditorStore((state) => state.image);
  const editState = useEditorStore((state) => state.editState);

  const [format, setFormat] = useState<ExportFormat>('jpeg');
  const [quality, setQuality] = useState(95);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!image) return;

    setIsExporting(true);

    try {
      // Get the canvas element
      const canvas = document.querySelector('canvas');
      if (!canvas) throw new Error('Canvas not found');

      // Determine MIME type
      const mimeTypes: Record<ExportFormat, string> = {
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
      };

      const mimeType = mimeTypes[format];
      const qualityValue = format === 'png' ? undefined : quality / 100;

      // Export from canvas
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          },
          mimeType,
          qualityValue
        );
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const baseName = image.fileName?.replace(/\.[^/.]+$/, '') || 'edited';
      a.href = url;
      a.download = `${baseName}-edited.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onOpenChange(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [image, format, quality, onOpenChange]);

  const formatSizeEstimate = useCallback(() => {
    if (!image) return 'N/A';

    // Rough estimate based on dimensions and format
    const pixels = image.width * image.height;
    let bytesPerPixel: number;

    if (format === 'png') {
      bytesPerPixel = 3; // Lossless, roughly 3 bytes per pixel
    } else if (format === 'webp') {
      bytesPerPixel = 0.5 + (quality / 100) * 1.5;
    } else {
      bytesPerPixel = 0.3 + (quality / 100) * 2;
    }

    const bytes = pixels * bytesPerPixel;

    if (bytes < 1024) return `~${Math.round(bytes)} B`;
    if (bytes < 1024 * 1024) return `~${Math.round(bytes / 1024)} KB`;
    return `~${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [image, format, quality]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-900 border-neutral-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Export Image</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Choose format and quality settings for your export.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Image info */}
          {image && (
            <div className="text-sm text-neutral-400">
              <p>
                Original: {image.width} x {image.height} px
              </p>
            </div>
          )}

          {/* Format selection */}
          <div className="space-y-2">
            <Label className="text-white">Format</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['jpeg', 'png', 'webp'] as ExportFormat[]).map((f) => (
                <Button
                  key={f}
                  variant={format === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormat(f)}
                  className={
                    format === f
                      ? 'bg-white text-black hover:bg-neutral-200'
                      : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white'
                  }
                >
                  {f.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          {/* Quality slider (not for PNG) */}
          {format !== 'png' && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-white">Quality</Label>
                <span className="text-sm text-neutral-400">{quality}%</span>
              </div>
              <Slider
                value={[quality]}
                min={10}
                max={100}
                step={5}
                onValueChange={([v]) => setQuality(v)}
              />
              <p className="text-xs text-neutral-500">
                Higher quality = larger file size
              </p>
            </div>
          )}

          {/* Size estimate */}
          <div className="text-sm text-neutral-400">
            <p>Estimated size: {formatSizeEstimate()}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || !image}
            className="bg-white text-black hover:bg-neutral-200"
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
