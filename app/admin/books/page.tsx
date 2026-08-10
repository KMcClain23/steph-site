import Image from "next/image";
import { hasRealCover } from "@/lib/books";
import { requireAdmin } from "@/lib/admin-auth";
import { createServiceRoleClient } from "@/lib/supabase";
import { updateBook } from "../actions";
import ActionForm from "../save-button";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  slug: string;
  title: string;
  author: string;
  cover_url: string;
  audible_url: string | null;
  narrator_credit: string | null;
  description: string | null;
  sort_order: number;
  published: boolean;
  manual: boolean;
};

export default async function BooksAdminPage() {
  await requireAdmin();

  const { data, error } = await createServiceRoleClient()
    .from("books")
    .select(
      "id, slug, title, author, cover_url, audible_url, narrator_credit, description, sort_order, published, manual"
    )
    .order("sort_order", { ascending: true });

  const books = (data ?? []) as Row[];
  const missing = books.filter((b) => !b.description?.trim()).length;

  return (
    <div>
      <h1 className="section-title mb-2 text-2xl">Narrated Works</h1>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-white/60">
        Each title has its own page at <code className="text-white/80">/narrated/&lt;slug&gt;</code>.
        A description is the single biggest thing you can add — those pages have
        very little unique text without one.
        {missing > 0 && (
          <> <strong className="text-gold">{missing} still need one.</strong></>
        )}
      </p>

      {error && (
        <p role="alert" className="mb-6 text-sm text-[#ffb4b4]">
          Couldn&rsquo;t load titles: {error.message}
        </p>
      )}

      <ul className="space-y-4">
        {books.map((book) => (
          <li
            key={book.id}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-5"
          >
            <div className="flex gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-black/40">
                {hasRealCover(book.cover_url) && (
                  <Image
                    src={book.cover_url}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold text-white">
                  {book.title}
                </h2>
                <p className="text-sm text-white/60">{book.author}</p>
                <a
                  href={`/narrated/${book.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gold underline-offset-4 hover:underline"
                >
                  /narrated/{book.slug} ↗
                </a>
                {!book.description?.trim() && (
                  <span className="ml-3 rounded-full bg-gold/20 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-gold">
                    No description
                  </span>
                )}
              </div>
            </div>

            <ActionForm action={updateBook} label="Save" className="mt-4">
              <input type="hidden" name="id" value={book.id} />

              <label
                htmlFor={`desc-${book.id}`}
                className="mb-1.5 block text-xs uppercase tracking-wide text-white/50"
              >
                Description
              </label>
              <textarea
                id={`desc-${book.id}`}
                name="description"
                rows={3}
                defaultValue={book.description ?? ""}
                placeholder="A few sentences about the story and the performance…"
                className="w-full rounded-lg border border-white/15 bg-[#160f20] px-3 py-2 text-sm leading-relaxed text-white placeholder:text-white/35"
              />

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`credit-${book.id}`}
                    className="mb-1.5 block text-xs uppercase tracking-wide text-white/50"
                  >
                    Narrator credit
                  </label>
                  <input
                    id={`credit-${book.id}`}
                    name="narrator_credit"
                    defaultValue={book.narrator_credit ?? ""}
                    className="w-full rounded-lg border border-white/15 bg-[#160f20] px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`order-${book.id}`}
                    className="mb-1.5 block text-xs uppercase tracking-wide text-white/50"
                  >
                    Sort order (lower shows first)
                  </label>
                  <input
                    id={`order-${book.id}`}
                    name="sort_order"
                    type="number"
                    min={0}
                    defaultValue={book.sort_order}
                    className="w-full rounded-lg border border-white/15 bg-[#160f20] px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`cover-${book.id}`}
                    className="mb-1.5 block text-xs uppercase tracking-wide text-white/50"
                  >
                    Cover URL
                  </label>
                  <input
                    id={`cover-${book.id}`}
                    name="cover_url"
                    defaultValue={book.cover_url}
                    className="w-full rounded-lg border border-white/15 bg-[#160f20] px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`audible-${book.id}`}
                    className="mb-1.5 block text-xs uppercase tracking-wide text-white/50"
                  >
                    Audible URL
                  </label>
                  <input
                    id={`audible-${book.id}`}
                    name="audible_url"
                    defaultValue={book.audible_url ?? ""}
                    className="w-full rounded-lg border border-white/15 bg-[#160f20] px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-6 text-sm">
                <label className="flex items-center gap-2 text-white/80">
                  <input
                    type="checkbox"
                    name="published"
                    defaultChecked={book.published}
                    className="h-4 w-4 accent-[#c48b36]"
                  />
                  Published
                </label>
                <label className="flex items-center gap-2 text-white/80">
                  <input
                    type="checkbox"
                    name="manual"
                    defaultChecked={book.manual}
                    className="h-4 w-4 accent-[#c48b36]"
                  />
                  <span>
                    Protect from sync
                    <span className="ml-1 text-white/45">
                      (keeps your edits when the Audible pipeline runs)
                    </span>
                  </span>
                </label>
              </div>
            </ActionForm>
          </li>
        ))}
      </ul>
    </div>
  );
}
