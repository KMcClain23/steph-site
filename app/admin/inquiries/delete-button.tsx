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
      // Deleting an inquiry destroys the only record of someone trying to hire
      // her, so it asks first. Archiving is the reversible option and is right
      // there in the status dropdown.
      onClick={(e) => {
        if (
          !confirm(
            `Permanently delete the inquiry from ${name}?\n\nThis can't be undone. To keep it but hide it, set the status to "archived" instead.`
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

export default function DeleteInquiryButton({
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
