import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { createServiceRoleClient } from "@/lib/supabase";
import { Card, PageHeader } from "./ui";

export const dynamic = "force-dynamic";

async function overview() {
  const db = createServiceRoleClient();
  const count = (table: string, apply?: (q: any) => any) => {
    const q = db.from(table).select("*", { count: "exact", head: true });
    return apply ? apply(q) : q;
  };

  const [inquiries, unread, books, hiddenBooks, demos, hiddenDemos, noDescription, recent] =
    await Promise.all([
      count("inquiries"),
      count("inquiries", (q) => q.eq("status", "new")),
      count("books"),
      count("books", (q) => q.eq("published", false)),
      count("demos"),
      count("demos", (q) => q.eq("published", false)),
      count("books", (q) => q.is("description", null)),
      db
        .from("inquiries")
        .select("id, name, email, status, created_at")
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

  return {
    inquiries: inquiries.count ?? 0,
    unread: unread.count ?? 0,
    books: books.count ?? 0,
    hiddenBooks: hiddenBooks.count ?? 0,
    demos: demos.count ?? 0,
    hiddenDemos: hiddenDemos.count ?? 0,
    noDescription: noDescription.count ?? 0,
    recent: (recent.data ?? []) as {
      id: string;
      name: string;
      email: string;
      status: string;
      created_at: string;
    }[],
  };
}

function Stat({
  label,
  value,
  hint,
  href,
  alert,
}: {
  label: string;
  value: number;
  hint: string;
  href: string;
  alert?: boolean;
}) {
  return (
    <Link href={href} className="group block">
      <Card
        className="h-full p-5 transition-colors group-hover:border-gold/35 group-hover:bg-white/[0.05]"
        tone={alert ? "accent" : "default"}
      >
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/40">
          {label}
        </p>
        <p className="mt-2 font-display text-4xl font-extrabold leading-none text-gold">
          {value}
        </p>
        <p className="mt-2 text-xs text-white/40">{hint}</p>
      </Card>
    </Link>
  );
}

export default async function AdminHome() {
  await requireAdmin();
  const o = await overview();

  return (
    <div>
      <PageHeader title="Overview">
        Everything on the public site is managed from here.
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Inquiries"
          value={o.inquiries}
          hint={o.unread ? `${o.unread} unread` : "all read"}
          href="/admin/inquiries"
          alert={o.unread > 0}
        />
        <Stat
          label="Narrated works"
          value={o.books}
          hint={o.hiddenBooks ? `${o.hiddenBooks} hidden` : "all published"}
          href="/admin/books"
        />
        <Stat
          label="Demos"
          value={o.demos}
          hint={o.hiddenDemos ? `${o.hiddenDemos} hidden` : "all published"}
          href="/admin/demos"
        />
      </div>

      {o.noDescription > 0 && (
        <Card tone="accent" className="mt-3 p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.1em] text-gold">
            {o.noDescription} title{o.noDescription === 1 ? "" : "s"} without a description
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
            Every narrated work has its own page. Those pages currently show only
            the cover, author and credits — search engines treat pages with
            little unique text as low value. Two or three sentences each makes a
            real difference to whether they rank.
          </p>
          <Link
            href="/admin/books"
            className="mt-4 inline-block rounded-lg bg-gold px-4 py-2 text-sm font-bold text-white transition hover:bg-gold-bright"
          >
            Add descriptions
          </Link>
        </Card>
      )}

      {o.recent.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/40">
            Latest inquiries
          </h2>
          <Card>
            <ul className="divide-y divide-white/[0.06]">
              {o.recent.map((inq) => (
                <li key={inq.id}>
                  <Link
                    href="/admin/inquiries"
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                  >
                    <span className="font-medium text-white">{inq.name}</span>
                    <span className="text-sm text-white/40">{inq.email}</span>
                    {inq.status === "new" && (
                      <span className="rounded-full border border-gold/35 bg-gold/15 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-gold">
                        New
                      </span>
                    )}
                    <span className="ml-auto font-mono text-xs text-white/30">
                      {new Date(inq.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
}
