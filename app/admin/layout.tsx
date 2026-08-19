import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAdminUser } from "@/lib/admin-auth";
import { signOut } from "./actions";
import AdminNav from "./nav";
import { ToastProvider } from "./toast";

export const metadata: Metadata = {
  title: "Admin",
  // Belt and braces with the Disallow in robots.ts. The admin is behind auth,
  // but there's no reason for these URLs to be in an index at all.
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser();

  // Signed out: no chrome at all, so the login page isn't wrapped in a shell
  // full of links that would only bounce back here.
  if (!user) {
    return (
      <div className="admin-shell min-h-dvh">
        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="admin-shell min-h-dvh lg:flex">
        <aside className="border-b border-white/[0.07] bg-black/25 lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex flex-col gap-6 p-5 lg:sticky lg:top-0 lg:h-dvh">
            {/* Her emblem, not a text wordmark. It's the single cheapest way
                to make this feel like her admin rather than a dashboard. */}
            <Link href="/admin" className="flex items-center gap-3">
              <Image
                src="/emblem.png"
                alt=""
                width={40}
                height={40}
                className="shrink-0 rounded-lg border border-gold/20"
              />
              <span>
                <span className="block font-display text-[0.82rem] font-extrabold uppercase leading-tight tracking-[0.12em] text-gold">
                  Depth &amp; Dawn
                </span>
                <span className="mt-0.5 block text-[0.62rem] uppercase tracking-[0.24em] text-white/30">
                  Admin
                </span>
              </span>
            </Link>

            <AdminNav />

            <div className="mt-auto space-y-3 border-t border-white/[0.07] pt-4">
              <Link
                href="/"
                target="_blank"
                className="block text-xs text-white/45 transition-colors hover:text-gold"
              >
                View the site ↗
              </Link>
              <p className="truncate text-xs text-white/25" title={user.email}>
                {user.email}
              </p>
              <form action={signOut}>
                <button
                  type="submit"
                  className="w-full rounded-lg border border-white/12 px-3 py-1.5 text-xs text-white/60 transition hover:border-gold/40 hover:text-gold"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-5 py-8 lg:px-10">
          <div className="max-w-5xl">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
