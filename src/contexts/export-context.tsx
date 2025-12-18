'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { EditState } from '@/types/editor';

export interface ExportOptions {
  format: 'jpeg' | 'png' | 'webp';
  quality: number; // 0-100
  scale: number; // 1 = 100%, 0.5 = 50%, etc.
  maxDimension?: number;
}

export type ExportFunction = (
  editState: EditState,
  originalImage: HTMLImageElement,
  options?: Partial<ExportOptions>
) => Promise<Blob>;

interface ExportContextType {
  exportFunction: ExportFunction | null;
  setExportFunction: (fn: ExportFunction | null) => void;
  isExporting: boolean;
  setIsExporting: (value: boolean) => void;
  exportError: string | null;
  setExportError: (error: string | null) => void;
}

const ExportContext = createContext<ExportContextType | null>(null);

export function ExportProvider({ children }: { children: ReactNode }) {
  const [exportFunction, setExportFunctionState] = useState<ExportFunction | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const setExportFunction = useCallback((fn: ExportFunction | null) => {
    setExportFunctionState(() => fn);
  }, []);

  return (
    <ExportContext.Provider
      value={{
        exportFunction,
        setExportFunction,
        isExporting,
        setIsExporting,
        exportError,
        setExportError,
      }}
    >
      {children}
    </ExportContext.Provider>
  );
}

export function useExport() {
  const context = useContext(ExportContext);
  // Return safe defaults if not within provider (e.g., during SSR or outside editor)
  if (!context) {
    return {
      exportFunction: null,
      setExportFunction: () => {},
      isExporting: false,
      setIsExporting: () => {},
      exportError: null,
      setExportError: () => {},
    };
  }
  return context;
}
