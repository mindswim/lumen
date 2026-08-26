import type { ReferenceKind } from '@/lib/storyboard/store';

export function inferReferenceKind(value: string): ReferenceKind {
  const normalized = value.toLowerCase();
  if (/(archive|engraving|historical|research|source)/.test(normalized)) return 'research';
  if (/(place|room|house|street|location|city|hall|park|landscape|environment|exterior|interior)/.test(normalized)) return 'location';
  if (/(prop|object|car|weapon|wardrobe|costume|badge|club|hat|dress|coat)/.test(normalized)) return 'object';
  if (/(style|look|mood|palette|film|lighting|texture|cinematography)/.test(normalized)) return 'style';
  return 'character';
}

export function referenceDisplayName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
