import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { purgeStoredDraft } from "./idb";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

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
    tx.objectStore("draft").put(
      { schemaVersion: 1, id: "old", blob: new Blob(["pixels"]) },
      "active",
    );
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

function databaseNames(): Promise<string[]> {
  return indexedDB.databases().then((info) =>
    info.map((entry) => entry.name ?? ""),
  );
}

describe("purgeStoredDraft", () => {
  it("removes a photo left behind by the retired autosave", async () => {
    await writeLegacyDraft();
    await expect(databaseNames()).resolves.toContain("raspy");

    await purgeStoredDraft();

    await expect(databaseNames()).resolves.not.toContain("raspy");
  });

  it("is a no-op when there is nothing to remove", async () => {
    await expect(purgeStoredDraft()).resolves.toBeUndefined();
    await expect(databaseNames()).resolves.not.toContain("raspy");
  });

  it("resolves rather than throwing when IndexedDB refuses", async () => {
    // Private mode and a blocked-storage profile both look like this. Startup
    // awaits nothing here, but a rejection would still surface unhandled.
    globalThis.indexedDB = {
      deleteDatabase: () => {
        throw new Error("access denied");
      },
    } as unknown as IDBFactory;

    await expect(purgeStoredDraft()).resolves.toBeUndefined();
  });
});
