import Link from "next/link";

/**
 * The admin's shared vocabulary.
 *
 * Before this, `field` and `labelCls` were declared separately in every page
 * file, there were three hand-rolled button styles, and strings like
 * `h-4 w-4 accent-[#c48b36]` were pasted in five places. That's why the admin
 * looked assembled rather than designed — nothing shared a definition, so
 * nothing could be consistent by construction.
 *
 * Styling here is the public site's identity turned down: the same gold and
 * Epilogue headings, but higher contrast and less atmosphere, because this is
 * a tool someone works in rather than a page they visit.
 */

export const inputClass =
  "w-full rounded-lg border border-white/12 bg-[#150e1f] px-3 py-2 text-sm text-white transition-colors placeholder:text-white/30 hover:border-white/20 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20";

export function PageHeader({
  title,
  count,
  children,
}: {
  title: string;
  count?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-7 pb-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-[1px] text-gold">
          {title}
        </h1>
        {count && (
          <span className="font-mono text-xs text-white/35">{count}</span>
        )}
      </div>
      {children && (
        <div className="mt-2 max-w-3xl text-sm leading-relaxed text-white/60">
          {children}
        </div>
      )}
      {/* The public site separates sections with a lit gold rule; this is
          the same gesture, thinner. */}
      <div className="mt-5 h-px bg-gradient-to-r from-gold/50 via-gold/12 to-transparent" />
    </header>
  );
}

export function Card({
  children,
  className = "",
  tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "accent";
}) {
  const tones = {
    default:
      "border-white/[0.08] bg-gradient-to-b from-white/[0.055] to-white/[0.02] shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_10px_30px_-18px_rgba(0,0,0,0.9)]",
    accent:
      "border-gold/25 bg-gradient-to-b from-gold/[0.09] to-gold/[0.03] shadow-[0_1px_0_0_rgba(196,139,54,0.14)_inset,0_10px_30px_-18px_rgba(0,0,0,0.9)]",
  };
  return (
    <div className={`rounded-xl border ${tones[tone]} ${className}`}>
      {children}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  required,
  className = "",
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-white/50"
      >
        {label}
        {required && <span className="ml-1 text-gold">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-white/35">{hint}</p>}
    </div>
  );
}

export function Checkbox({
  name,
  defaultChecked,
  label,
  hint,
}: {
  name: string;
  defaultChecked?: boolean;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-white/75">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#c48b36]"
      />
      <span>
        {label}
        {hint && <span className="ml-1.5 text-white/35">{hint}</span>}
      </span>
    </label>
  );
}

export function Badge({
  children,
  tone = "neutral",
  title,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "gold" | "warn";
  title?: string;
}) {
  const tones = {
    neutral: "border-white/10 bg-white/[0.05] text-white/45",
    gold: "border-gold/35 bg-gold/15 text-gold",
    warn: "border-[#ffb4b4]/25 bg-[#ffb4b4]/10 text-[#ffb4b4]",
  };
  return (
    <span
      title={title}
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-white/12 bg-white/[0.015] px-6 py-12 text-center">
      <p className="font-display text-sm font-semibold uppercase tracking-[1px] text-white/50">
        {title}
      </p>
      {children && (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/35">
          {children}
        </p>
      )}
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="mb-6 rounded-lg border border-[#ffb4b4]/25 bg-[#ffb4b4]/[0.07] px-4 py-3 text-sm text-[#ffd0d0]"
    >
      {children}
    </p>
  );
}

export function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-gold/80 underline-offset-4 transition-colors hover:text-gold hover:underline"
    >
      {children} ↗
    </a>
  );
}

export function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className="h-4 w-4 shrink-0 text-white/30 transition-transform group-open:rotate-180"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** A collapsed row: consistent height, badges on the right, chevron last. */
export function RowSummary({ children }: { children: React.ReactNode }) {
  return (
    <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-[var(--row-py,0.7rem)] transition-colors hover:bg-white/[0.02] [&::-webkit-details-marker]:hidden">
      {children}
    </summary>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return (
    <details className="group overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.055] to-white/[0.02] shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset] transition-colors hover:border-white/[0.18] open:border-gold/35 open:from-gold/[0.06] open:to-white/[0.02]">
      {children}
    </details>
  );
}

/**
 * The fold-away "add something" panel above each list.
 *
 * Exists as a component because getting it wrong is easy and the symptom is
 * baffling: <summary> has to be the *first child* of <details>. Wrapping it in
 * a styling div made browsers ignore it and render their own default marker —
 * which is why this panel briefly announced itself as "Details".
 */
export function AddPanel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group mb-5 overflow-hidden rounded-xl border border-gold/25 bg-gradient-to-b from-gold/[0.09] to-gold/[0.03] shadow-[0_1px_0_0_rgba(196,139,54,0.14)_inset]">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-sm font-bold text-gold transition-colors hover:bg-gold/[0.05] [&::-webkit-details-marker]:hidden">
        <span className="grid h-6 w-6 place-items-center rounded-full border border-gold/50 text-base leading-none">
          +
        </span>
        {label}
        <Chevron />
      </summary>
      <div className="border-t border-gold/20 p-5">{children}</div>
    </details>
  );
}

export function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-gold/12 font-semibold text-gold"
          : "text-white/60 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      {label}
    </Link>
  );
}
