"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "./actions";
import { useToast } from "./toast";

function Submit({ label, dirty }: { label: string; dirty: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={[
        "rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-wait disabled:opacity-60",
        dirty
          ? "bg-gold text-white shadow-[0_0_16px_rgba(196,139,54,0.25)] hover:bg-gold-bright"
          : "border border-white/12 bg-white/[0.03] text-white/55 hover:border-gold/40 hover:text-gold",
      ].join(" ")}
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

/**
 * Wraps a server action so the result is visible and unsaved edits are hard
 * to lose.
 *
 * A bare <form action={serverAction}> discards whatever the action returns, so
 * a failed save looks exactly like a successful one. useActionState keeps the
 * result, and it's announced as a toast because inline feedback next to the
 * button is often scrolled out of view by the time a save finishes in a long
 * expanded row.
 *
 * Deliberately not auto-saving on blur: these forms hold file pickers and
 * checkboxes, so silent saves would make a mis-click permanent and put
 * failures somewhere nobody is looking. Instead the form says when it holds
 * unsaved changes, and the browser asks before you leave with them.
 */
export default function ActionForm({
  action,
  label = "Save",
  successMessage = "Saved.",
  children,
  className,
}: {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  label?: string;
  successMessage?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const [dirty, setDirty] = useState(false);
  const toast = useToast();
  const seen = useRef<ActionResult | null>(null);

  useEffect(() => {
    if (!state || state === seen.current) return;
    seen.current = state;
    if (state.ok) {
      setDirty(false);
      toast("ok", successMessage);
    } else {
      // Left dirty on purpose — the edit is still unsaved, and the button
      // should still look like it has something to do.
      toast("error", state.error);
    }
  }, [state, toast, successMessage]);

  // Only while there's something to lose; an always-on handler would nag on
  // every navigation away from the admin.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return (
    <form action={formAction} onChange={() => setDirty(true)} className={className}>
      {children}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Submit label={label} dirty={dirty} />
        {dirty && (
          <span className="flex items-center gap-1.5 text-xs text-gold">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold" />
            Unsaved changes
          </span>
        )}
      </div>
    </form>
  );
}
