import type { Metadata } from "next";
import Link from "next/link";
import { getAdminUser } from "@/lib/admin-auth";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: "Admin",
  // Belt and braces with the Disallow in robots.ts. The admin is behind auth,
  // but there's no reason for these URLs to be in an index at all.
  robots: { index: false, follow: false, nocache: true },
};

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/inquiries", label: "Inquiries" },
  { href: "/admin/books", label: "Narrated Works" },
  { href: "/admin/demos", label: "Demos" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser();

  return (
    <div className="min-h-dvh bg-[#0d0714]">
      {user && (
        <header className="border-b border-white/10 bg-black/40">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
            <Link href="/admin" className="font-display font-semibold text-gold">
              Depth &amp; Dawn Admin
            </Link>

            <nav aria-label="Admin">
              <ul className="flex flex-wrap gap-5 text-sm">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-white/75 transition-colors hover:text-gold"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="ml-auto flex items-center gap-4 text-sm">
              <Link
                href="/"
                className="text-white/60 transition-colors hover:text-gold"
              >
                View site ↗
              </Link>
              <span className="hidden text-white/40 sm:inline">{user.email}</span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-white/80 transition hover:border-gold/50 hover:text-gold"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
