"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "./actions";

function Submit({ label, dirty }: { label: string; dirty: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={[
        "rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-wait disabled:opacity-70",
        dirty
          ? "bg-gold text-white hover:bg-gold-bright"
          : "border border-white/15 bg-white/[0.04] text-white/60 hover:border-gold/40 hover:text-gold",
      ].join(" ")}
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

/**
 * Wraps a server action so the result is actually shown, and so unsaved edits
 * are hard to lose.
 *
 * A bare <form action={serverAction}> discards whatever the action returns, so
 * a failed save looks identical to a successful one. useActionState keeps the
 * result to render.
 *
 * Deliberately not auto-saving on blur. These forms contain file pickers and
 * checkboxes; saving silently would make a mis-click permanent and push
 * failures somewhere nobody is looking. The compromise is that the form says
 * plainly when it holds unsaved changes, and the browser asks before you
 * leave with them.
 */
export default function ActionForm({
  action,
  label = "Save",
  children,
  className,
}: {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const [dirty, setDirty] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // A completed save means what's on screen matches what's stored.
  useEffect(() => {
    if (state?.ok) setDirty(false);
  }, [state]);

  // Only while there's something to lose — an always-on handler would nag on
  // every navigation away from the admin.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return (
    <form
      ref={formRef}
      action={formAction}
      onChange={() => setDirty(true)}
      className={className}
    >
      {children}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Submit label={label} dirty={dirty} />

        {dirty && (
          <span className="flex items-center gap-1.5 text-sm text-gold">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold" />
            Unsaved changes
          </span>
        )}
        {!dirty && state?.ok === true && (
          <span role="status" className="text-sm text-emerald-300">
            Saved
          </span>
        )}
        {state?.ok === false && (
          <span role="alert" className="text-sm text-[#ffb4b4]">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
