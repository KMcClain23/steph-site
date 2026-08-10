"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });

    if (error) {
      // Supabase already returns a deliberately vague "Invalid login
      // credentials" for both a wrong password and an unknown address, which
      // is what we want — a distinct "no such user" would let someone probe
      // for valid addresses. Pass it through rather than trying to help.
      setError(error.message);
      setPending(false);
      return;
    }

    // refresh() so the server components re-render with the new session
    // cookie; push() alone can render the old signed-out tree.
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm text-white/70">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          autoFocus
          className="form-field"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm text-white/70">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="form-field"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-[#ffb4b4]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-[var(--radius-chip)] bg-gold p-3.5 font-bold tracking-[1px] text-white transition hover:bg-gold-bright disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
