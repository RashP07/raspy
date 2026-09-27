"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { unlockTickAudio } from "@/app/lib/audio/tick";
import { IconProvider } from "@/components/ui/icon-context";
import { EditorProvider, useEditor } from "@/app/lib/editor/context";
import { ImportError } from "@/app/lib/image/decode";
import { ImportScreen } from "./ImportScreen";

let editorModule: Promise<typeof import("./LoadedEditor")> | null = null;

/**
 * Starts fetching the editing chrome and renderer. Idempotent, so it is safe
 * to call from every gesture that hints a photo is about to be opened.
 */
function preloadEditor() {
  editorModule ??= import("./LoadedEditor");
  return editorModule;
}

const LoadedEditor = lazy(preloadEditor);

function EditorLoading() {
  return (
    <div
      role="status"
      className="flex h-full w-full items-center justify-center gap-3 bg-bg text-muted"
    >
      <Spinner size={20} decorative />
      <p className="text-body">Opening editor…</p>
    </div>
  );
}

interface EditorAppInnerProps {
  landing?: ReactNode;
}

function EditorAppInner({ landing }: EditorAppInnerProps) {
  const { state, importFile, clearProject } = useEditor();
  const { showToast } = useToast();
  const [importError, setImportError] = useState<string | null>(null);

  // Mobile browsers start every AudioContext suspended and only let it resume
  // inside a gesture. The individual controls unlock on their own handlers,
  // but on a phone the first thing touched is usually the photo or a menu, so
  // claim the very first gesture of the session instead of the first slider.
  // iOS also suspends on backgrounding, hence re-arming when the page returns.
  useEffect(() => {
    const unlock = () => unlockTickAudio();
    const events = ["pointerdown", "touchstart", "keydown"] as const;
    for (const type of events) {
      window.addEventListener(type, unlock, { capture: true, passive: true });
    }
    document.addEventListener("visibilitychange", unlock);
    return () => {
      for (const type of events) {
        window.removeEventListener(type, unlock, { capture: true });
      }
      document.removeEventListener("visibilitychange", unlock);
    };
  }, []);

  // The editor chunk is not on the first-paint path, but nobody should wait
  // for it after picking a photo either. Fetch it once the page has settled,
  // unless the connection asked for less.
  useEffect(() => {
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    if (connection?.saveData) return;
    let idleHandle: number | null = null;
    let timerHandle: number | null = null;
    // Not before the load event: on a slow connection the chunk would share
    // bandwidth with the stylesheet and font the first paint is waiting on.
    // Safari has no requestIdleCallback; a short timer is close enough there.
    const whenIdle = () => {
      if (typeof window.requestIdleCallback === "function") {
        idleHandle = window.requestIdleCallback(() => void preloadEditor(), {
          timeout: 4000,
        });
      } else {
        timerHandle = window.setTimeout(() => void preloadEditor(), 2000);
      }
    };
    if (document.readyState === "complete") {
      whenIdle();
    } else {
      window.addEventListener("load", whenIdle, { once: true });
    }
    return () => {
      window.removeEventListener("load", whenIdle);
      if (idleHandle !== null) window.cancelIdleCallback(idleHandle);
      if (timerHandle !== null) window.clearTimeout(timerHandle);
    };
  }, []);

  const handleImport = useCallback(
    async (file: File) => {
      setImportError(null);
      void preloadEditor();
      try {
        await importFile(file);
      } catch (error) {
        const message =
          error instanceof ImportError
            ? error.message
            : "This photo couldn't be opened.";
        setImportError(message);
        showToast({
          title: "Couldn't open photo",
          description: message,
          status: "error",
          timeout: 0,
        });
      }
    },
    [importFile, showToast],
  );

  const handleNewPhoto = useCallback(() => {
    void clearProject();
    setImportError(null);
  }, [clearProject]);

  useEffect(() => {
    if (state.ui.storageWarning) {
      showToast({
        title: state.ui.storageWarning.title,
        description: state.ui.storageWarning.message,
        status: "neutral",
      });
    }
  }, [state.ui.storageWarning, showToast]);

  if (!state.project) {
    return (
      <>
        <div id="top" className="se-app-shell">
          <div className="se-stage">
            <ImportScreen
              onImport={handleImport}
              onOpenIntent={preloadEditor}
              busy={state.ui.busy}
              error={importError}
            />
          </div>
        </div>
        {landing}
      </>
    );
  }

  return (
    <div className="se-app-shell se-app-shell--locked">
      <div className="se-stage">
        <Suspense fallback={<EditorLoading />}>
          <LoadedEditor onNewPhoto={handleNewPhoto} />
        </Suspense>
      </div>
    </div>
  );
}

export interface EditorAppProps {
  /**
   * Server-rendered content shown under the import screen while no photo is
   * open. Passed in rather than imported so it never enters the client bundle.
   */
  landing?: ReactNode;
}

export function EditorApp({ landing }: EditorAppProps) {
  return (
    <EditorProvider>
      <IconProvider>
        <ToastProvider>
          <EditorAppInner landing={landing} />
        </ToastProvider>
      </IconProvider>
    </EditorProvider>
  );
}
