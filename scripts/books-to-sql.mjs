/**
 * Emits an idempotent upsert for the books table from the Audible pipeline's
 * books.json. Used for the one-time seed; ongoing updates go through
 * /api/books/sync, which does the same upsert over HTTP.
 *
 *   node scripts/books-to-sql.mjs [path-to-books.json] > seed-books.sql
 *
 * Defaults to fetching the live feed if no path is given.
 */
const FEED =
  "https://memedevengineer.github.io/audible-portfolio-StephanieBetchart/books.json";

const q = (v) =>
  v === null || v === undefined || v === "" ? "null" : `'${String(v).replace(/'/g, "''")}'`;
const n = (v) => (v === null || v === undefined || v === "" ? "null" : Number(v));

/**
 * The pipeline captures whatever Audible search URL it happened to land on,
 * which drags along ~300 characters of session tracking (qid, pf_rd_*,
 * pageLoadId, creativeId…). Those are tied to a scrape session, not to the
 * book, so they're noise at best and stale referrers at worst. The bare
 * /pd/<slug>/<ASIN> resolves fine on its own.
 */
const cleanUrl = (u) => (u ? String(u).split("?")[0] : u);

const path = process.argv[2];
const data = path
  ? JSON.parse(await (await import("node:fs/promises")).readFile(path, "utf8"))
  : await (await fetch(FEED)).json();

const rows = data.books.map((b, i) =>
  `  (${q(b.title)}, ${q(b.author)}, ${q(b.cover)}, ${q(cleanUrl(b.audible_url))}, ` +
  `${q(b.release_date)}, ${q(b.searched_narrator)}, ${q(JSON.stringify(b.co_narrators ?? []))}::jsonb, ` +
  `${q(b.rating_text)}, ${n(b.reviews)}, ${q(b.credit_note)}, ${b.manual ? "true" : "false"}, ${i * 10}, true)`
);

process.stdout.write(
  `insert into public.books
  (title, author, cover_url, audible_url, release_date, narrator_credit,
   co_narrators, rating_text, reviews, credit_note, manual, sort_order, published)
values
${rows.join(",\n")}
on conflict (title, author) do update set
  cover_url       = excluded.cover_url,
  audible_url     = excluded.audible_url,
  release_date    = excluded.release_date,
  narrator_credit = excluded.narrator_credit,
  co_narrators    = excluded.co_narrators,
  rating_text     = excluded.rating_text,
  reviews         = excluded.reviews
where public.books.manual = false;
`
);
