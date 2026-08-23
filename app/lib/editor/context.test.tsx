import "fake-indexeddb/auto";
import { act, renderHook, waitFor } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorProvider, useEditor } from "./context";
import { createDefaultAdjustments, createDefaultCrop } from "./defaults";
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

/** Names of the databases this origin currently has. */
function databaseNames(): Promise<string[]> {
  return indexedDB.databases().then((info) =>
    info.map((entry) => entry.name ?? ""),
  );
}

/** Writes a draft the way the retired autosave used to. */
async function writeLegacyDraft(): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("raspy", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("draft");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("draft", "readwrite");
    tx.objectStore("draft").put({ schemaVersion: 1, id: "old" }, "active");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

describe("photos on disk", () => {
  it("writes nothing while a project is edited", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const { result } = renderHook(() => useEditor(), { wrapper });
      act(() => {
        result.current.dispatch({
          type: "LOAD_PROJECT",
          project: makeProject(),
        });
      });
      act(() => {
        result.current.setAdjustment("exposure", 0.4);
      });
      // Well past the debounce autosave used to run on.
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
    } finally {
      vi.useRealTimers();
    }

    await expect(databaseNames()).resolves.not.toContain("raspy");
  });

  it("clears a photo an older version left behind", async () => {
    await writeLegacyDraft();
    await expect(databaseNames()).resolves.toContain("raspy");

    renderHook(() => useEditor(), { wrapper });

    await waitFor(async () => {
      expect(await databaseNames()).not.toContain("raspy");
    });
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

  it("clearing the project empties the editor", async () => {
    const { result } = renderHook(() => useEditor(), { wrapper });
    act(() => {
      result.current.dispatch({ type: "LOAD_PROJECT", project: makeProject() });
    });

    await act(async () => {
      await result.current.clearProject();
    });

    expect(result.current.state.project).toBeNull();
  });
});
