'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useEditorStore } from '@/lib/editor/state';
import { useGalleryStore } from '@/lib/gallery/store';
import {
  PRESETS,
  blendEditStates,
  createPresetEditState,
  type BuiltInPreset,
} from '@/lib/editor/presets';
import { EditState, createDefaultEditState, ensureCompleteEditState } from '@/types/editor';
import {
  loadUserPresets,
  addUserPreset,
  deleteUserPreset,
  exportPresetsAsJSON,
  importPresetsFromJSON,
  applyUserPreset,
  UserPreset,
} from '@/lib/editor/user-presets';
import { renderPresetPreviews } from '@/lib/editor/preset-previews';
import { SavePresetDialog } from './SavePresetDialog';

const FALLBACK_SWATCHES = [
  'linear-gradient(145deg, #27323a, #d0a46b)',
  'linear-gradient(145deg, #2f4858, #a6d4c8)',
  'linear-gradient(145deg, #342e37, #f1b36b)',
  'linear-gradient(145deg, #17324d, #c86b85)',
  'linear-gradient(145deg, #5d4037, #d9b99b)',
];

function preserveComposition(target: EditState, base: EditState): EditState {
  return ensureCompleteEditState({
    ...target,
    crop: base.crop,
    rotation: base.rotation,
    straighten: base.straighten,
    perspectiveX: base.perspectiveX,
    perspectiveY: base.perspectiveY,
    flipH: base.flipH,
    flipV: base.flipV,
    masks: base.masks,
  });
}

