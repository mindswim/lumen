'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useWebGL } from '@/hooks/useWebGL';
import { useEditorStore } from '@/lib/editor/state';
import { useExport } from '@/contexts/export-context';
import { MaskOverlay } from './MaskOverlay';
import { CropOverlay } from './CropOverlay';
import { ComparisonOverlay } from './ComparisonOverlay';
import { computeHistogram } from '@/lib/histogram';

interface CanvasProps {
  className?: string;
}


export function Canvas({ className }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<{ setTransform: (x: number, y: number, scale: number) => void } | null>(null);
  const { initRenderer, setImage, render, exportImage } = useWebGL();
  const { setExportFunction } = useExport();
  const { image, editState } = useEditorStore();
  const selectedMaskId = useEditorStore((state) => state.selectedMaskId);
  const isCropping = useEditorStore((state) => state.isCropping);
  const isTransformPanelActive = useEditorStore((state) => state.isTransformPanelActive);
  const comparisonMode = useEditorStore((state) => state.comparisonMode);
  const splitPosition = useEditorStore((state) => state.comparisonSplitPosition);
  const isHoldingOriginal = useEditorStore((state) => state.isHoldingOriginal);
  const setIsHoldingOriginal = useEditorStore((state) => state.setIsHoldingOriginal);
  const showHistogram = useEditorStore((state) => state.showHistogram);
  const setHistogramData = useEditorStore((state) => state.setHistogramData);
  const zoomLevel = useEditorStore((state) => state.zoomLevel);
  const setZoomLevel = useEditorStore((state) => state.setZoomLevel);
  const zoomToFit = useEditorStore((state) => state.zoomToFit);
  const setZoomToFit = useEditorStore((state) => state.setZoomToFit);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [currentScale, setCurrentScale] = useState(1);
  const histogramTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isExternalZoomChange = useRef(false);

  // Handle spacebar hold for comparison
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && comparisonMode === 'hold' && !e.repeat) {
        e.preventDefault();
        setIsHoldingOriginal(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && comparisonMode === 'hold') {
        e.preventDefault();
        setIsHoldingOriginal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [comparisonMode, setIsHoldingOriginal]);

  // Initialize renderer when canvas mounts
  useEffect(() => {
    if (canvasRef.current) {
      initRenderer(canvasRef.current);
    }
  }, [initRenderer]);

  // Register export function with context
  useEffect(() => {
    setExportFunction(exportImage);
    return () => setExportFunction(null);
  }, [exportImage, setExportFunction]);

  // Set image when it changes
  useEffect(() => {
    if (image?.preview) {
      setImage(image.preview);
    }
  }, [image, setImage]);

  // Re-render when edit state changes
  useEffect(() => {
    if (image) {
      render(editState);
    }
  }, [editState, image, render]);

  // Compute histogram after render (throttled)
  useEffect(() => {
    if (!canvasRef.current || !image || !showHistogram) return;

    if (histogramTimeoutRef.current) {
      clearTimeout(histogramTimeoutRef.current);
    }

    histogramTimeoutRef.current = setTimeout(() => {
      if (canvasRef.current) {
        const data = computeHistogram(canvasRef.current);
        setHistogramData(data);
      }
    }, 100);

    return () => {
      if (histogramTimeoutRef.current) {
        clearTimeout(histogramTimeoutRef.current);
      }
    };
  }, [editState, image, showHistogram, setHistogramData]);

  // Show overlay when Transform panel is active (which auto-enables cropping)
  const showTransformOverlay = isTransformPanelActive || isCropping;

  // Calculate transform styles for rotation, flip, and perspective
  const transformStyle = useMemo(() => {
    const transforms: string[] = [];

    // 90-degree rotations
    if (editState.rotation !== 0) {
      transforms.push(`rotate(${editState.rotation}deg)`);
    }

    // Fine straighten angle
    if (editState.straighten !== 0) {
      transforms.push(`rotate(${editState.straighten}deg)`);
    }

    // Flip
    if (editState.flipH) {
      transforms.push('scaleX(-1)');
    }

    if (editState.flipV) {
      transforms.push('scaleY(-1)');
    }

    // Perspective/Skew (convert -100 to 100 range to degrees)
    if (editState.perspectiveX !== 0 || editState.perspectiveY !== 0) {
      // Use skew transform for simple perspective correction
      const skewX = editState.perspectiveX * 0.15; // Max 15 degrees
      const skewY = editState.perspectiveY * 0.15;
      if (skewX !== 0) transforms.push(`skewX(${skewX}deg)`);
      if (skewY !== 0) transforms.push(`skewY(${skewY}deg)`);
    }

    return transforms.length > 0 ? transforms.join(' ') : undefined;
  }, [editState.rotation, editState.straighten, editState.perspectiveX, editState.perspectiveY, editState.flipH, editState.flipV]);

  // Calculate initial scale to fit image in viewport with padding
  const initialScale = useMemo(() => {
    if (!image || containerSize.width === 0 || containerSize.height === 0) return 1;

    const padding = 48; // 24px on each side
    const availableWidth = containerSize.width - padding;
    const availableHeight = containerSize.height - padding;

    const scaleX = availableWidth / image.width;
    const scaleY = availableHeight / image.height;

    return Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%
  }, [image, containerSize]);

  // Track container size
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Reset scale when initialScale changes
  useEffect(() => {
    setCurrentScale(initialScale);
  }, [initialScale]);

  // Sync zoom from store to TransformWrapper
  useEffect(() => {
    if (!transformRef.current || !containerSize.width || !containerSize.height) return;

    const targetScale = zoomToFit ? initialScale : zoomLevel;

    // Only update if significantly different
    if (Math.abs(currentScale - targetScale) > 0.01) {
      isExternalZoomChange.current = true;
      // Center the image when zooming
      const centerX = containerSize.width / 2;
      const centerY = containerSize.height / 2;
      transformRef.current.setTransform(
        centerX - (image?.width || 0) * targetScale / 2,
        centerY - (image?.height || 0) * targetScale / 2,
        targetScale
      );
      setCurrentScale(targetScale);
      setTimeout(() => {
        isExternalZoomChange.current = false;
      }, 100);
    }
  }, [zoomLevel, zoomToFit, initialScale, containerSize, image]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-neutral-900 ${className || ''}`}
    >
      {image ? (
        <TransformWrapper
          ref={(ref) => {
            if (ref) {
              transformRef.current = ref;
            }
          }}
          initialScale={initialScale}
          minScale={0.1}
          maxScale={15}
          centerOnInit
          limitToBounds={false}
          panning={{
            velocityDisabled: true,
            excluded: ['input', 'textarea', 'button'],
          }}
          doubleClick={{ mode: 'reset' }}
          onTransformed={(_, state) => {
            setCurrentScale(state.scale);
            // Sync back to store (only if not triggered by store change)
            if (!isExternalZoomChange.current) {
              if (Math.abs(state.scale - initialScale) < 0.01) {
                setZoomToFit(true);
              } else {
                setZoomLevel(state.scale);
              }
            }
          }}
        >
          {() => (
            <>
              <TransformComponent
                wrapperStyle={{
                  width: '100%',
                  height: '100%',
                }}
                contentStyle={{
                  width: image.width,
                  height: image.height,
                }}
              >
                {/* Outer wrapper - stays fixed, provides the frame */}
                <div
                  ref={wrapperRef}
                  className="relative"
                  style={{
                    width: image.width,
                    height: image.height,
                    overflow: showTransformOverlay ? 'hidden' : 'visible',
                  }}
                >
                  {/* Inner wrapper - applies transforms to image only */}
                  <div
                    className="absolute inset-0"
                    style={{
                      transform: transformStyle,
                      transformOrigin: 'center center',
                    }}
                  >
                    {/* Original image layer (shown for comparison modes) */}
                    {(comparisonMode === 'hold' && isHoldingOriginal) && (
                      <img
                        src={image.preview.src}
                        alt="Original"
                        className="absolute inset-0 shadow-2xl"
                        style={{ width: image.width, height: image.height }}
                      />
                    )}

                    {/* Split mode: Original on left */}
                    {comparisonMode === 'split' && (
                      <img
                        src={image.preview.src}
                        alt="Original"
                        className="absolute inset-0 shadow-2xl"
                        style={{ width: image.width, height: image.height }}
                      />
                    )}

                    {/* Edited canvas */}
                    <canvas
                      ref={canvasRef}
                      className="shadow-2xl"
                      style={{
                        width: image.width,
                        height: image.height,
                        opacity: (comparisonMode === 'hold' && isHoldingOriginal) ? 0 : 1,
                        clipPath: comparisonMode === 'split'
                          ? `inset(0 0 0 ${splitPosition * 100}%)`
                          : undefined,
                      }}
                    />
                  </div>

                  {/* Comparison overlay for split mode */}
                  {comparisonMode === 'split' && (
                    <ComparisonOverlay
                      canvasWidth={image.width}
                      canvasHeight={image.height}
                    />
                  )}

                  {/* Hold mode hint */}
                  {comparisonMode === 'hold' && !isHoldingOriginal && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/60 text-white text-xs rounded z-30">
                      Hold Space for original
                    </div>
                  )}

                  {/* Showing original indicator */}
                  {comparisonMode === 'hold' && isHoldingOriginal && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/60 text-white text-xs rounded z-30">
                      Original
                    </div>
                  )}

                  {/* Crop/Transform overlay - stays fixed while image transforms inside */}
                  {showTransformOverlay && (
                    <CropOverlay
                      canvasWidth={image.width}
                      canvasHeight={image.height}
                      imageWidth={image.width}
                      imageHeight={image.height}
                    />
                  )}

                  {/* Mask overlay for interactive mask editing */}
                  {selectedMaskId && !showTransformOverlay && (
                    <MaskOverlay
                      canvasWidth={image.width}
                      canvasHeight={image.height}
                    />
                  )}
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      ) : (
        <div className="flex-1 flex items-center justify-center h-full text-neutral-600 text-center">
          <div>
            <p className="text-lg">No image loaded</p>
            <p className="text-sm mt-2 text-neutral-700">Upload an image to start editing</p>
          </div>
        </div>
      )}
    </div>
  );
}
