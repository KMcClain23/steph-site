import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { slugify } from "@/lib/books";
import { createServiceRoleClient } from "@/lib/supabase";

/**
 * Pulls the Audible pipeline's feed and upserts it into `books`.
 *
 * The old site embedded that pipeline's GitHub Pages app in an iframe, so the
 * feed was the source of truth. Now the database is, and this route is how
 * the pipeline writes to it — call it from a cron, or POST to it at the end
 * of a scrape run.
 *
 * Rows flagged `manual` are left alone, so anything hand-corrected in
 * Supabase survives the next sync.
 */

const FEED =
  "https://memedevengineer.github.io/audible-portfolio-StephanieBetchart/books.json";

const FeedSchema = z.object({
  books: z.array(
    z.object({
      title: z.string().min(1),
      author: z.string().min(1),
      cover: z.string().url(),
      audible_url: z.string().url().nullable().optional(),
      release_date: z.string().nullable().optional(),
      searched_narrator: z.string().nullable().optional(),
      credit_note: z.string().nullable().optional(),
      rating_text: z.string().nullable().optional(),
      reviews: z.number().nullable().optional(),
      manual: z.boolean().optional(),
      co_narrators: z
        .array(z.object({ name: z.string(), audible_list: z.string().optional() }))
        .optional(),
    })
  ),
});

/** Strips the scrape session's tracking params; the bare /pd/<ASIN> resolves. */
const cleanUrl = (u?: string | null) => (u ? u.split("?")[0] : null);

/**
 * Composite key for the "is this row hand-curated?" lookup.
 *
 * \0 can't occur in a title or an author, so it can't produce a false match
 * the way a space could ("Book A" + "B Author" vs "Book" + "A B Author").
 * Written as an escape rather than a literal control character — an actual
 * NUL byte in the source makes git, grep and diff treat the file as binary.
 */
const bookKey = (title: string, author: string) => `${title}\0${author}`;

/**
 * Two callers, two secrets.
 *
 * BOOKS_SYNC_TOKEN is for the Audible pipeline POSTing at the end of a scrape.
 * CRON_SECRET is what Vercel Cron sends, and Vercel issues a GET — so the same
 * work has to be reachable both ways.
 */
function authorized(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const secrets = [
    process.env.BOOKS_SYNC_TOKEN,
    process.env.CRON_SECRET,
  ].filter(Boolean) as string[];

  // No secret configured means no access, rather than open access.
  return secrets.some((secret) => header === `Bearer ${secret}`);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let feed;
  try {
    const res = await fetch(FEED, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Feed responded ${res.status}.` },
        { status: 502 }
      );
    }
    feed = FeedSchema.parse(await res.json());
  } catch (err) {
    console.error("Books feed fetch/parse failed:", err);
    return NextResponse.json(
      { error: "Could not read the books feed." },
      { status: 502 }
    );
  }

  const supabase = createServiceRoleClient();

  const { data: existingRows, error: existingError } = await supabase
    .from("books")
    .select("title, author, slug, manual");

  if (existingError) {
    console.error("Could not read existing rows:", existingError.message);
    return NextResponse.json({ error: "Database read failed." }, { status: 500 });
  }

  // Hand-curated rows keep whatever Supabase already holds.
  const manual = new Set(
    (existingRows ?? []).filter((r) => r.manual).map((r) => bookKey(r.title, r.author))
  );

  // books.slug is NOT NULL and unique, so every row in the payload needs one.
  //
  // An upsert updates every column it's given, so generating a fresh slug for
  // a row that already exists would silently move a live, possibly-indexed URL
  // the moment a title changed upstream. Existing rows therefore keep the slug
  // they already have; only genuinely new titles get one derived.
  const existingSlug = new Map(
    (existingRows ?? []).map((r) => [bookKey(r.title, r.author), r.slug as string])
  );
  const seenSlugs = new Set<string>(existingSlug.values());

  const slugFor = (title: string, author: string) => {
    const known = existingSlug.get(bookKey(title, author));
    if (known) return known;

    const base = slugify(title);
    if (!seenSlugs.has(base)) {
      seenSlugs.add(base);
      return base;
    }
    // Same slug as a different title — disambiguate with the author, matching
    // how the initial backfill resolved collisions.
    const withAuthor = `${base}-${slugify(author)}`;
    seenSlugs.add(withAuthor);
    return withAuthor;
  };

  const rows = feed.books
    .filter((b) => !manual.has(bookKey(b.title, b.author)))
    .map((b, i) => ({
      slug: slugFor(b.title, b.author),
      title: b.title,
      author: b.author,
      cover_url: b.cover,
      audible_url: cleanUrl(b.audible_url),
      release_date: b.release_date ?? null,
      narrator_credit: b.searched_narrator ?? null,
      co_narrators: b.co_narrators ?? [],
      rating_text: b.rating_text ?? null,
      reviews: b.reviews ?? null,
      credit_note: b.credit_note || null,
      manual: false,
      sort_order: i * 10,
      published: true,
    }));

  const { error } = await supabase
    .from("books")
    .upsert(rows, { onConflict: "title,author" });

  if (error) {
    console.error("Books upsert failed:", error.message);
    return NextResponse.json({ error: "Database write failed." }, { status: 500 });
  }

  // The homepage is ISR with a 10-minute window, so without this a sync
  // wouldn't show up on the site for up to ten minutes. Push the new data out
  // immediately instead.
  //
  // This also doubles as the manual escape hatch: after editing a row directly
  // in Supabase, calling this endpoint republishes the page right away rather
  // than waiting out the cache or triggering a redeploy.
  revalidatePath("/");
  revalidatePath("/narrated", "layout");

  return NextResponse.json({
    ok: true,
    received: feed.books.length,
    upserted: rows.length,
    skipped_manual: feed.books.length - rows.length,
    revalidated: ["/", "/narrated/*"],
  });
}

/**
 * Vercel Cron calls its target with GET, so the scheduled run enters here.
 * Same work, same authorisation — only the method differs.
 */
export async function GET(request: Request) {
  return POST(request);
}
