"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NAV, SITE, SOCIALS } from "@/lib/content";
import { SocialIcon } from "./SocialIcons";

export default function Header() {
  const [open, setOpen] = useState(false);

  // Close the drawer on Escape, and don't let the page scroll behind it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/45 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-5 py-3 md:px-9">
        {/* Mobile: menu button takes the left slot the socials hold on desktop */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="text-white/85 transition-colors hover:text-gold md:hidden"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>

        <ul className="hidden flex-1 items-center gap-4 md:flex">
          {SOCIALS.map((s) => (
            <li key={s.label}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${s.label} (opens in a new tab)`}
                className="block text-white/75 transition-colors hover:text-gold"
              >
                <SocialIcon name={s.icon} className="h-[18px] w-[18px]" />
              </a>
            </li>
          ))}
        </ul>

        <Link
          href="/"
          className="flex-1 text-center font-display text-lg font-semibold tracking-wide text-white md:flex-none md:text-xl"
        >
          {SITE.name}
        </Link>

        <nav aria-label="Primary" className="hidden flex-1 justify-end md:flex">
          <ul className="flex items-center gap-7">
            {NAV.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="text-sm text-white/85 transition-colors hover:text-gold"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Balances the hamburger so the wordmark stays optically centred */}
        <span className="w-[26px] md:hidden" aria-hidden="true" />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 flex w-[78%] max-w-xs flex-col gap-8 border-r border-white/10 bg-[#0d0616]/95 p-7 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="font-display text-base font-semibold text-white">
                {SITE.name}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="text-white/70 transition-colors hover:text-gold"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav aria-label="Mobile">
              <ul className="flex flex-col gap-5">
                {NAV.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="font-display text-lg font-semibold uppercase tracking-[1px] text-white/90 transition-colors hover:text-gold"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <ul className="mt-auto flex items-center gap-5">
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${s.label} (opens in a new tab)`}
                    className="block text-white/70 transition-colors hover:text-gold"
                  >
                    <SocialIcon name={s.icon} className="h-5 w-5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </header>
  );
}