export function PresetPanel() {
  const image = useEditorStore((state) => state.image);
  const editState = useEditorStore((state) => state.editState);
  const setEditState = useEditorStore((state) => state.setEditState);
  const pushHistory = useEditorStore((state) => state.pushHistory);
  const showToast = useEditorStore((state) => state.showToast);
  const { selectedIds, images: galleryImages, updateImageEditState } = useGalleryStore();

  const selectedGalleryImages = useMemo(
    () => galleryImages.filter((galleryImage) => selectedIds.includes(galleryImage.id)),
    [galleryImages, selectedIds]
  );
  const isGalleryMode = !image && selectedGalleryImages.length > 0;
  const previewSource = image?.preview || selectedGalleryImages[0]?.dataUrl;

  const [userPresets, setUserPresets] = useState<UserPreset[]>(() => loadUserPresets());
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [activeUserPresetId, setActiveUserPresetId] = useState<string | null>(null);
  const [strength, setStrength] = useState(100);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorBaseRef = useRef<EditState | null>(null);
  const editorTargetRef = useRef<EditState | null>(null);
  const galleryBaseRef = useRef<Map<string, EditState>>(new Map());
  const galleryTargetRef = useRef<Map<string, EditState>>(new Map());

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(PRESETS.map((preset) => preset.category)))],
    []
  );

  const visiblePresets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return PRESETS.filter((preset) => {
      const inCategory = category === 'All' || preset.category === category;
      const matchesQuery = !normalizedQuery || `${preset.name} ${preset.category}`.toLowerCase().includes(normalizedQuery);
      return inCategory && matchesQuery;
    });
  }, [category, query]);

  useEffect(() => {
    if (!previewSource) {
      return;
    }

    let cancelled = false;
    renderPresetPreviews(previewSource, PRESETS)
      .then((previews) => {
        if (!cancelled) setPreviewUrls(previews);
      })
      .catch(() => {
        if (!cancelled) setPreviewUrls({});
      });

    return () => {
      cancelled = true;
    };
  }, [previewSource]);

  const setBatchLook = (preset: BuiltInPreset) => {
    const bases = new Map<string, EditState>();
    const targets = new Map<string, EditState>();
    selectedGalleryImages.forEach((galleryImage) => {
      bases.set(galleryImage.id, galleryImage.editState);
      const target = createPresetEditState(preset, galleryImage.editState);
      targets.set(galleryImage.id, target);
      updateImageEditState(galleryImage.id, target);
    });
    galleryBaseRef.current = bases;
    galleryTargetRef.current = targets;
  };

  const handlePresetClick = (preset: BuiltInPreset) => {
    setStrength(100);
    setActivePresetId(preset.id);
    setActiveUserPresetId(null);

    if (isGalleryMode) {
      setBatchLook(preset);
      showToast(`Applied ${preset.name} to ${selectedGalleryImages.length} photo${selectedGalleryImages.length === 1 ? '' : 's'}`);
      return;
    }

    pushHistory();
    editorBaseRef.current = editState;
    editorTargetRef.current = createPresetEditState(preset, editState);
    setEditState(editorTargetRef.current);
  };

  const handleUserPresetClick = (preset: UserPreset) => {
    setStrength(100);
    setActivePresetId(null);
    setActiveUserPresetId(preset.id);

    if (isGalleryMode) {
      const bases = new Map<string, EditState>();
      const targets = new Map<string, EditState>();
      selectedGalleryImages.forEach((galleryImage) => {
        bases.set(galleryImage.id, galleryImage.editState);
        const target = preserveComposition(applyUserPreset(preset, createDefaultEditState()), galleryImage.editState);
        targets.set(galleryImage.id, target);
        updateImageEditState(galleryImage.id, target);
      });
      galleryBaseRef.current = bases;
      galleryTargetRef.current = targets;
      showToast(`Applied ${preset.name} to ${selectedGalleryImages.length} photo${selectedGalleryImages.length === 1 ? '' : 's'}`);
      return;
    }

    pushHistory();
    editorBaseRef.current = editState;
    editorTargetRef.current = preserveComposition(applyUserPreset(preset, createDefaultEditState()), editState);
    setEditState(editorTargetRef.current);
  };

  const handleStrengthChange = (nextStrength: number) => {
    setStrength(nextStrength);
    if (isGalleryMode) {
      galleryBaseRef.current.forEach((base, id) => {
        const target = galleryTargetRef.current.get(id);
        if (target) updateImageEditState(id, blendEditStates(base, target, nextStrength));
      });
      return;
    }

    if (editorBaseRef.current && editorTargetRef.current) {
      setEditState(blendEditStates(editorBaseRef.current, editorTargetRef.current, nextStrength));
    }
  };

  const handleSavePreset = (name: string) => setUserPresets(addUserPreset(name, editState));
  const handleDeleteUserPreset = (id: string) => {
    setUserPresets(deleteUserPreset(id));
    if (activeUserPresetId === id) setActiveUserPresetId(null);
  };

  const handleImportPresets = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUserPresets(await importPresetsFromJSON(file));
      showToast('Looks imported');
    } catch {
      showToast('Could not import that looks file');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const hasActiveLook = activePresetId !== null || activeUserPresetId !== null;

  return (
    <div className="pb-6">
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3 space-y-3" style={{ backgroundColor: 'var(--editor-bg-primary)', borderBottom: '1px solid var(--editor-border)' }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--editor-text-muted)' }} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search looks"
            className="w-full rounded-xl py-2 pl-9 pr-3 text-sm outline-none"
            style={{ backgroundColor: 'var(--editor-bg-secondary)', color: 'var(--editor-text-primary)', border: '1px solid var(--editor-border)' }}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium"
              style={{
                backgroundColor: category === item ? 'var(--editor-accent)' : 'var(--editor-bg-secondary)',
                color: category === item ? 'var(--editor-accent-foreground)' : 'var(--editor-text-tertiary)',
                border: '1px solid var(--editor-border)',
              }}
            >
              {item}
            </button>
          ))}
        </div>

        {hasActiveLook && (
          <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--editor-bg-secondary)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--editor-text-secondary)' }}>
                <SlidersHorizontal className="w-3.5 h-3.5" /> Look strength
              </span>
              <span className="text-xs tabular-nums" style={{ color: 'var(--editor-text-primary)' }}>{strength}%</span>
            </div>
            <input
              aria-label="Look strength"
              type="range"
              min="0"
              max="100"
              value={strength}
              onChange={(event) => handleStrengthChange(Number(event.target.value))}
              className="w-full"
              style={{ accentColor: 'var(--editor-accent)' }}
            />
          </div>
        )}
      </div>

      {userPresets.length > 0 && category === 'All' && !query && (
        <section className="px-4 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--editor-text-muted)' }}>My looks</h3>
            <div className="flex gap-3 text-xs" style={{ color: 'var(--editor-text-muted)' }}>
              <button onClick={() => fileInputRef.current?.click()}>Import</button>
              <button onClick={() => exportPresetsAsJSON(userPresets)}>Export</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {userPresets.map((preset, index) => (
              <button
                key={preset.id}
                onClick={() => handleUserPresetClick(preset)}
                onContextMenu={(event) => { event.preventDefault(); handleDeleteUserPreset(preset.id); }}
                className="relative aspect-[4/3] overflow-hidden rounded-xl text-left p-3 flex items-end"
                style={{ background: FALLBACK_SWATCHES[index % FALLBACK_SWATCHES.length], border: activeUserPresetId === preset.id ? '2px solid var(--editor-accent)' : '1px solid var(--editor-border)' }}
              >
                <span className="text-sm font-medium text-white drop-shadow">{preset.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--editor-text-muted)' }}>
            {category === 'All' ? 'Curated looks' : category}
          </h3>
          <button className="text-xs" style={{ color: 'var(--editor-text-tertiary)' }} onClick={() => setIsSaveDialogOpen(true)}>
            Save current
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {visiblePresets.map((preset, index) => (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset)}
              className="group relative aspect-[4/3] overflow-hidden rounded-xl text-left"
              style={{ border: activePresetId === preset.id ? '2px solid var(--editor-accent)' : '1px solid var(--editor-border)', background: FALLBACK_SWATCHES[index % FALLBACK_SWATCHES.length] }}
              aria-label={`${preset.name} ${preset.category}`}
            >
              {previewUrls[preset.id] && (
                // Generated client-side previews are data URLs and cannot benefit from Next image optimization.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrls[preset.id]} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              )}
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-2.5 text-white">
                <span className="block text-sm font-medium leading-none">{preset.name}</span>
                <span className="block text-[10px] uppercase tracking-[0.12em] mt-1 text-white/70">{preset.category}</span>
              </span>
            </button>
          ))}
        </div>
        {visiblePresets.length === 0 && (
          <p className="py-10 text-center text-sm" style={{ color: 'var(--editor-text-muted)' }}>No looks found.</p>
        )}
      </section>

      <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportPresets} className="hidden" />
      <SavePresetDialog isOpen={isSaveDialogOpen} onClose={() => setIsSaveDialogOpen(false)} onSave={handleSavePreset} />
    </div>
  );
}
