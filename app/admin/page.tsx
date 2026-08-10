import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { createServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function counts() {
  const supabase = createServiceRoleClient();
  const [inquiries, unread, books, unpublishedBooks, demos, unpublishedDemos, noDescription] =
    await Promise.all([
      supabase.from("inquiries").select("*", { count: "exact", head: true }),
      supabase.from("inquiries").select("*", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("books").select("*", { count: "exact", head: true }),
      supabase.from("books").select("*", { count: "exact", head: true }).eq("published", false),
      supabase.from("demos").select("*", { count: "exact", head: true }),
      supabase.from("demos").select("*", { count: "exact", head: true }).eq("published", false),
      supabase.from("books").select("*", { count: "exact", head: true }).is("description", null),
    ]);

  return {
    inquiries: inquiries.count ?? 0,
    unread: unread.count ?? 0,
    books: books.count ?? 0,
    unpublishedBooks: unpublishedBooks.count ?? 0,
    demos: demos.count ?? 0,
    unpublishedDemos: unpublishedDemos.count ?? 0,
    noDescription: noDescription.count ?? 0,
  };
}

function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number;
  hint?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-gold/40 hover:bg-white/[0.07]"
    >
      <p className="text-xs uppercase tracking-[1.5px] text-white/50">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-gold">{value}</p>
      {hint && <p className="mt-1 text-xs text-white/50">{hint}</p>}
    </Link>
  );
}

export default async function AdminHome() {
  await requireAdmin();
  const c = await counts();

  return (
    <div>
      <h1 className="section-title mb-6 text-2xl">Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          label="Inquiries"
          value={c.inquiries}
          hint={c.unread ? `${c.unread} unread` : "all read"}
          href="/admin/inquiries"
        />
        <Stat
          label="Narrated works"
          value={c.books}
          hint={c.unpublishedBooks ? `${c.unpublishedBooks} hidden` : "all published"}
          href="/admin/books"
        />
        <Stat
          label="Demos"
          value={c.demos}
          hint={c.unpublishedDemos ? `${c.unpublishedDemos} hidden` : "all published"}
          href="/admin/demos"
        />
      </div>

      {c.noDescription > 0 && (
        <div className="mt-6 rounded-xl border border-gold/30 bg-gold/[0.07] p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-[1px] text-gold">
            {c.noDescription} title{c.noDescription === 1 ? "" : "s"} without a description
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
            Each narrated work has its own page on the site. Those pages currently
            show only the cover, author, and credits — search engines treat pages
            with little unique text as low value. Even two or three sentences per
            title makes a real difference to whether they rank.
          </p>
          <Link
            href="/admin/books"
            className="mt-4 inline-block rounded-lg bg-gold px-4 py-2 text-sm font-bold text-white transition hover:bg-gold-bright"
          >
            Add descriptions
          </Link>
        </div>
      )}
    </div>
  );
}
