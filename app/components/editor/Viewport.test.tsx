import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Viewport } from "./Viewport";
import { createDefaultCrop } from "@/app/lib/editor/defaults";
import type { CropState } from "@/app/lib/editor/types";

const SOURCE_WIDTH = 1000;
const SOURCE_HEIGHT = 800;

function renderViewport(
  overrides: {
    mode?: "adjust" | "crop";
    crop?: Partial<CropState>;
    onCropChange?: (crop: Partial<CropState>, coalesce?: boolean) => void;
    onCompareStart?: () => void;
    onCompareEnd?: () => void;
    onViewTransformChange?: (view: {
      zoom: number;
      panX: number;
      panY: number;
    }) => void;
    zoom?: number;
  } = {},
) {
  // Always wrap, so callers get a Mock back whether or not they passed a spy.
  const onCropChange = vi.fn(overrides.onCropChange);
  const onViewTransformChange = vi.fn(overrides.onViewTransformChange);
  const onCompareStart = vi.fn(overrides.onCompareStart);
  const onCompareEnd = vi.fn(overrides.onCompareEnd);

  render(
    <Viewport
      mode={overrides.mode ?? "crop"}
      crop={{
        ...createDefaultCrop(),
        bounds: { x: 0.2, y: 0.2, width: 0.5, height: 0.5 },
        ...overrides.crop,
      }}
      sourceWidth={SOURCE_WIDTH}
      sourceHeight={SOURCE_HEIGHT}
      canvasRef={() => {}}
      canvasKey={0}
      onCropChange={onCropChange}
      onCropCommit={vi.fn()}
      comparing={false}
      rendererStatus="ready"
      onCompareStart={onCompareStart}
      onCompareEnd={onCompareEnd}
      viewTransform={{ zoom: overrides.zoom ?? 1, panX: 0, panY: 0 }}
      onViewTransformChange={onViewTransformChange}
    />,
  );

  return {
    canvas: screen.getByRole("application"),
    onCropChange,
    onViewTransformChange,
    onCompareStart,
    onCompareEnd,
  };
}

/** The last bounds the component asked for. */
function lastBounds(onCropChange: {
  mock: { calls: unknown[][] };
}): CropState["bounds"] {
  const calls = onCropChange.mock.calls;
  const latest = calls[calls.length - 1][0] as Partial<CropState>;
  return latest.bounds as CropState["bounds"];
}

describe("crop keyboard", () => {
  it("moves the crop by one source pixel per arrow press", () => {
    const { canvas, onCropChange } = renderViewport();

    fireEvent.keyDown(canvas, { key: "ArrowRight" });

    expect(onCropChange).toHaveBeenCalledTimes(1);
    expect(lastBounds(onCropChange).x).toBeCloseTo(0.2 + 1 / SOURCE_WIDTH, 6);
  });

  it("moves ten times as far with shift held", () => {
    const { canvas, onCropChange } = renderViewport();

    fireEvent.keyDown(canvas, { key: "ArrowDown", shiftKey: true });

    expect(lastBounds(onCropChange).y).toBeCloseTo(0.2 + 10 / SOURCE_HEIGHT, 6);
  });

  it("moves in the direction pressed", () => {
    const { canvas, onCropChange } = renderViewport();

    fireEvent.keyDown(canvas, { key: "ArrowLeft" });
    expect(lastBounds(onCropChange).x).toBeCloseTo(0.2 - 1 / SOURCE_WIDTH, 6);

    fireEvent.keyDown(canvas, { key: "ArrowUp" });
    expect(lastBounds(onCropChange).y).toBeCloseTo(0.2 - 1 / SOURCE_HEIGHT, 6);
  });

  it("resizes rather than moves when alt is held", () => {
    const { canvas, onCropChange } = renderViewport();

    fireEvent.keyDown(canvas, { key: "ArrowRight", altKey: true });

    const bounds = lastBounds(onCropChange);
    expect(bounds.width).toBeGreaterThan(0.5);
    expect(bounds.height).toBeCloseTo(0.5, 6);
  });

  it("will not shrink the crop below the minimum", () => {
    const { canvas, onCropChange } = renderViewport({
      crop: { bounds: { x: 0.4, y: 0.4, width: 0.05, height: 0.05 } },
    });

    fireEvent.keyDown(canvas, { key: "ArrowLeft", altKey: true });

    expect(lastBounds(onCropChange).width).toBeGreaterThanOrEqual(0.05);
  });

  it("keeps the crop inside the photo at the edge", () => {
    const { canvas, onCropChange } = renderViewport({
      crop: { bounds: { x: 0, y: 0, width: 0.5, height: 0.5 } },
    });

    fireEvent.keyDown(canvas, { key: "ArrowLeft" });

    const bounds = lastBounds(onCropChange);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
  });

  it("holds the aspect ratio while resizing", () => {
    const { canvas, onCropChange } = renderViewport({
      crop: {
        aspect: "1:1",
        bounds: { x: 0.2, y: 0.2, width: 0.4, height: 0.5 },
      },
    });

    fireEvent.keyDown(canvas, { key: "ArrowRight", altKey: true });

    const bounds = lastBounds(onCropChange);
    const pixelAspect =
      (bounds.width * SOURCE_WIDTH) / (bounds.height * SOURCE_HEIGHT);
    expect(pixelAspect).toBeCloseTo(1, 2);
  });

  it("ignores arrows while adjusting, so they stay free for the panel", () => {
    const { canvas, onCropChange } = renderViewport({ mode: "adjust" });

    fireEvent.keyDown(canvas, { key: "ArrowRight" });

    expect(onCropChange).not.toHaveBeenCalled();
  });
});

