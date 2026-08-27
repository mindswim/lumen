'use client';

import { useState } from 'react';
import { Download, FileJson, FileText, ImageDown, Printer } from 'lucide-react';

import { useGalleryStore } from '@/lib/gallery/store';
import { getSelectedTake, type StoryboardProject } from '@/lib/storyboard/store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'storyboard';
}

function csvCell(value: string | number) {
  const normalized = String(value).replace(/"/g, '""');
  return `"${normalized}"`;
}

function loadCanvasImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('A panel image could not be loaded.'));
    image.src = src;
  });
}

export function StoryboardExportDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: StoryboardProject;
}) {
  const images = useGalleryStore((state) => state.images);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const slug = safeSlug(project.title);

  const exportShotList = () => {
    const header = ['Shot', 'Scene', 'Name', 'Action', 'Shot size', 'Camera angle', 'Movement', 'Duration seconds', 'Dialogue / voice-over', 'Continuity', 'Panels'];
    const rows = project.shots.map((shot, index) => {
      const scene = project.scenes.find((candidate) => candidate.id === shot.sceneId);
      return [index + 1, scene?.title ?? '', shot.title, shot.beat, shot.shotSize, shot.cameraAngle, shot.cameraMovement, shot.durationSeconds, shot.dialogue, shot.continuityNotes, shot.panelRoles.join(' / ')];
    });
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${slug}-shot-list.csv`);
  };

  const exportManifest = () => {
    const manifest = {
      exportedAt: new Date().toISOString(),
      format: 'lumen-storyboard-manifest-v1',
      project,
      selectedPanels: project.shots.flatMap((shot, shotIndex) => shot.panelRoles.map((panelRole) => {
        const take = getSelectedTake(shot, panelRole);
        const image = take ? images.find((candidate) => candidate.id === take.imageId) : null;
        return { shot: shotIndex + 1, shotId: shot.id, panelRole, takeId: take?.id ?? null, imageUrl: image?.dataUrl ?? null };
      })),
    };
    downloadBlob(new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }), `${slug}-manifest.json`);
  };

  const exportContactSheet = async () => {
    setWorking('contact-sheet');
    setError(null);
    try {
      const frames = project.shots.flatMap((shot, shotIndex) => shot.panelRoles.map((panelRole) => {
        const take = getSelectedTake(shot, panelRole);
        const image = take ? images.find((candidate) => candidate.id === take.imageId) : null;
        return { shot, shotIndex, panelRole, image };
      }));
      const columns = frames.length > 12 ? 4 : 3;
      const cardWidth = 560;
      const imageHeight = project.aspect === 'portrait_16_9' ? 720 : project.aspect === 'landscape_4_3' ? 420 : 315;
      const captionHeight = 104;
      const gap = 28;
      const margin = 48;
      const headerHeight = 150;
      const rows = Math.max(1, Math.ceil(frames.length / columns));
      const logicalWidth = margin * 2 + columns * cardWidth + (columns - 1) * gap;
      const logicalHeight = margin * 2 + headerHeight + rows * (imageHeight + captionHeight) + (rows - 1) * gap;
      const renderScale = Math.min(1, 16_000 / logicalWidth, 16_000 / logicalHeight, Math.sqrt(64_000_000 / (logicalWidth * logicalHeight)));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(logicalWidth * renderScale));
      canvas.height = Math.max(1, Math.floor(logicalHeight * renderScale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Contact-sheet rendering is not available in this browser.');
      context.scale(renderScale, renderScale);

      context.fillStyle = '#f5f5f4';
      context.fillRect(0, 0, logicalWidth, logicalHeight);
      context.fillStyle = '#0a0a0a';
      context.font = '600 38px system-ui, sans-serif';
      context.fillText(project.title, margin, margin + 42);
      context.fillStyle = '#737373';
      context.font = '500 18px system-ui, sans-serif';
      context.fillText(`${project.scenes.length} scenes · ${project.shots.length} shots · ${frames.length} panels`, margin, margin + 78);
      context.font = '400 15px system-ui, sans-serif';
      context.fillText(project.logline.slice(0, 150), margin, margin + 110);

      for (const [index, frame] of frames.entries()) {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = margin + column * (cardWidth + gap);
        const y = margin + headerHeight + row * (imageHeight + captionHeight + gap);
        context.fillStyle = '#111111';
        context.fillRect(x, y, cardWidth, imageHeight);
        if (frame.image) {
          const source = await loadCanvasImage(frame.image.dataUrl);
          const scale = Math.max(cardWidth / source.width, imageHeight / source.height);
          const width = source.width * scale;
          const height = source.height * scale;
          context.save();
          context.beginPath();
          context.rect(x, y, cardWidth, imageHeight);
          context.clip();
          context.drawImage(source, x + (cardWidth - width) / 2, y + (imageHeight - height) / 2, width, height);
          context.restore();
        } else {
          context.fillStyle = '#737373';
          context.font = '600 16px system-ui, sans-serif';
          context.textAlign = 'center';
          context.fillText('MISSING PANEL', x + cardWidth / 2, y + imageHeight / 2);
          context.textAlign = 'start';
        }
        context.fillStyle = '#ffffff';
        context.fillRect(x, y + imageHeight, cardWidth, captionHeight);
        context.fillStyle = '#737373';
        context.font = '500 13px ui-monospace, monospace';
        context.fillText(`SHOT ${String(frame.shotIndex + 1).padStart(2, '0')} · ${frame.panelRole.toUpperCase()}`, x + 18, y + imageHeight + 27);
        context.fillStyle = '#111111';
        context.font = '600 18px system-ui, sans-serif';
        context.fillText(frame.shot.title.slice(0, 48), x + 18, y + imageHeight + 55);
        context.fillStyle = '#737373';
        context.font = '400 14px system-ui, sans-serif';
        const panelCaption = frame.panelRole === 'start'
          ? frame.shot.beat
          : frame.shot.panelDirections[frame.panelRole] || frame.shot.beat;
        context.fillText(panelCaption.slice(0, 72), x + 18, y + imageHeight + 81);
      }

      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('The contact sheet could not be encoded.')), 'image/png'));
      downloadBlob(blob, `${slug}-contact-sheet.png`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The contact sheet could not be exported.');
    } finally {
      setWorking(null);
    }
  };

  const actions = [
    { id: 'print', title: 'Print / Save as PDF', description: 'A clean board with images, captions, and production metadata.', icon: Printer, action: () => window.open(`/storyboard-print?projectId=${encodeURIComponent(project.id)}`, '_blank', 'noopener,noreferrer') },
    { id: 'contact-sheet', title: 'Contact sheet PNG', description: 'One high-resolution image containing every enabled panel.', icon: ImageDown, action: exportContactSheet },
    { id: 'shot-list', title: 'Shot list CSV', description: 'Structured rows for spreadsheets, production tools, or editorial.', icon: FileText, action: exportShotList },
    { id: 'manifest', title: 'Project manifest', description: 'Portable JSON containing direction, references, panels, and versions.', icon: FileJson, action: exportManifest },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Download className="h-4 w-4" /> Export storyboard</DialogTitle>
          <DialogDescription>Choose a practical handoff format. Exports use the currently selected version for each enabled panel.</DialogDescription>
        </DialogHeader>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {actions.map((action) => (
            <button key={action.id} type="button" onClick={action.action} disabled={Boolean(working)} className="rounded-xl border p-4 text-left transition hover:bg-neutral-50 disabled:opacity-50" style={{ borderColor: 'var(--editor-border)' }}>
              <div className="flex items-center justify-between"><action.icon className="h-4 w-4" />{working === action.id && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />}</div>
              <p className="mt-4 text-xs font-semibold">{action.title}</p>
              <p className="mt-1 text-[10px] leading-4" style={{ color: 'var(--editor-text-muted)' }}>{action.description}</p>
            </button>
          ))}
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[10px] text-red-700">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
