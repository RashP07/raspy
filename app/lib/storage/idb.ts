/**
 * Cleanup for the draft store Raspy used to keep.
 *
 * Autosave wrote the original file plus its adjustments to IndexedDB so a
 * closed tab could be picked back up. That feature is gone, which leaves the
 * photos it already wrote sitting on disk with nothing in the app able to
 * reach them — the worst of both halves for an editor whose whole claim is
 * that pictures stay on your device and under your control. So the database
 * goes too, on the next visit after the update.
 */

const DB_NAME = "raspy";

/**
 * Drops the draft database if one is still there.
 *
 * Resolves rather than rejects on every failure path, including `blocked`,
 * which fires when another tab still holds the database open. Nothing depends
 * on the delete having happened — the next visit tries again — so a version
 * of this that could hang or throw would only be a way to break startup.
 */
export function purgeStoredDraft(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve();
      return;
    }
    try {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      // Another tab has it open. It will be deleted when that tab lets go;
      // either way this one is done waiting.
      request.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}
