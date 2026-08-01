import type { ProjectState } from "../editor/types";

const DB_NAME = "simplyedit";
const DB_VERSION = 1;
const STORE = "draft";
const DRAFT_KEY = "active";

export interface StoredDraft {
  schemaVersion: 1;
  id: string;
  source: {
    name: string;
    mimeType: string;
    width: number;
    height: number;
    blob: Blob;
  };
  adjustments: ProjectState["adjustments"];
  crop: ProjectState["crop"];
  updatedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("idb open failed"));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("idb request failed"));
  });
}

export async function saveDraft(project: ProjectState): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const draft: StoredDraft = {
      schemaVersion: 1,
      id: project.id,
      source: {
        name: project.source.name,
        mimeType: project.source.mimeType,
        width: project.source.width,
        height: project.source.height,
        blob: project.source.blob,
      },
      adjustments: { ...project.adjustments },
      crop: {
        ...project.crop,
        bounds: { ...project.crop.bounds },
      },
      updatedAt: project.updatedAt,
    };
    await req(store.put(draft, DRAFT_KEY));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("idb tx failed"));
    });
  } finally {
    db.close();
  }
}

export async function loadDraft(): Promise<ProjectState | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const draft = await req(store.get(DRAFT_KEY));
    if (!draft || draft.schemaVersion !== 1) return null;
    return draft as ProjectState;
  } finally {
    db.close();
  }
}

export async function clearDraft(): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    await req(store.delete(DRAFT_KEY));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("idb tx failed"));
    });
  } finally {
    db.close();
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      return await navigator.storage.persist();
    }
  } catch {
    // ignore
  }
  return false;
}
