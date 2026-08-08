import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { clearDraft, loadDraft, saveDraft } from "./idb";
import {
  createDefaultAdjustments,
  createDefaultCrop,
} from "@/app/lib/editor/defaults";
import type { ProjectState } from "@/app/lib/editor/types";

function makeProject(overrides: Partial<ProjectState> = {}): ProjectState {
  return {
    schemaVersion: 1,
    id: "project-1",
    source: {
      name: "photo.heic",
      mimeType: "image/heic",
      width: 4032,
      height: 3024,
      blob: new Blob(["pixels"], { type: "image/heic" }),
    },
    adjustments: createDefaultAdjustments(),
    crop: createDefaultCrop(),
    updatedAt: 1_700_000_000_000,
    ...overrides,
  };
}

beforeEach(() => {
  // Each test gets an empty database rather than inheriting the last one's.
  globalThis.indexedDB = new IDBFactory();
});

describe("draft persistence", () => {
  it("returns null when nothing has been saved", async () => {
    await expect(loadDraft()).resolves.toBeNull();
  });

  it("round-trips a project through IndexedDB", async () => {
    const project = makeProject({
      adjustments: { ...createDefaultAdjustments(), exposure: 0.5 },
    });

    await saveDraft(project);
    const restored = await loadDraft();

    expect(restored).not.toBeNull();
    expect(restored?.id).toBe("project-1");
    expect(restored?.adjustments.exposure).toBe(0.5);
    expect(restored?.source.name).toBe("photo.heic");
    expect(restored?.source.width).toBe(4032);
    expect(restored?.updatedAt).toBe(1_700_000_000_000);
  });

  it("stores the source blob, not a decoded bitmap", async () => {
    await saveDraft(makeProject());
    const restored = await loadDraft();

    expect(restored?.source.blob).toBeInstanceOf(Blob);
    await expect(restored?.source.blob.text()).resolves.toBe("pixels");
    // `preview` is an in-memory ImageBitmap and must never be persisted.
    expect(restored?.source).not.toHaveProperty("preview");
  });

  it("keeps only the newest draft", async () => {
    await saveDraft(makeProject({ id: "first" }));
    await saveDraft(makeProject({ id: "second" }));

    const restored = await loadDraft();
    expect(restored?.id).toBe("second");
  });

  it("copies crop bounds instead of aliasing the live object", async () => {
    const project = makeProject();
    await saveDraft(project);
    // Mutating after the save must not reach through to the stored record.
    project.crop.bounds.x = 0.9;

    const restored = await loadDraft();
    expect(restored?.crop.bounds.x).toBe(0);
  });

  it("rejects a draft written by a different schema version", async () => {
    await saveDraft(makeProject());

    // Simulate an older build's record surviving an upgrade.
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("raspy", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("draft", "readwrite");
      tx.objectStore("draft").put({ schemaVersion: 99, id: "old" }, "active");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();

    await expect(loadDraft()).resolves.toBeNull();
  });

  it("clears the saved draft", async () => {
    await saveDraft(makeProject());
    await expect(loadDraft()).resolves.not.toBeNull();

    await clearDraft();
    await expect(loadDraft()).resolves.toBeNull();
  });

  it("clearing an empty store is not an error", async () => {
    await expect(clearDraft()).resolves.toBeUndefined();
  });
});
