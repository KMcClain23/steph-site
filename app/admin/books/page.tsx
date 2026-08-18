import Image from "next/image";
import { hasRealCover } from "@/lib/books";
import { requireAdmin } from "@/lib/admin-auth";
import { createServiceRoleClient } from "@/lib/supabase";
import { createBook, reorderBooks, updateBook } from "../actions";
import SortableList from "../sortable-list";
import ActionForm from "../save-button";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  slug: string;
  title: string;
  author: string;
  cover_url: string;
  audible_url: string | null;
  siren_url: string | null;
  narrator_credit: string | null;
  description: string | null;
  release_date: string | null;
  sort_order: number;
  published: boolean;
  manual: boolean;
};

const field =
  "w-full rounded-lg border border-white/15 bg-[#160f20] px-3 py-2 text-sm text-white placeholder:text-white/35";
const labelCls = "mb-1.5 block text-xs uppercase tracking-wide text-white/50";

/**
 * The database keeps the pipeline's MM-DD-YY. <input type="date"> only accepts
 * YYYY-MM-DD, so translate on the way in; the action translates back on save.
 */
function toDateInput(raw: string | null): string {
  if (!raw) return "";
  const m = /^(\d{2})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return "";
  const [, mm, dd, yy] = m;
  return `20${yy}-${mm}-${dd}`;
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className="h-4 w-4 shrink-0 text-white/40 transition-transform group-open:rotate-180"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default async function BooksAdminPage() {
  await requireAdmin();

  const { data, error } = await createServiceRoleClient()
    .from("books")
    .select(
      "id, slug, title, author, cover_url, audible_url, siren_url, narrator_credit, description, release_date, sort_order, published, manual"
    )
    .order("sort_order", { ascending: true });

  const books = (data ?? []) as Row[];
  const missing = books.filter((b) => !b.description?.trim()).length;

  return (
    <div>
      <h1 className="section-title mb-2 text-2xl">Narrated Works</h1>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-white/60">
        {books.length} titles. Each has its own page at{" "}
        <code className="text-white/80">/narrated/&lt;slug&gt;</code>. A
        description is the single biggest thing you can add — those pages have
        very little unique text without one.
        {missing > 0 && (
          <>
            {" "}
            <strong className="text-gold">{missing} still need one.</strong>
          </>
        )}
      </p>

      {error && (
        <p role="alert" className="mb-6 text-sm text-[#ffb4b4]">
          Couldn&rsquo;t load titles: {error.message}
        </p>
      )}

      {/* Adding is the rarer action, so it stays folded away above the list. */}
      <details className="group mb-6 rounded-xl border border-gold/25 bg-gold/[0.05]">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-sm font-bold text-gold [&::-webkit-details-marker]:hidden">
          <span className="grid h-6 w-6 place-items-center rounded-full border border-gold/50 text-base leading-none">
            +
          </span>
          Add a title by hand
          <Chevron />
        </summary>

        <div className="border-t border-gold/20 p-4">
          <p className="mb-4 max-w-2xl text-sm leading-relaxed text-white/60">
            Most titles arrive automatically from Audible. Use this for the ones
            that can&rsquo;t — where Stephanie is credited in the description
            rather than the narrator field, so the pipeline never sees her.
            Anything added here is marked <em>protected from sync</em>{" "}
            automatically.
          </p>

          <ActionForm action={createBook} label="Add title">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="new-title">
                  Title <span className="text-gold">*</span>
                </label>
                <input id="new-title" name="title" required className={field} />
              </div>
              <div>
                <label className={labelCls} htmlFor="new-author">
                  Author <span className="text-gold">*</span>
                </label>
                <input id="new-author" name="author" required className={field} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="new-cover">
                  Cover image URL
                </label>
                <input
                  id="new-cover"
                  name="cover_url"
                  placeholder="https://m.media-amazon.com/images/I/....jpg"
                  className={field}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="new-coverfile">
                  …or upload a cover from your computer
                </label>
                <input
                  id="new-coverfile"
                  name="cover_file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-gold/20 file:px-3 file:py-2 file:text-sm file:font-bold file:text-gold hover:file:bg-gold/30"
                />
                <p className="mt-1 text-xs text-white/40">
                  An upload takes precedence over the URL above. One of the two
                  is required.
                </p>
              </div>
              <div>
                <label className={labelCls} htmlFor="new-audible">
                  Audible URL
                </label>
                <input id="new-audible" name="audible_url" className={field} />
              </div>
              <div>
                <label className={labelCls} htmlFor="new-siren">
                  Siren Audio URL
                </label>
                <input
                  id="new-siren"
                  name="siren_url"
                  placeholder="https://siren.audio/audiobooks/…"
                  className={field}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="new-credit">
                  Narrator credit
                </label>
                <input
                  id="new-credit"
                  name="narrator_credit"
                  placeholder="Ann Dahlia"
                  className={field}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="new-release">
                  Release date
                </label>
                <input
                  id="new-release"
                  name="release_date"
                  type="date"
                  className={field}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="new-description">
                  Description
                </label>
                <textarea
                  id="new-description"
                  name="description"
                  rows={3}
                  className={field}
                />
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  name="published"
                  defaultChecked
                  className="h-4 w-4 accent-[#c48b36]"
                />
                Publish immediately
              </label>
            </div>
          </ActionForm>
        </div>
      </details>

      <SortableList
        ids={books.map((b) => b.id)}
        action={reorderBooks}
        noun="titles"
        search={Object.fromEntries(
          books.map((b) => [
            b.id,
            [b.title, b.author, b.narrator_credit].filter(Boolean).join(" "),
          ])
        )}
        flag={{
          label: "Needs a description",
          ids: books.filter((b) => !b.description?.trim()).map((b) => b.id),
        }}
      >
        {books.map((book) => (
          <div key={book.id}>
            {/*
              Collapsed by default. Twenty-two expanded edit forms is a wall of
              inputs to scroll past when you only came to change one of them.
              <details> rather than React state: it's keyboard accessible and
              Ctrl-F findable for free, and the page stays a server component.
            */}
            <details className="group rounded-xl border border-white/10 bg-white/[0.04] transition-colors hover:border-white/20 open:border-gold/30 open:bg-white/[0.06]">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3 [&::-webkit-details-marker]:hidden">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded bg-black/40">
                  {hasRealCover(book.cover_url) && (
                    <Image
                      src={book.cover_url}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-semibold text-white">
                    {book.title}
                  </p>
                  <p className="truncate text-xs text-white/50">{book.author}</p>
                </div>

                {/* Badges live in the summary so the list is scannable while
                    collapsed — otherwise finding the titles still missing a
                    description would mean opening all of them. */}
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                  {!book.published && (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white/60">
                      Hidden
                    </span>
                  )}
                  {!book.description?.trim() && (
                    <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-gold">
                      No description
                    </span>
                  )}
                  {book.manual && (
                    <span
                      title="Protected from the Audible sync"
                      className="rounded-full bg-white/10 px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-white/45"
                    >
                      Manual
                    </span>
                  )}
                </div>

                <Chevron />
              </summary>

              <div className="border-t border-white/10 p-4">
                <a
                  href={`/narrated/${book.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-4 inline-block text-xs text-gold underline-offset-4 hover:underline"
                >
                  View /narrated/{book.slug} ↗
                </a>

                <ActionForm action={updateBook} label="Save">
                  <input type="hidden" name="id" value={book.id} />

                  <label className={labelCls} htmlFor={`desc-${book.id}`}>
                    Description
                  </label>
                  <textarea
                    id={`desc-${book.id}`}
                    name="description"
                    rows={3}
                    defaultValue={book.description ?? ""}
                    placeholder="A few sentences about the story and the performance…"
                    className={field}
                  />

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelCls} htmlFor={`credit-${book.id}`}>
                        Narrator credit
                      </label>
                      <input
                        id={`credit-${book.id}`}
                        name="narrator_credit"
                        defaultValue={book.narrator_credit ?? ""}
                        className={field}
                      />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor={`release-${book.id}`}>
                        Release date
                      </label>
                      <input
                        id={`release-${book.id}`}
                        name="release_date"
                        type="date"
                        defaultValue={toDateInput(book.release_date)}
                        className={field}
                      />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor={`cover-${book.id}`}>
                        Cover URL
                      </label>
                      <input
                        id={`cover-${book.id}`}
                        name="cover_url"
                        defaultValue={book.cover_url}
                        className={field}
                      />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor={`audible-${book.id}`}>
                        Audible URL
                      </label>
                      <input
                        id={`audible-${book.id}`}
                        name="audible_url"
                        defaultValue={book.audible_url ?? ""}
                        className={field}
                      />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor={`siren-${book.id}`}>
                        Siren Audio URL
                      </label>
                      <input
                        id={`siren-${book.id}`}
                        name="siren_url"
                        defaultValue={book.siren_url ?? ""}
                        placeholder="https://siren.audio/audiobooks/…"
                        className={field}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls} htmlFor={`coverfile-${book.id}`}>
                        Replace cover with an upload
                      </label>
                      <input
                        id={`coverfile-${book.id}`}
                        name="cover_file"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        className="w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-gold/20 file:px-3 file:py-2 file:text-sm file:font-bold file:text-gold hover:file:bg-gold/30"
                      />
                      <p className="mt-1 text-xs text-white/40">
                        Optional. Choosing a file replaces whatever the cover URL
                        points at. Square artwork, JPEG/PNG/WebP, under 8MB.
                      </p>
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
              </div>
            </details>
          </div>
        ))}
      </SortableList>
    </div>
  );
}
