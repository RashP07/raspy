import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExportSheet } from "./ExportSheet";
import type { CropState } from "@/app/lib/editor/types";

const CROP: CropState = {
  bounds: { x: 0, y: 0, width: 1, height: 1 },
  aspect: "original",
  rotation: 0,
  straighten: 0,
  flipX: false,
  flipY: false,
};

function setShareSupport(supported: boolean) {
  if (supported) {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: vi.fn(async () => undefined),
    });
  } else {
    Reflect.deleteProperty(navigator as unknown as object, "share");
  }
}

function renderSheet(onExport = vi.fn()) {
  render(
    <ExportSheet
      open
      onOpenChange={vi.fn()}
      onExport={onExport}
      progress={null}
      sourceWidth={3000}
      sourceHeight={2000}
      crop={CROP}
    />,
  );
  return onExport;
}

afterEach(() => {
  setShareSupport(false);
});

describe("save actions", () => {
  it("offers Download alongside Share where sharing exists", async () => {
    setShareSupport(true);
    const onExport = renderSheet();

    await userEvent.click(screen.getByRole("button", { name: "Download" }));

    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
    expect(onExport).toHaveBeenCalledWith(expect.anything(), "download");
  });

  it("shares only when Share is the button that was pressed", async () => {
    setShareSupport(true);
    const onExport = renderSheet();

    await userEvent.click(screen.getByRole("button", { name: "Share" }));

    expect(onExport).toHaveBeenCalledWith(expect.anything(), "share");
  });

  it("offers a single Download where the platform cannot share", () => {
    setShareSupport(false);
    renderSheet();

    expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Download" })).toHaveLength(1);
  });
});
