"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "./actions";
import { useToast } from "./toast";

/**
 * Destructive action behind a two-step, in-page confirm.
 *
 * Replaces window.confirm(), which several browsers now suppress outright
 * after repeat use — a delete that silently stops asking is worse than one
 * that never asked. This also lets the warning explain the reversible
 * alternative, which a native dialog's plain text can't do well.
 *
 * One component for demos and inquiries; there were two near-identical files
 * before.
 */

function Confirm({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-[#ffb4b4]/40 bg-[#ffb4b4]/12 px-3 py-1.5 text-xs font-bold text-[#ffd0d0] transition hover:bg-[#ffb4b4]/20 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Deleting…" : label}
    </button>
  );
}

export default function ConfirmButton({
  id,
  action,
  what,
  instead,
  onDone,
}: {
  id: string;
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  /** Named in the confirmation, e.g. the demo's title. */
  what: string;
  /** The reversible option, e.g. "untick Published". */
  instead?: string;
  onDone?: () => void;
}) {
  const [state, formAction] = useActionState(action, null);
  const [arming, setArming] = useState(false);
  const toast = useToast();
  const seen = useRef<ActionResult | null>(null);

  useEffect(() => {
    if (!state || state === seen.current) return;
    seen.current = state;
    if (state.ok) {
      toast("ok", `Deleted ${what}.`);
      onDone?.();
    } else {
      toast("error", state.error);
    }
    setArming(false);
  }, [state, toast, what, onDone]);

  if (!arming) {
    return (
      <button
        type="button"
        onClick={() => setArming(true)}
        className="text-xs text-white/35 underline-offset-4 transition-colors hover:text-[#ffb4b4] hover:underline"
      >
        Delete
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center justify-end gap-2.5">
      <input type="hidden" name="id" value={id} />
      <span className="text-xs text-white/55">
        Delete permanently?
        {instead && <span className="text-white/35"> {instead} instead to keep it.</span>}
      </span>
      <Confirm label="Yes, delete" />
      <button
        type="button"
        onClick={() => setArming(false)}
        className="text-xs text-white/40 underline-offset-4 hover:text-white hover:underline"
      >
        Cancel
      </button>
    </form>
  );
}
