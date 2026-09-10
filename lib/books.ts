/**
 * Book types and pure helpers. Deliberately free of any Supabase import:
 * BooksCarousel is a client component and imports from here, and anything
 * this module touches lands in the browser bundle. The queries live in
 * lib/queries.server.ts.
 */

export type CoNarrator = { name: string; audible_list?: string };

export type Book = {
  id: string;
  slug: string;
  title: string;
  author: string;
  cover_url: string;
  audible_url: string | null;
  siren_url: string | null;
  release_date: string | null;
  narrator_credit: string | null;
  co_narrators: CoNarrator[];
  rating_text: string | null;
  description: string | null;
  /** True for titles hand-placed at the front of the shelf. See sortBooksForDisplay. */
  pinned: boolean;
  /** Position among the pinned titles, set by dragging in /admin/books. */
  sort_order: number;
};

/**
 * Must match the SQL that backfilled the existing slugs
 * (supabase/schema.sql). Apostrophes are removed rather than treated as a
 * separator, so "It's Always Been Us" becomes its-always-been-us, not
 * it-s-always-been-us.
 *
 * Slugs are stored, not derived at render time — these are public URLs, and a
 * later typo fix in a title shouldn't silently break an indexed page.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The pipeline stores release dates as MM-DD-YY strings. Parse defensively:
 * a malformed one should show as-is rather than render "Invalid Date".
 */
export function formatReleaseDate(raw: string | null): string | null {
  if (!raw) return null;
  const m = /^(\d{2})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return raw;
  const [, mm, dd, yy] = m;
  const date = new Date(Number(`20${yy}`), Number(mm) - 1, Number(dd));
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Splits the pipeline's rating string into its two numbers.
 *
 * It arrives as one run-on field — "4.0 41 ratings" — where the score and the
 * count collide into what looks like a single figure. Separating them lets the
 * page space them out.
 *
 * Returns null for anything that doesn't match, including "Not rated yet",
 * which is what unreleased titles carry. Callers can then simply omit the row.
 */
export function parseRating(
  raw: string | null
): { value: string; count: number } | null {
  if (!raw) return null;
  const m = /^\s*(\d+(?:\.\d+)?)\s+([\d,]+)\s+ratings?\s*$/i.exec(raw);
  if (!m) return null;
  const count = Number(m[2].replace(/,/g, ""));
  if (!Number.isFinite(count)) return null;
  return { value: m[1], count };
}

/**
 * Audible serves a generic "cover art unavailable" SVG for titles that haven't
 * shipped art yet. next/image can't optimise remote SVG without opening the
 * door to arbitrary remote SVG, so those get a styled placeholder instead.
 */
export function hasRealCover(url: string): boolean {
  return !url.endsWith(".svg") && !url.includes("coverart-prod-unavailable");
}

/**
 * The shelf reads newest-first.
 *
 * The pipeline stores release dates as MM-DD-YY *text*, so the database can't
 * order them: "01-04-26" sorts before "12-30-25" as a string, which is
 * backwards by a year. Every published title is fetched for the homepage
 * anyway (there are a couple of dozen), so the ordering is done here on
 * parsed dates rather than bought with a generated column and a migration.
 */
export function releaseTimestamp(raw: string | null): number | null {
  if (!raw) return null;
  const m = /^(\d{2})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const [, mm, dd, yy] = m;
  const t = new Date(Number(`20${yy}`), Number(mm) - 1, Number(dd)).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Display order for the narrated-works shelf.
 *
 * 1. Pinned titles first, in the order they were dragged in /admin/books.
 *    Newest-first is the right default, not a rule — a cover reveal or a
 *    pre-order deserves the front of the shelf whatever its date says.
 * 2. Everything else by release date, newest first.
 * 3. Titles with no usable date last rather than first. An unparseable or
 *    missing date is missing information, and the shelf should not open on a
 *    row of unknowns; alphabetical within that group keeps it stable.
 *
 * Returns a new array — callers get data straight from Supabase and should
 * not have it mutated underneath them.
 */
export function sortBooksForDisplay<T extends Pick<Book, "release_date" | "pinned" | "sort_order" | "title">>(
  books: readonly T[]
): T[] {
  return [...books].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.pinned && b.pinned) {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.title.localeCompare(b.title);
    }

    const ta = releaseTimestamp(a.release_date);
    const tb = releaseTimestamp(b.release_date);
    if (ta === null && tb === null) return a.title.localeCompare(b.title);
    if (ta === null) return 1;
    if (tb === null) return -1;
    if (ta !== tb) return tb - ta;
    return a.title.localeCompare(b.title);
  });
}
