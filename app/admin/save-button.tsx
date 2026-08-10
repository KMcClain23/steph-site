"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "./actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-white transition hover:bg-gold-bright disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

/**
 * Wraps a server action so the result is actually shown.
 *
 * A bare <form action={serverAction}> silently discards whatever the action
 * returns, so a failed save looks identical to a successful one. useActionState
 * keeps the result around to render.
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

  return (
    <form action={formAction} className={className}>
      {children}
      <div className="mt-3 flex items-center gap-3">
        <Submit label={label} />
        {state?.ok === true && (
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