describe("adjust-mode keyboard", () => {
  it("compares the original while space is held", () => {
    const { canvas, onCompareStart, onCompareEnd } = renderViewport({
      mode: "adjust",
    });

    fireEvent.keyDown(canvas, { code: "Space" });
    expect(onCompareStart).toHaveBeenCalledTimes(1);
    expect(onCompareEnd).not.toHaveBeenCalled();

    fireEvent.keyUp(canvas, { code: "Space" });
    expect(onCompareEnd).toHaveBeenCalledTimes(1);
  });

  it("does not compare in crop mode", () => {
    const { canvas, onCompareStart } = renderViewport({ mode: "crop" });

    fireEvent.keyDown(canvas, { code: "Space" });
    expect(onCompareStart).not.toHaveBeenCalled();
  });

  it("zooms in and out, and fits with zero", () => {
    const onViewTransformChange = vi.fn();
    const { canvas } = renderViewport({
      mode: "adjust",
      zoom: 2,
      onViewTransformChange,
    });

    fireEvent.keyDown(canvas, { key: "+" });
    expect(onViewTransformChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ zoom: 2.5 }),
    );

    fireEvent.keyDown(canvas, { key: "-" });
    expect(onViewTransformChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ zoom: 1.5 }),
    );

    fireEvent.keyDown(canvas, { key: "0" });
    expect(onViewTransformChange).toHaveBeenLastCalledWith({
      zoom: 1,
      panX: 0,
      panY: 0,
    });
  });

  it("clamps zoom to the 1..5 range", () => {
    const onViewTransformChange = vi.fn();
    const { canvas } = renderViewport({
      mode: "adjust",
      zoom: 5,
      onViewTransformChange,
    });

    fireEvent.keyDown(canvas, { key: "+" });
    expect(onViewTransformChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ zoom: 5 }),
    );
  });

  it("resets pan when zooming back out to fit", () => {
    const onViewTransformChange = vi.fn();
    const { canvas } = renderViewport({
      mode: "adjust",
      zoom: 1.5,
      onViewTransformChange,
    });

    fireEvent.keyDown(canvas, { key: "-" });
    expect(onViewTransformChange).toHaveBeenLastCalledWith({
      zoom: 1,
      panX: 0,
      panY: 0,
    });
  });
});

describe("accessibility", () => {
  it("is focusable and describes its shortcuts", () => {
    const { canvas } = renderViewport();

    expect(canvas).toHaveAttribute("tabindex", "0");
    expect(canvas).toHaveAccessibleName("Photo canvas");

    const described = canvas.getAttribute("aria-describedby");
    expect(described).toBeTruthy();
    expect(document.getElementById(described as string)).toHaveTextContent(
      /arrow keys move the crop/i,
    );
  });

  it("labels the preview for screen readers", () => {
    renderViewport();

    expect(
      screen.getByRole("img", { name: /photo preview/i }),
    ).toBeInTheDocument();
  });
});
