import "fake-indexeddb/auto";
import { act, renderHook, waitFor } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorProvider, useEditor } from "./context";
import { createDefaultAdjustments, createDefaultCrop } from "./defaults";
import { loadDraft, saveDraft } from "@/app/lib/storage/idb";
import type { ProjectState } from "./types";

const wrapper = ({ children }: { children: ReactNode }) => (
  <EditorProvider>{children}</EditorProvider>
);

function makeProject(id = "project-1"): ProjectState {
  return {
    schemaVersion: 1,
    id,
    source: {
      name: "photo.jpg",
      mimeType: "image/jpeg",
      width: 100,
      height: 80,
      blob: new Blob(["pixels"], { type: "image/jpeg" }),
    },
    adjustments: createDefaultAdjustments(),
    crop: createDefaultCrop(),
    updatedAt: 1_700_000_000_000,
  };
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe("autosave", () => {
  it("waits for the debounce before writing", async () => {
    // Fake only the debounce's own timers: fake-indexeddb schedules its
    // callbacks on setImmediate, and faking that deadlocks every IDB request.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const { result } = renderHook(() => useEditor(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: "LOAD_PROJECT",
          project: makeProject(),
        });
      });

      // Well short of AUTOSAVE_MS — nothing should be on disk yet.
      await act(async () => {
        vi.advanceTimersByTime(400);
      });
      await expect(loadDraft()).resolves.toBeNull();

      await act(async () => {
        vi.advanceTimersByTime(200);
      });
      await vi.waitFor(async () => {
        expect(await loadDraft()).not.toBeNull();
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("collapses a burst of edits into a single write", async () => {
    // Fake only the debounce's own timers: fake-indexeddb schedules its
    // callbacks on setImmediate, and faking that deadlocks every IDB request.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const { result } = renderHook(() => useEditor(), { wrapper });
      act(() => {
        result.current.dispatch({
          type: "LOAD_PROJECT",
          project: makeProject(),
        });
      });

      // Each edit restarts the timer, so only the last value is ever written.
      for (const exposure of [0.1, 0.2, 0.3, 0.4]) {
        act(() => {
          result.current.setAdjustment("exposure", exposure);
        });
        await act(async () => {
          vi.advanceTimersByTime(100);
        });
      }
      await expect(loadDraft()).resolves.toBeNull();

      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      await vi.waitFor(async () => {
        const draft = await loadDraft();
        expect(draft?.adjustments.exposure).toBe(0.4);
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("warns instead of throwing when the write fails", async () => {
    const { result } = renderHook(() => useEditor(), { wrapper });

    // Break IndexedDB the way a quota failure or private mode would.
    globalThis.indexedDB = {
      open: () => {
        throw new Error("quota exceeded");
      },
    } as unknown as IDBFactory;

    act(() => {
      result.current.dispatch({ type: "LOAD_PROJECT", project: makeProject() });
    });

    await waitFor(
      () => {
        expect(result.current.state.ui.storageWarning?.message).toMatch(
          /Autosave failed/i,
        );
      },
      { timeout: 3000 },
    );
  });
});

describe("draft restore", () => {
  it("offers a saved draft without opening it", async () => {
    await saveDraft(makeProject("saved-draft"));

    const { result } = renderHook(() => useEditor(), { wrapper });

    await waitFor(() => {
      expect(result.current.draftAvailable?.id).toBe("saved-draft");
    });
    // Opting in is the user's call — nothing is loaded until they ask.
    expect(result.current.state.project).toBeNull();
    expect(result.current.state.ui.draftRestored).toBe(false);

    act(() => {
      result.current.restoreDraft();
    });

    expect(result.current.state.project?.id).toBe("saved-draft");
    expect(result.current.state.ui.draftRestored).toBe(true);
  });

  it("offers nothing when the store is empty", async () => {
    const { result } = renderHook(() => useEditor(), { wrapper });
    await waitFor(() => {
      expect(result.current.state.ui.hasWebGL).toBeDefined();
    });
    expect(result.current.draftAvailable).toBeNull();
  });
});

describe("history through the provider", () => {
  it("exposes undo and redo availability", async () => {
    const { result } = renderHook(() => useEditor(), { wrapper });
    act(() => {
      result.current.dispatch({ type: "LOAD_PROJECT", project: makeProject() });
    });

    expect(result.current.canUndo).toBe(false);

    act(() => {
      result.current.setAdjustment("contrast", 30, false);
    });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.undo();
    });
    expect(result.current.state.project?.adjustments.contrast).toBe(0);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });
    expect(result.current.state.project?.adjustments.contrast).toBe(30);
  });

  it("clearing the project drops the saved draft too", async () => {
    await saveDraft(makeProject("to-clear"));
    const { result } = renderHook(() => useEditor(), { wrapper });

    await act(async () => {
      await result.current.clearProject();
    });

    expect(result.current.state.project).toBeNull();
    await expect(loadDraft()).resolves.toBeNull();
  });
});
