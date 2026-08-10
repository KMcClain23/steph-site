/**
 * Book types and pure helpers. Deliberately free of any Supabase import:
 * BooksCarousel is a client component and imports from here, and anything
 * this module touches lands in the browser bundle. The queries live in
 * lib/queries.server.ts.
 */

export type CoNarrator = { name: string; audible_list?: string };

export type Book = {
  id: string;
  title: string;
  author: string;
  cover_url: string;
  audible_url: string | null;
  release_date: string | null;
  narrator_credit: string | null;
  co_narrators: CoNarrator[];
  rating_text: string | null;
};

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
 * Audible serves a generic "cover art unavailable" SVG for titles that haven't
 * shipped art yet. next/image can't optimise remote SVG without opening the
 * door to arbitrary remote SVG, so those get a styled placeholder instead.
 */
export function hasRealCover(url: string): boolean {
  return !url.endsWith(".svg") && !url.includes("coverart-prod-unavailable");
}
