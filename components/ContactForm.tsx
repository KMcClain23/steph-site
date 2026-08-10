"use client";

import Link from "next/link";
import { useState } from "react";

type State = "idle" | "sending" | "sent" | "error";

export default function ContactForm() {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      message: String(form.get("message") ?? ""),
      company: String(form.get("company") ?? ""),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }
      setState("sent");
    } catch {
      setError(
        "Couldn't reach the server. Please try again, or email stephaniebetschart1@gmail.com directly."
      );
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="panel mx-auto mb-16 mt-5 max-w-[900px] p-7 text-center md:p-8">
        <h1 className="section-title mb-3.5 text-[1.7rem] uppercase">
          Thanks for Your Inquiry
        </h1>
        <p className="body-copy mb-7">
          Your message was sent successfully. A copy has been delivered to my
          inbox and I&rsquo;ll get back to you as soon as possible.
        </p>
        <Link
          href="/"
          className="inline-block rounded-[var(--radius-chip)] bg-gold px-6 py-4 font-bold tracking-[1px] text-white shadow-[0_0_14px_rgba(196,139,54,0.28)] transition hover:-translate-y-0.5 hover:bg-gold-bright"
        >
          Return to Home Page
        </Link>
      </div>
    );
  }

  return (
    <div className="panel mx-auto mb-16 mt-5 max-w-[900px] p-7 md:p-8">
      <h1 className="section-title mb-3.5 text-[1.35rem] uppercase md:text-[1.7rem]">
        Let&rsquo;s Create Something Unforgettable
      </h1>
      <p className="body-copy mb-7 text-base">
        Interested in booking, collaboration, or audiobook narration? Send a
        message below and I&rsquo;ll get back to you soon.
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-[18px]">
        {/* Honeypot — real people never see it, bots fill it in. */}
        <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
          <label htmlFor="company">Company</label>
          <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <label className="sr-only" htmlFor="name">
          Your Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={200}
          autoComplete="name"
          placeholder="Your Name"
          className="form-field"
        />

        <label className="sr-only" htmlFor="email">
          Your Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          maxLength={320}
          autoComplete="email"
          placeholder="Your Email"
          className="form-field"
        />

        <label className="sr-only" htmlFor="message">
          Tell me about your project
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          required
          maxLength={5000}
          placeholder="Tell me about your project..."
          className="form-field resize-y"
        />

        {error && (
          <p role="alert" className="text-sm text-[#ffb4b4]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={state === "sending"}
          className="rounded-[var(--radius-chip)] bg-gold p-4 font-bold tracking-[1px] text-white shadow-[0_0_14px_rgba(196,139,54,0.28)] transition hover:-translate-y-0.5 hover:bg-gold-bright hover:shadow-[0_0_22px_rgba(196,139,54,0.45)] disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {state === "sending" ? "Sending…" : "Send Message"}
        </button>
      </form>
    </div>
  );
}
