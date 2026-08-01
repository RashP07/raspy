"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Spinner } from "@/components/ui/spinner";
import type {
  CropState,
  EditorUiState,
  ViewTransform,
} from "@/app/lib/editor/types";
import {
  aspectValue,
  fitAspectBounds,
  MIN_CROP_SIZE,
  normalizeBounds,
} from "@/app/lib/image/crop";
import {
  computeRenderGeometry,
  transformPoint,
  type RenderGeometry,
} from "@/app/lib/image/geometry";

type Handle = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export interface ViewportProps {
  mode: "adjust" | "crop";
  crop: CropState;
  sourceWidth: number;
  sourceHeight: number;
  canvasRef: (node: HTMLCanvasElement | null) => void;
  onCropChange: (crop: Partial<CropState>, coalesce?: boolean) => void;
  onCropCommit: () => void;
  comparing: boolean;
  rendererStatus: EditorUiState["rendererStatus"];
  onCompareStart: () => void;
  onCompareEnd: () => void;
  viewTransform: ViewTransform;
  onViewTransformChange: (view: ViewTransform) => void;
  straightening?: boolean;
}

interface DragState {
  handle: Handle;
  startSource: { x: number; y: number };
  startBounds: CropState["bounds"];
  geometry: RenderGeometry;
}

interface AdjustGesture {
  initialView: ViewTransform;
  startPoint: { x: number; y: number };
  startCenter?: { x: number; y: number };
  startDistance?: number;
}

const HANDLE_HIT_SIZE = 24;
const HANDLE_VISUAL_SIZE = 20;

function distance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(
  a: { x: number; y: number },
  b: { x: number; y: number },
): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function lerpPoint(
  a: { x: number; y: number },
  b: { x: number; y: number },
  amount: number,
): { x: number; y: number } {
  return {
    x: a.x + (b.x - a.x) * amount,
    y: a.y + (b.y - a.y) * amount,
  };
}

