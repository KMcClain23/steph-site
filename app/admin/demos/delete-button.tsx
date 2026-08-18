"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "../actions";

function Button({ name }: { name: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      // Unticking Published is the reversible way to take a demo off the site,
      // and it's right there as a checkbox — so deletion asks first and says
      // so. The MP3 itself stays in storage either way.
      onClick={(e) => {
        if (
          !confirm(
            `Permanently delete the demo "${name}"?\n\nThis removes it from the site and from this list. To hide it from the site but keep it here, untick Published instead.`
          )
        ) {
          e.preventDefault();
        }
      }}
      className="text-xs text-white/40 underline-offset-4 transition-colors hover:text-[#ffb4b4] hover:underline disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

export default function DeleteDemoButton({
  id,
  name,
  action,
}: {
  id: string;
  name: string;
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <Button name={name} />
      {state?.ok === false && (
        <span role="alert" className="text-xs text-[#ffb4b4]">
          {state.error}
        </span>
      )}
    </form>
  );
}
