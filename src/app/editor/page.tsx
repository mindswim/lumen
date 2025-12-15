'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Editor } from '@/components/editor/Editor';
import { useEditorStore } from '@/lib/editor/state';

export default function EditorPage() {
  const router = useRouter();
  const image = useEditorStore((state) => state.image);

  // Redirect to gallery if no image is loaded
  useEffect(() => {
    if (!image) {
      router.replace('/');
    }
  }, [image, router]);

  if (!image) {
    return (
      <div className="h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-neutral-400">Loading...</div>
      </div>
    );
  }

  return <Editor />;
}
