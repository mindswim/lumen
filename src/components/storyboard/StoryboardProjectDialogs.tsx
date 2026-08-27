'use client';

import { useState } from 'react';
import { Film, Plus } from 'lucide-react';

import { useStoryboardStore, type StoryboardAspect } from '@/lib/storyboard/store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ASPECTS, FIELD, LABEL } from '@/components/storyboard/storyboard-ui';

export function NewProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createProject = useStoryboardStore((state) => state.createProject);
  const [title, setTitle] = useState('');
  const [logline, setLogline] = useState('');
  const [visualDirection, setVisualDirection] = useState('');
  const [aspect, setAspect] = useState<StoryboardAspect>('landscape_16_9');

  const create = () => {
    createProject({ title, logline, visualDirection, aspect });
    setTitle('');
    setLogline('');
    setVisualDirection('');
    setAspect('landscape_16_9');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-neutral-200 bg-white sm:max-w-xl"
        style={{ color: 'var(--editor-text-primary)' }}
      >
        <DialogHeader>
          <DialogTitle>Start a visual project</DialogTitle>
          <DialogDescription>
            Establish the story and camera language first. Characters, locations, and shots come next.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <label>
            <span className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>Title</span>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="The last train north"
              className={FIELD}
              style={{ borderColor: 'var(--editor-border)' }}
            />
          </label>
          <label>
            <span className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>Story premise</span>
            <textarea
              value={logline}
              onChange={(event) => setLogline(event.target.value)}
              placeholder="A courier crosses a flooded city before sunrise to deliver a letter that could end a war."
              rows={3}
              className={`${FIELD} resize-none`}
              style={{ borderColor: 'var(--editor-border)' }}
            />
          </label>
          <label>
            <span className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>Visual language</span>
            <textarea
              value={visualDirection}
              onChange={(event) => setVisualDirection(event.target.value)}
              placeholder="Grounded 1970s political thriller, restrained camera, humid blue dawn, practical amber light, fine 35mm grain."
              rows={3}
              className={`${FIELD} resize-none`}
              style={{ borderColor: 'var(--editor-border)' }}
            />
          </label>
          <div>
            <span className={LABEL} style={{ color: 'var(--editor-text-muted)' }}>Master frame</span>
            <div className="flex gap-2">
              {ASPECTS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAspect(option.value)}
                  className="rounded-full border px-4 py-2 text-xs font-medium"
                  style={{
                    borderColor: aspect === option.value ? 'var(--editor-text-primary)' : 'var(--editor-border)',
                    backgroundColor: aspect === option.value ? 'var(--editor-text-primary)' : 'transparent',
                    color: aspect === option.value ? 'var(--editor-bg-primary)' : 'var(--editor-text-tertiary)',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full px-4 py-2 text-sm"
            style={{ color: 'var(--editor-text-tertiary)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={create}
            disabled={!title.trim()}
            className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            Create project
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StoryboardEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-8">
      <div className="max-w-2xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-xl">
          <Film className="h-7 w-7" />
        </div>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--editor-text-muted)' }}>
          Visual continuity studio
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">
          Make the images tell one story.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 md:text-base" style={{ color: 'var(--editor-text-tertiary)' }}>
          Build a reference library, organize scenes and shots, then select the storyboard panels that belong in the same film.
        </p>
        <button
          onClick={onCreate}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-neutral-950 px-6 py-3 text-sm font-medium text-white shadow-lg"
        >
          <Plus className="h-4 w-4" /> Start a project
        </button>
        <div className="mx-auto mt-10 grid max-w-xl grid-cols-3 gap-3 text-left">
          {[
            ['01', 'Prepare references', 'Add recurring characters, costumes, locations, props, and lookbook images.'],
            ['02', 'Build scenes and shots', 'Describe the action, shot size, angle, movement, and composition.'],
            ['03', 'Select panels', 'Compare versions, check continuity, and time the storyboard as an animatic.'],
          ].map(([number, title, copy]) => (
            <div key={number} className="rounded-2xl border p-4" style={{ borderColor: 'var(--editor-border)', backgroundColor: 'var(--editor-bg-primary)' }}>
              <span className="text-[10px] font-mono" style={{ color: 'var(--editor-text-muted)' }}>{number}</span>
              <p className="mt-3 text-xs font-semibold">{title}</p>
              <p className="mt-1 text-[11px] leading-5" style={{ color: 'var(--editor-text-tertiary)' }}>{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
