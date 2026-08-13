"use client";

import { Toast } from "@base-ui/react/toast";
import { useCallback, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CloseIcon } from "./icons";

export type ToastStatus = "neutral" | "info" | "success" | "error";

export interface ShowToastInput {
  title: string;
  description?: string;
  status?: ToastStatus;
  timeout?: number;
}

const statusAccent: Record<ToastStatus, string> = {
  neutral: "border-hairline",
  info: "border-sky-500/40",
  success: "border-emerald-500/40",
  error: "border-red-500/45",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider timeout={4200} limit={3}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 z-50 w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 outline-none">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function ToastList() {
  const { toasts } = Toast.useToastManager();

  return toasts.map((toast) => {
    const status = (toast.type as ToastStatus | undefined) ?? "neutral";
    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        className={cn(
          "absolute left-0 right-0 top-0 z-[calc(1000-var(--toast-index))] box-border",
          "origin-top rounded-panel border border-hairline bg-surface/95 text-fg backdrop-blur-md",
          "shadow-toast",
          "h-[var(--toast-height)] data-expanded:h-[var(--toast-height)]",
          "[transform:translateY(calc(var(--toast-index)*-0.25rem))_scale(calc(1-var(--toast-index)*0.04))]",
          "data-expanded:[transform:translateY(calc(var(--toast-index)*(var(--toast-height)+0.5rem)))]",
          "transition-[transform,translate,opacity] duration-300 ease-out",
          "data-starting-style:-translate-y-4 data-starting-style:opacity-0",
          "data-ending-style:-translate-y-4 data-ending-style:opacity-0",
          statusAccent[status],
        )}
      >
        <Toast.Content className="flex items-start gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <Toast.Title className="text-sm font-semibold" />
            <Toast.Description className="text-xs break-words text-muted" />
          </div>
          <Toast.Close
            className="shrink-0 rounded-inset p-2 text-muted hover:bg-hover hover:text-fg"
            aria-label="Dismiss notification"
          >
            <CloseIcon size={14} />
          </Toast.Close>
        </Toast.Content>
      </Toast.Root>
    );
  });
}

/**
 * Base UI memoizes its manager on the `toasts` array, so the object identity
 * changes every time a toast is added. Callers that list `showToast` as an
 * effect dependency would then re-run on every add and loop forever, so bind
 * only to `add`/`close`, which are stable for the life of the provider.
 */
export function useToast() {
  const { add, close } = Toast.useToastManager();

  const showToast = useCallback(
    ({ title, description, status = "neutral", timeout }: ShowToastInput) =>
      add({
        title,
        description,
        type: status,
        // Base UI: timeout 0 prevents auto-dismiss; errors stay until dismissed.
        timeout: timeout ?? (status === "error" ? 0 : undefined),
      }),
    [add],
  );

  const dismissToast = useCallback((id?: string) => close(id), [close]);

  return useMemo(
    () => ({ showToast, dismissToast }),
    [showToast, dismissToast],
  );
}
