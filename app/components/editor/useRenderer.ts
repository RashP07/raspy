"use client";

import { useCallback, useEffect, useRef } from "react";
import { createRenderer } from "@/app/lib/render/createRenderer";
import type {
  EditorMode,
  ExportDimensions,
  ExportOptions,
  PhotoRenderer,
  ProjectState,
  ViewTransform,
} from "@/app/lib/editor/types";

export interface UseRendererResult {
  canvasRef: (node: HTMLCanvasElement | null) => void;
  exportPhoto: (
    options: ExportOptions,
    signal: AbortSignal,
    onProgress?: (progress: number) => void,
  ) => Promise<Blob>;
  getExportDimensions: (options: ExportOptions) => ExportDimensions | null;
}

/**
 * Owns the WebGL/canvas renderer lifecycle and coalesces paints to rAF.
 * The render layer selects WebGL2 or the geometry-compatible Canvas fallback.
 */
export function useRenderer(
  project: ProjectState | null,
  comparing: boolean,
  mode: EditorMode,
  viewTransform: ViewTransform,
  onStatusChange?: (
    status: "idle" | "loading" | "ready" | "recovering" | "error",
  ) => void,
): UseRendererResult {
  const canvasNodeRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<PhotoRenderer | null>(null);
  const projectRef = useRef(project);
  const comparingRef = useRef(comparing);
  const modeRef = useRef(mode);
  const viewTransformRef = useRef(viewTransform);
  const onStatusChangeRef = useRef(onStatusChange);
  const rafRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const loadedIdRef = useRef<string | null>(null);
  const readyRef = useRef(false);

  const scheduleRender = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const renderer = rendererRef.current;
      const current = projectRef.current;
      if (!renderer || !current || !readyRef.current) return;
      renderer.render(current, {
        compare: comparingRef.current,
        mode: modeRef.current,
        viewTransform: viewTransformRef.current,
      });
    });
  }, []);

  const canvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      if (canvasNodeRef.current === node) return;

      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
        readyRef.current = false;
        loadedIdRef.current = null;
      }
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;

      canvasNodeRef.current = node;
      if (!node) return;

      try {
        const renderer = createRenderer(node);
        rendererRef.current = renderer;
        const parent = node.parentElement;
        if (parent) {
          resizeObserverRef.current = new ResizeObserver(scheduleRender);
          resizeObserverRef.current.observe(parent);
        }
        // Notify editor if adjustments are unavailable (Canvas2D fallback)
        window.dispatchEvent(
          new CustomEvent("simplyedit:renderer-capability", {
            detail: { supportsAdjustments: renderer.supportsAdjustments },
          }),
        );
      } catch {
        rendererRef.current = null;
        window.dispatchEvent(
          new CustomEvent("simplyedit:renderer-capability", {
            detail: { supportsAdjustments: false },
          }),
        );
      }
    },
    [scheduleRender],
  );

  const projectId = project?.id ?? null;
  const source = project?.source;

  useEffect(() => {
    projectRef.current = project;
    comparingRef.current = comparing;
    modeRef.current = mode;
    viewTransformRef.current = viewTransform;
    onStatusChangeRef.current = onStatusChange;
    scheduleRender();
  }, [project, comparing, mode, viewTransform, onStatusChange, scheduleRender]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!projectId || !source || !renderer) {
      if (!projectId) {
        readyRef.current = false;
        loadedIdRef.current = null;
        onStatusChangeRef.current?.("idle");
      }
      return;
    }

    let cancelled = false;

    void (async () => {
      if (loadedIdRef.current === projectId) {
        readyRef.current = true;
        scheduleRender();
        return;
      }
      readyRef.current = false;
      onStatusChangeRef.current?.("loading");
      try {
        await renderer.load(source);
      } catch {
        if (!cancelled) {
          readyRef.current = false;
          onStatusChangeRef.current?.("error");
        }
        return;
      }
      if (cancelled) return;
      loadedIdRef.current = projectId;
      readyRef.current = true;
      const current = projectRef.current;
      if (current) {
        renderer.render(current, {
          compare: comparingRef.current,
          mode: modeRef.current,
          viewTransform: viewTransformRef.current,
        });
      }
      onStatusChangeRef.current?.("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, source, scheduleRender]);

  useEffect(() => {
    scheduleRender();
  }, [
    project?.adjustments,
    project?.crop,
    project?.updatedAt,
    comparing,
    mode,
    viewTransform,
    scheduleRender,
  ]);

  useEffect(() => {
    const onRecovered = () => scheduleRender();
    window.addEventListener("simplyedit:renderer-recovered", onRecovered);
    return () =>
      window.removeEventListener("simplyedit:renderer-recovered", onRecovered);
  }, [scheduleRender]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      resizeObserverRef.current?.disconnect();
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);

  const exportPhoto = useCallback(
    async (
      options: ExportOptions,
      signal: AbortSignal,
      onProgress?: (progress: number) => void,
    ) => {
      const renderer = rendererRef.current;
      const current = projectRef.current;
      if (!renderer || !current) {
        throw new Error("Renderer not ready");
      }
      return renderer.export(current, options, signal, onProgress);
    },
    [],
  );

  const getExportDimensions = useCallback(
    (options: ExportOptions): ExportDimensions | null => {
      const renderer = rendererRef.current;
      const current = projectRef.current;
      if (!renderer || !current) return null;
      return renderer.getExportDimensions(current, options);
    },
    [],
  );

  return {
    canvasRef,
    exportPhoto,
    getExportDimensions,
  };
}

export function usePhotoExport(
  exportPhoto: UseRendererResult["exportPhoto"] | null,
) {
  return useCallback(
    async (
      options: ExportOptions,
      signal: AbortSignal,
      onProgress?: (progress: number) => void,
    ) => {
      if (!exportPhoto) {
        throw new Error("Export not wired: renderer unavailable");
      }
      return exportPhoto(options, signal, onProgress);
    },
    [exportPhoto],
  );
}
