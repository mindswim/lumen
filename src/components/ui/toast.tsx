'use client';

import { useEditorStore } from '@/lib/editor/state';

export function Toast() {
  const toast = useEditorStore((state) => state.toast);
  if (!toast) return null;

  return (
    <div
      className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-4 px-4 py-3 bg-neutral-900 text-white text-sm rounded-full shadow-2xl animate-in fade-in slide-in-from-bottom-2"
      role="status"
    >
      <span>{toast.message}</span>
      {toast.actionLabel && toast.onAction && (
        <button
          className="font-semibold text-amber-300 hover:text-amber-200"
          onClick={() => {
            toast.onAction?.();
            useEditorStore.setState({ toast: null });
          }}
        >
          {toast.actionLabel}
        </button>
      )}
    </div>
  );
}