export function Viewport({
  mode,
  crop,
  sourceWidth,
  sourceHeight,
  canvasRef,
  onCropChange,
  onCropCommit,
  comparing,
  rendererStatus,
  onCompareStart,
  onCompareEnd,
  viewTransform,
  onViewTransformChange,
  straightening = false,
}: ViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const adjustGestureRef = useRef<AdjustGesture | null>(null);
  const [interacting, setInteracting] = useState(false);

  const geometryForContainer = useCallback((): RenderGeometry | null => {
    const container = containerRef.current;
    if (!container) return null;
    return computeRenderGeometry({
      sourceWidth,
      sourceHeight,
      crop,
      containerWidth: container.clientWidth,
      containerHeight: container.clientHeight,
      mode,
      viewTransform,
    });
  }, [crop, mode, sourceHeight, sourceWidth, viewTransform]);

  const cropPoints = useCallback(
    (geometry: RenderGeometry) => {
      const container = containerRef.current;
      if (!container) return [];
      const bounds = crop.bounds;
      const sourcePoints = [
        { x: bounds.x, y: bounds.y },
        { x: bounds.x + bounds.width, y: bounds.y },
        { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
        { x: bounds.x, y: bounds.y + bounds.height },
      ];
      return sourcePoints.map((point) => {
        const output = transformPoint(geometry.outputUvFromSource, point);
        return {
          x: geometry.fittedRect.x + output.x * geometry.fittedRect.width,
          y: geometry.fittedRect.y + output.y * geometry.fittedRect.height,
        };
      });
    },
    [crop.bounds],
  );

  const paintOverlay = useCallback(
    (showGrid: boolean) => {
      const overlay = overlayRef.current;
      const container = containerRef.current;
      const geometry = geometryForContainer();
      if (!overlay || !container || !geometry || mode !== "crop") return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (
        overlay.width !== Math.round(width * dpr) ||
        overlay.height !== Math.round(height * dpr)
      ) {
        overlay.width = Math.round(width * dpr);
        overlay.height = Math.round(height * dpr);
        overlay.style.width = `${width}px`;
        overlay.style.height = `${height}px`;
      }
      const ctx = overlay.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const points = cropPoints(geometry);
      if (points.length !== 4) return;

      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.moveTo(points[0]!.x, points[0]!.y);
      for (let index = 1; index < points.length; index += 1) {
        ctx.lineTo(points[index]!.x, points[index]!.y);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(0,0,0,0.64)";
      ctx.fill("evenodd");

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4;
      ctx.strokeStyle = "rgba(255,255,255,0.96)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(points[0]!.x, points[0]!.y);
      points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.closePath();
      ctx.stroke();

      if (showGrid) {
        ctx.strokeStyle = "rgba(255,255,255,0.38)";
        ctx.lineWidth = 1;
        for (const amount of [1 / 3, 2 / 3]) {
          const top = lerpPoint(points[0]!, points[1]!, amount);
          const bottom = lerpPoint(points[3]!, points[2]!, amount);
          const left = lerpPoint(points[0]!, points[3]!, amount);
          const right = lerpPoint(points[1]!, points[2]!, amount);
          ctx.beginPath();
          ctx.moveTo(top.x, top.y);
          ctx.lineTo(bottom.x, bottom.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(left.x, left.y);
          ctx.lineTo(right.x, right.y);
          ctx.stroke();
        }
      }

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.lineCap = "square";
      points.forEach((point, index) => {
        const previous = points[(index + 3) % 4]!;
        const next = points[(index + 1) % 4]!;
        const towardPrevious = lerpPoint(
          point,
          previous,
          HANDLE_VISUAL_SIZE / Math.max(1, distance(point, previous)),
        );
        const towardNext = lerpPoint(
          point,
          next,
          HANDLE_VISUAL_SIZE / Math.max(1, distance(point, next)),
        );
        ctx.beginPath();
        ctx.moveTo(towardPrevious.x, towardPrevious.y);
        ctx.lineTo(point.x, point.y);
        ctx.lineTo(towardNext.x, towardNext.y);
        ctx.stroke();
      });
      ctx.restore();
    },
    [cropPoints, geometryForContainer, mode],
  );

  useEffect(() => {
    paintOverlay(interacting || straightening);
  }, [interacting, paintOverlay, straightening]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() =>
      paintOverlay(interacting || straightening),
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [interacting, paintOverlay, straightening]);

  const hitTest = useCallback(
    (clientX: number, clientY: number): Handle | null => {
      const container = containerRef.current;
      const geometry = geometryForContainer();
      if (!container || !geometry) return null;
      const rect = container.getBoundingClientRect();
      const pointer = { x: clientX - rect.left, y: clientY - rect.top };
      const points = cropPoints(geometry);
      if (points.length !== 4) return null;
      const cornerHandles: Handle[] = ["nw", "ne", "se", "sw"];
      for (let index = 0; index < points.length; index += 1) {
        if (distance(pointer, points[index]!) <= HANDLE_HIT_SIZE) {
          return cornerHandles[index]!;
        }
      }
      const edgeHandles: Handle[] = ["n", "e", "s", "w"];
      for (let index = 0; index < points.length; index += 1) {
        const middle = midpoint(points[index]!, points[(index + 1) % 4]!);
        if (distance(pointer, middle) <= HANDLE_HIT_SIZE) {
          return edgeHandles[index]!;
        }
      }
      const [a, b, c, d] = points;
      const area =
        Math.abs(
          a!.x * b!.y -
            a!.y * b!.x +
            b!.x * c!.y -
            b!.y * c!.x +
            c!.x * d!.y -
            c!.y * d!.x +
            d!.x * a!.y -
            d!.y * a!.x,
        ) / 2;
      const triangleArea = (
        p1: { x: number; y: number },
        p2: { x: number; y: number },
      ) =>
        Math.abs(
          pointer.x * (p1.y - p2.y) +
            p1.x * (p2.y - pointer.y) +
            p2.x * (pointer.y - p1.y),
        ) / 2;
      const sum =
        triangleArea(a!, b!) +
        triangleArea(b!, c!) +
        triangleArea(c!, d!) +
        triangleArea(d!, a!);
      return Math.abs(sum - area) < 1 ? "move" : null;
    },
    [cropPoints, geometryForContainer],
  );

  const pointerToSource = (
    event: ReactPointerEvent<HTMLDivElement>,
    geometry: RenderGeometry,
  ) => {
    const container = containerRef.current!;
    const rect = container.getBoundingClientRect();
    const localX =
      (event.clientX - rect.left - geometry.fittedRect.x) /
      Math.max(1, geometry.fittedRect.width);
    const localY =
      (event.clientY - rect.top - geometry.fittedRect.y) /
      Math.max(1, geometry.fittedRect.height);
    return transformPoint(geometry.sourceUvFromOutput, {
      x: localX,
      y: localY,
    });
  };

  const beginCrop = (event: ReactPointerEvent<HTMLDivElement>) => {
    const handle = hitTest(event.clientX, event.clientY);
    const geometry = geometryForContainer();
    if (!handle || !geometry) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      handle,
      startSource: pointerToSource(event, geometry),
      startBounds: { ...crop.bounds },
      geometry,
    };
    setInteracting(true);
  };

  const moveCrop = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const current = pointerToSource(event, drag.geometry);
    const dx = current.x - drag.startSource.x;
    const dy = current.y - drag.startSource.y;
    const { startBounds, handle } = drag;
    let next = { ...startBounds };

    if (handle === "move") {
      next.x += dx;
      next.y += dy;
    } else {
      if (handle.includes("e")) next.width += dx;
      if (handle.includes("w")) {
        next.x += dx;
        next.width -= dx;
      }
      if (handle.includes("s")) next.height += dy;
      if (handle.includes("n")) {
        next.y += dy;
        next.height -= dy;
      }
      if (next.width < MIN_CROP_SIZE) {
        if (handle.includes("w")) {
          next.x = startBounds.x + startBounds.width - MIN_CROP_SIZE;
        }
        next.width = MIN_CROP_SIZE;
      }
      if (next.height < MIN_CROP_SIZE) {
        if (handle.includes("n")) {
          next.y = startBounds.y + startBounds.height - MIN_CROP_SIZE;
        }
        next.height = MIN_CROP_SIZE;
      }
    }

    next = normalizeBounds(next);
    if (crop.aspect !== "free") {
      const ratio = aspectValue(
        crop.aspect,
        sourceWidth,
        sourceHeight,
        crop.rotation,
      );
      if (ratio !== null) {
        next = fitAspectBounds(
          ratio,
          sourceWidth,
          sourceHeight,
          crop.rotation,
          next,
        );
      }
    }
    onCropChange({ bounds: next }, true);
  };

  const beginAdjust = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const pointers = [...pointersRef.current.values()];
    if (pointers.length === 1) {
      adjustGestureRef.current = {
        initialView: viewTransform,
        startPoint: pointers[0]!,
      };
      if (viewTransform.zoom === 1) onCompareStart();
    } else if (pointers.length === 2) {
      onCompareEnd();
      adjustGestureRef.current = {
        initialView: viewTransform,
        startPoint: pointers[0]!,
        startCenter: midpoint(pointers[0]!, pointers[1]!),
        startDistance: distance(pointers[0]!, pointers[1]!),
      };
    }
  };

  const moveAdjust = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const pointers = [...pointersRef.current.values()];
    const gesture = adjustGestureRef.current;
    if (!gesture) return;
    if (pointers.length === 2 && gesture.startCenter && gesture.startDistance) {
      const center = midpoint(pointers[0]!, pointers[1]!);
      const nextZoom = Math.min(
        5,
        Math.max(
          1,
          gesture.initialView.zoom *
            (distance(pointers[0]!, pointers[1]!) / gesture.startDistance),
        ),
      );
      onViewTransformChange({
        zoom: nextZoom,
        panX: gesture.initialView.panX + center.x - gesture.startCenter.x,
        panY: gesture.initialView.panY + center.y - gesture.startCenter.y,
      });
    } else if (pointers.length === 1 && viewTransform.zoom > 1) {
      onCompareEnd();
      onViewTransformChange({
        ...viewTransform,
        panX: gesture.initialView.panX + pointers[0]!.x - gesture.startPoint.x,
        panY: gesture.initialView.panY + pointers[0]!.y - gesture.startPoint.y,
      });
    }
  };

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (mode === "crop" && dragRef.current) {
      dragRef.current = null;
      setInteracting(false);
      onCropCommit();
    }
    pointersRef.current.delete(event.pointerId);
    adjustGestureRef.current = null;
    onCompareEnd();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.code === "Space" && mode === "adjust") {
      event.preventDefault();
      onCompareStart();
    }
    if ((event.key === "+" || event.key === "=") && mode === "adjust") {
      onViewTransformChange({
        ...viewTransform,
        zoom: Math.min(5, viewTransform.zoom + 0.5),
      });
    }
    if (event.key === "-" && mode === "adjust") {
      const zoom = Math.max(1, viewTransform.zoom - 0.5);
      onViewTransformChange({
        zoom,
        panX: zoom === 1 ? 0 : viewTransform.panX,
        panY: zoom === 1 ? 0 : viewTransform.panY,
      });
    }
    if (event.key === "0" && mode === "adjust") {
      onViewTransformChange({ zoom: 1, panX: 0, panY: 0 });
    }
    if (
      mode === "crop" &&
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    ) {
      event.preventDefault();
      const multiplier = event.shiftKey ? 10 : 1;
      if (event.altKey) {
        const widthDelta =
          event.key === "ArrowLeft"
            ? -multiplier / sourceWidth
            : event.key === "ArrowRight"
              ? multiplier / sourceWidth
              : 0;
        const heightDelta =
          event.key === "ArrowUp"
            ? -multiplier / sourceHeight
            : event.key === "ArrowDown"
              ? multiplier / sourceHeight
              : 0;
        let resized = normalizeBounds({
          ...crop.bounds,
          width: Math.max(MIN_CROP_SIZE, crop.bounds.width + widthDelta),
          height: Math.max(MIN_CROP_SIZE, crop.bounds.height + heightDelta),
        });
        const ratio = aspectValue(
          crop.aspect,
          sourceWidth,
          sourceHeight,
          crop.rotation,
        );
        if (ratio !== null) {
          resized = fitAspectBounds(
            ratio,
            sourceWidth,
            sourceHeight,
            crop.rotation,
            resized,
          );
        }
        onCropChange({ bounds: resized }, false);
        return;
      }
      const dx =
        event.key === "ArrowLeft"
          ? -multiplier / sourceWidth
          : event.key === "ArrowRight"
            ? multiplier / sourceWidth
            : 0;
      const dy =
        event.key === "ArrowUp"
          ? -multiplier / sourceHeight
          : event.key === "ArrowDown"
            ? multiplier / sourceHeight
            : 0;
      onCropChange(
        {
          bounds: normalizeBounds({
            ...crop.bounds,
            x: crop.bounds.x + dx,
            y: crop.bounds.y + dy,
          }),
        },
        false,
      );
    }
  };

  const cropWidth = Math.max(1, Math.round(sourceWidth * crop.bounds.width));
  const cropHeight = Math.max(1, Math.round(sourceHeight * crop.bounds.height));
  const cropLabel =
    crop.rotation === 90 || crop.rotation === 270
      ? `${cropHeight} × ${cropWidth}`
      : `${cropWidth} × ${cropHeight}`;
  const loading =
    rendererStatus === "loading" || rendererStatus === "recovering";

  const shortcutsId = "viewport-keyboard-shortcuts";

  return (
    <div
      ref={containerRef}
      className="se-viewport relative min-h-0 flex-1 overflow-hidden"
      tabIndex={0}
      role="application"
      aria-label="Photo editing viewport"
      aria-describedby={shortcutsId}
      onPointerDown={(event) =>
        mode === "crop" ? beginCrop(event) : beginAdjust(event)
      }
      onPointerMove={(event) =>
        mode === "crop" ? moveCrop(event) : moveAdjust(event)
      }
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onDoubleClick={() => {
        if (mode !== "adjust") return;
        onViewTransformChange(
          viewTransform.zoom === 1
            ? { zoom: 2, panX: 0, panY: 0 }
            : { zoom: 1, panX: 0, panY: 0 },
        );
      }}
      onKeyDown={handleKeyDown}
      onKeyUp={(event) => {
        if (event.code === "Space") onCompareEnd();
      }}
    >
      <p id={shortcutsId} className="sr-only">
        Keyboard shortcuts: Space compares the original in adjust mode. Plus or
        equals zooms in, minus zooms out, zero fits. In crop mode, arrow keys
        move the crop and Alt plus arrows resize it; Shift plus arrows move
        faster.
      </p>
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full transition-opacity duration-200 ${
          rendererStatus === "ready" ? "opacity-100" : "opacity-0"
        }`}
        role="img"
        aria-label="Photo preview"
      />

      {loading ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div
            role="status"
            className="se-glass flex items-center gap-3 rounded-full px-4 py-2 text-sm text-[var(--se-fg)]/70"
          >
            <Spinner size={18} decorative />
            Preparing preview
          </div>
        </div>
      ) : null}

      {rendererStatus === "error" ? (
        <div
          role="alert"
          className="pointer-events-none absolute inset-0 grid place-items-center px-8 text-center text-sm text-balance text-[var(--se-danger)]"
        >
          The photo preview could not be prepared.
        </div>
      ) : null}

      {mode === "crop" ? (
        <>
          <canvas
            ref={overlayRef}
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden
          />
          {interacting || straightening ? (
            <div className="pointer-events-none absolute left-1/2 top-[calc(0.75rem+env(safe-area-inset-top,0px))] -translate-x-1/2 rounded-full bg-black/65 px-3 py-1 text-[12px] tabular-nums whitespace-nowrap text-white backdrop-blur-md">
              {cropLabel}
            </div>
          ) : null}
        </>
      ) : null}

      {comparing ? (
        <div className="pointer-events-none absolute left-1/2 top-[calc(0.75rem+env(safe-area-inset-top,0px))] -translate-x-1/2 rounded-full bg-black/65 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-white backdrop-blur-md">
          ORIGINAL
        </div>
      ) : null}

      {mode === "adjust" && viewTransform.zoom > 1 ? (
        <button
          type="button"
          className="absolute bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] end-[calc(0.75rem+env(safe-area-inset-right,0px))] min-h-10 rounded-full bg-black/65 px-3 text-[12px] font-medium tabular-nums whitespace-nowrap text-white backdrop-blur-md"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onViewTransformChange({ zoom: 1, panX: 0, panY: 0 })}
        >
          {viewTransform.zoom.toFixed(1)}× · Fit
        </button>
      ) : null}
    </div>
  );
}
