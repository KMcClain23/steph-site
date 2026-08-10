"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

export default function LoginForm({ next }: { next: string }) {
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

    /**
     * Hard navigation, deliberately — not router.push().
     *
     * Two things break a client-side transition here. Next caches the RSC
     * payload for /admin from when you were signed out (the response that
     * redirected to this very page), so push() replays that cached redirect
     * and you appear stuck on the login form. And the session cookie the
     * Supabase browser client just wrote isn't reliably visible to the next
     * server request yet — router.refresh() is supposed to bridge both, but
     * it races with the push.
     *
     * A full page load has neither problem: the cookie goes out with the
     * request and nothing is served from the client router cache. It costs
     * one extra page load on an action that happens once a session.
     */
    window.location.assign(next);
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
