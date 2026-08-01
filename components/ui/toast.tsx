"use client";

import { Toast } from "@base-ui/react/toast";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ToastStatus = "neutral" | "info" | "success" | "error";

export interface ShowToastInput {
  title: string;
  description?: string;
  status?: ToastStatus;
  timeout?: number;
}

const statusAccent: Record<ToastStatus, string> = {
  neutral: "border-black/10",
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
          "origin-top rounded-2xl border border-black/10 bg-[var(--se-surface)]/95 text-[var(--se-fg)] backdrop-blur-md",
          "shadow-[0_8px_28px_rgb(0_0_0/0.12)]",
          "h-[var(--toast-height)] data-expanded:h-[var(--toast-height)]",
          "[transform:translateY(calc(var(--toast-index)*-0.35rem))_scale(calc(1-var(--toast-index)*0.04))]",
          "data-expanded:[transform:translateY(calc(var(--toast-index)*(var(--toast-height)+0.5rem)))]",
          "transition-[transform,opacity] duration-300 ease-out",
          "data-starting-style:-translate-y-4 data-starting-style:opacity-0",
          "data-ending-style:-translate-y-4 data-ending-style:opacity-0",
          statusAccent[status],
        )}
      >
        <Toast.Content className="flex items-start gap-3 px-3.5 py-3">
          <div className="min-w-0 flex-1">
            <Toast.Title className="text-sm font-semibold" />
            <Toast.Description className="text-xs break-words text-[var(--se-muted)]" />
          </div>
          <Toast.Close
            className="shrink-0 rounded-md p-1.5 text-[var(--se-muted)] hover:bg-black/5 hover:text-[var(--se-fg)]"
            aria-label="Dismiss"
          >
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </Toast.Close>
        </Toast.Content>
      </Toast.Root>
    );
  });
}

export function useToast() {
  const manager = Toast.useToastManager();

  return {
    showToast: ({ title, description, status = "neutral", timeout }: ShowToastInput) =>
      manager.add({
        title,
        description,
        type: status,
        // Base UI: timeout 0 prevents auto-dismiss; errors stay until dismissed.
        timeout: timeout ?? (status === "error" ? 0 : undefined),
      }),
    dismissToast: (id?: string) => manager.close(id),
  };
}
