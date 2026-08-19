"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * Save confirmations, shown somewhere they'll actually be seen.
 *
 * Feedback used to render inline next to each Save button — fine for a short
 * form, useless in a long expanded row where the button can be off-screen by
 * the time the save completes. Toasts sit fixed to the corner regardless.
 *
 * Errors stay put until dismissed; successes clear themselves. Losing a
 * "Saved" is harmless, losing "that didn't save" is not.
 */

type Toast = { id: number; tone: "ok" | "error"; message: string };

const ToastContext = createContext<(tone: Toast["tone"], message: string) => void>(
  () => {}
);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((tone: Toast["tone"], message: string) => {
    setToasts((current) => [...current, { id: Date.now() + Math.random(), tone, message }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    if (toast.tone === "error") return;
    const timer = setTimeout(() => onDismiss(toast.id), 3200);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-md ${
        toast.tone === "ok"
          ? "border-emerald-400/25 bg-emerald-500/[0.12] text-emerald-100"
          : "border-[#ffb4b4]/30 bg-[#2a1119]/90 text-[#ffd0d0]"
      }`}
    >
      <span aria-hidden="true" className="mt-px">
        {toast.tone === "ok" ? "✓" : "!"}
      </span>
      <span className="flex-1 leading-relaxed">{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="shrink-0 text-white/40 transition-colors hover:text-white"
      >
        ×
      </button>
    </div>
  );
}
