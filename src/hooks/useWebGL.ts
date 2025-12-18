'use client';

import { useEffect, useRef, useCallback } from 'react';
import { WebGLRenderer } from '@/lib/webgl/renderer';
import { EditState } from '@/types/editor';

export function useWebGL() {
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const initRenderer = useCallback((canvas: HTMLCanvasElement) => {
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }
    canvasRef.current = canvas;
    rendererRef.current = new WebGLRenderer(canvas);
  }, []);

  const setImage = useCallback((image: HTMLImageElement) => {
    if (rendererRef.current) {
      rendererRef.current.setImage(image);
    }
  }, []);

  const render = useCallback((editState: EditState) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      if (rendererRef.current) {
        rendererRef.current.updateCurveLut(editState.curve);
        rendererRef.current.render(editState);
      }
    });
  }, []);

  const setLut = useCallback((lutData: Uint8Array, size: number) => {
    if (rendererRef.current) {
      rendererRef.current.setLut(lutData, size);
    }
  }, []);

  const clearLut = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.clearLut();
    }
  }, []);

  const exportImage = useCallback(
    async (
      editState: EditState,
      originalImage: HTMLImageElement,
      options?: {
        format?: 'jpeg' | 'png' | 'webp';
        quality?: number;
        scale?: number;
        maxDimension?: number;
      }
    ): Promise<Blob> => {
      if (!rendererRef.current) {
        throw new Error('Renderer not initialized');
      }
      return rendererRef.current.exportImage(editState, originalImage, options);
    },
    []
  );

  const getRenderer = useCallback(() => rendererRef.current, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  return {
    initRenderer,
    setImage,
    render,
    setLut,
    clearLut,
    exportImage,
    getRenderer,
    canvasRef,
  };
}
