import Image from "next/image";
import { hasRealCover } from "@/lib/books";
import { requireAdmin } from "@/lib/admin-auth";
import { createServiceRoleClient } from "@/lib/supabase";
import { createBook, reorderBooks, updateBook } from "../actions";
import FileField from "../file-field";
import ActionForm from "../save-button";
import SortableList from "../sortable-list";
import {
  AddPanel,
  Badge,
  Checkbox,
  Chevron,
  ErrorNote,
  ExternalLink,
  Field,
  PageHeader,
  Row,
  RowSummary,
  inputClass,
} from "../ui";

export const dynamic = "force-dynamic";

type BookRow = {
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

export default async function BooksAdminPage() {
  await requireAdmin();

  const { data, error } = await createServiceRoleClient()
    .from("books")
    .select(
      "id, slug, title, author, cover_url, audible_url, siren_url, narrator_credit, description, release_date, sort_order, published, manual"
    )
    // Published first, then hidden — in Postgres false sorts before true,
    // so descending puts the live rows on top. Within each group the
    // public sort_order still applies.
    .order("published", { ascending: false })
    .order("sort_order", { ascending: true });

  const books = (data ?? []) as BookRow[];
  const missing = books.filter((b) => !b.description?.trim()).length;

  return (
    <div>
      <PageHeader title="Narrated Works" count={`${books.length} titles`}>
        Each title has its own page at{" "}
        <code className="text-white/70">/narrated/&lt;slug&gt;</code>. A
        description is the single biggest thing you can add — those pages have
        very little unique text without one.
        {missing > 0 && (
          <>
            {" "}
            <strong className="text-gold">{missing} still need one.</strong>
          </>
        )}
      </PageHeader>

      {error && <ErrorNote>Couldn&rsquo;t load titles: {error.message}</ErrorNote>}

      <AddPanel label="Add a title by hand">
            <p className="mb-4 max-w-2xl text-sm leading-relaxed text-white/55">
              Most titles arrive automatically from Audible. Use this for the
              ones that can&rsquo;t — where Stephanie is credited in the
              description rather than the narrator field, so the pipeline never
              sees her. Anything added here is protected from the sync.
            </p>

            <ActionForm
              action={createBook}
              label="Add title"
              successMessage="Title added."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title" htmlFor="new-title" required>
                  <input id="new-title" name="title" required className={inputClass} />
                </Field>
                <Field label="Author" htmlFor="new-author" required>
                  <input id="new-author" name="author" required className={inputClass} />
                </Field>
                <Field label="Cover" className="sm:col-span-2" required>
                  <FileField kind="cover" name="cover_upload" title="cover" />
                </Field>
                <Field
                  label="…or paste a cover URL"
                  htmlFor="new-cover"
                  hint="Only hosts the site can load images from are accepted; an upload always wins."
                  className="sm:col-span-2"
                >
                  <input
                    id="new-cover"
                    name="cover_url"
                    placeholder="https://m.media-amazon.com/images/I/….jpg"
                    className={inputClass}
                  />
                </Field>
                <Field label="Audible URL" htmlFor="new-audible">
                  <input id="new-audible" name="audible_url" className={inputClass} />
                </Field>
                <Field label="Siren Audio URL" htmlFor="new-siren">
                  <input
                    id="new-siren"
                    name="siren_url"
                    placeholder="https://siren.audio/audiobooks/…"
                    className={inputClass}
                  />
                </Field>
                <Field label="Narrator credit" htmlFor="new-credit">
                  <input
                    id="new-credit"
                    name="narrator_credit"
                    placeholder="Ann Dahlia"
                    className={inputClass}
                  />
                </Field>
                <Field label="Release date" htmlFor="new-release">
                  <input
                    id="new-release"
                    name="release_date"
                    type="date"
                    className={inputClass}
                  />
                </Field>
                <Field label="Description" htmlFor="new-description" className="sm:col-span-2">
                  <textarea
                    id="new-description"
                    name="description"
                    rows={3}
                    className={inputClass}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Checkbox name="published" defaultChecked label="Publish immediately" />
                </div>
              </div>
            </ActionForm>
      </AddPanel>

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
        hidden={books.filter((b) => !b.published).map((b) => b.id)}
        flag={{
          label: "Needs a description",
          ids: books.filter((b) => !b.description?.trim()).map((b) => b.id),
        }}
      >
        {books.map((book) => (
          <div key={book.id}>
            <Row>
              <RowSummary>
                <div className="relative h-[var(--row-media,3.25rem)] w-[var(--row-media,3.25rem)] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.9)]">
                  {hasRealCover(book.cover_url) && (
                    <Image src={book.cover_url} alt="" fill sizes="64px" className="object-cover" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-semibold leading-tight text-white">
                    {book.title}
                  </p>
                  <p className="truncate text-xs leading-tight text-white/40">
                    {book.author}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                  {!book.published && <Badge>Hidden</Badge>}
                  {!book.description?.trim() && <Badge tone="gold">No description</Badge>}
                  {book.manual && <Badge title="Protected from the Audible sync">Manual</Badge>}
                </div>

                <Chevron />
              </RowSummary>

              <div className="admin-reveal border-t border-white/[0.07] p-4">
                <div className="mb-4">
                  <ExternalLink href={`/narrated/${book.slug}`}>
                    /narrated/{book.slug}
                  </ExternalLink>
                </div>

                <ActionForm
                  action={updateBook}
                  label="Save"
                  successMessage={`Saved ${book.title}.`}
                >
                  <input type="hidden" name="id" value={book.id} />

                  <Field
                    label="Description"
                    htmlFor={`desc-${book.id}`}
                    hint="A few sentences about the story and the performance."
                  >
                    <textarea
                      id={`desc-${book.id}`}
                      name="description"
                      rows={3}
                      defaultValue={book.description ?? ""}
                      className={inputClass}
                    />
                  </Field>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Narrator credit" htmlFor={`credit-${book.id}`}>
                      <input
                        id={`credit-${book.id}`}
                        name="narrator_credit"
                        defaultValue={book.narrator_credit ?? ""}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Release date" htmlFor={`release-${book.id}`}>
                      <input
                        id={`release-${book.id}`}
                        name="release_date"
                        type="date"
                        defaultValue={toDateInput(book.release_date)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Audible URL" htmlFor={`audible-${book.id}`}>
                      <input
                        id={`audible-${book.id}`}
                        name="audible_url"
                        defaultValue={book.audible_url ?? ""}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Siren Audio URL" htmlFor={`siren-${book.id}`}>
                      <input
                        id={`siren-${book.id}`}
                        name="siren_url"
                        defaultValue={book.siren_url ?? ""}
                        placeholder="https://siren.audio/audiobooks/…"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Replace the cover" className="sm:col-span-2">
                      <FileField
                        kind="cover"
                        name="cover_upload"
                        title={book.title}
                        currentUrl={hasRealCover(book.cover_url) ? book.cover_url : null}
                      />
                    </Field>
                    <Field
                      label="Cover URL"
                      htmlFor={`cover-${book.id}`}
                      hint="An upload above always takes precedence over this."
                      className="sm:col-span-2"
                    >
                      <input
                        id={`cover-${book.id}`}
                        name="cover_url"
                        defaultValue={book.cover_url}
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-6">
                    <Checkbox
                      name="published"
                      defaultChecked={book.published}
                      label="Published"
                    />
                    <Checkbox
                      name="manual"
                      defaultChecked={book.manual}
                      label="Protect from sync"
                      hint="(keeps your edits when the Audible pipeline runs)"
                    />
                  </div>
                </ActionForm>
              </div>
            </Row>
          </div>
        ))}
      </SortableList>
    </div>
  );
}
