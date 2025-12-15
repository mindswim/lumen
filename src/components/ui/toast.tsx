'use client';

import { useEditorStore } from '@/lib/editor/state';
import { useEffect, useState } from 'react';

export function Toast() {
  const toast = useEditorStore((state) => state.toast);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(true);
    } else {
      // Delay hiding for animation
      const timeout = setTimeout(() => setVisible(false), 150);
      return () => clearTimeout(timeout);
    }
  }, [toast]);

  if (!visible && !toast) return null;

  return (
    <div
      className={`
        fixed bottom-8 left-1/2 -translate-x-1/2 z-50
        px-4 py-2 bg-neutral-800 text-white text-sm rounded-lg shadow-lg
        transition-all duration-150
        ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      {toast?.message}
    </div>
  );
}
