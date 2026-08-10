import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatReleaseDate, hasRealCover, type Book } from "@/lib/books";
import { SITE } from "@/lib/content";
import { getBookBySlug, getPublishedBooks } from "@/lib/queries.server";
import { bookJsonLd } from "@/lib/structured-data";

export const revalidate = 3600;

/**
 * Prerender every title at build time. There are ~22 of them and they change
 * a few times a month, so the whole set costs less than one visitor waiting
 * on a cold render.
 */
export async function generateStaticParams() {
  const books = await getPublishedBooks();
  return books.map((b) => ({ slug: b.slug }));
}

type Props = { params: Promise<{ slug: string }> };

/** The one sentence that describes this title, used for meta and on-page. */
function summarise(book: Book): string {
  const released = formatReleaseDate(book.release_date);
  const narrators = book.co_narrators?.length
    ? book.co_narrators.map((n) => n.name)
    : book.narrator_credit
      ? [book.narrator_credit]
      : [];

  const who =
    narrators.length > 1
      ? `${narrators.slice(0, -1).join(", ")} and ${narrators[narrators.length - 1]}`
      : (narrators[0] ?? SITE.narrator);

  return `${book.title} by ${book.author}, narrated by ${who}${released ? `, released ${released}` : ""}.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) return { title: "Not found" };

  const description =
    book.description?.trim() ||
    `${summarise(book)} Audiobook narration by ${SITE.narrator}${
      book.narrator_credit?.includes(SITE.penName) ? ` (${SITE.penName})` : ""
    }.`;

  const image = book.cover_url.startsWith("http")
    ? book.cover_url
    : `${SITE.url}${book.cover_url}`;

  return {
    title: `${book.title} — narrated by ${book.narrator_credit ?? SITE.narrator}`,
    description,
    alternates: { canonical: `/narrated/${book.slug}` },
    openGraph: {
      type: "book",
      title: `${book.title} by ${book.author}`,
      description,
      url: `/narrated/${book.slug}`,
      images: [{ url: image, alt: `Cover art for ${book.title}` }],
    },
    twitter: {
      card: "summary",
      title: `${book.title} by ${book.author}`,
      description,
      images: [image],
    },
  };
}

export default async function BookPage({ params }: Props) {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) notFound();

  const released = formatReleaseDate(book.release_date);
  const narrators = book.co_narrators?.length
    ? book.co_narrators
    : book.narrator_credit
      ? [{ name: book.narrator_credit }]
      : [];

  // A handful of other titles, so each page links onward rather than dead-ending.
  const all = await getPublishedBooks();
  const alsoNarrated = all.filter((b) => b.slug !== book.slug).slice(0, 6);

  return (
    <div className="mx-auto w-full max-w-[1500px] px-5 py-10 md:px-9">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bookJsonLd(book)) }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-white/60">
        <Link href="/" className="transition-colors hover:text-gold">
          Home
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <Link href="/#narrated" className="transition-colors hover:text-gold">
          Narrated Works
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="text-white/85">{book.title}</span>
      </nav>

      <article className="panel p-6 md:p-8">
        <div className="grid gap-8 md:grid-cols-[280px_minmax(0,1fr)]">
          <div className="mx-auto w-full max-w-[280px]">
            <div className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-chip)] border border-white/10 bg-black/40">
              {hasRealCover(book.cover_url) ? (
                <Image
                  src={book.cover_url}
                  alt={`Cover art for ${book.title}`}
                  fill
                  sizes="280px"
                  priority
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center">
                  <span className="font-display text-xs uppercase tracking-[1.5px] text-gold">
                    Cover coming soon
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <h1 className="section-title text-[1.9rem] leading-tight md:text-[2.3rem]">
              {book.title}
            </h1>
            <p className="mt-2 text-lg text-white/85">by {book.author}</p>

            <dl className="mt-6 space-y-3 text-white/85">
              <div>
                <dt className="inline font-bold text-white/70">Narrated by: </dt>
                <dd className="inline">{narrators.map((n) => n.name).join(" · ")}</dd>
              </div>
              {released && (
                <div>
                  <dt className="inline font-bold text-white/70">Released: </dt>
                  <dd className="inline">{released}</dd>
                </div>
              )}
              {book.rating_text && book.rating_text !== "Not rated yet" && (
                <div>
                  <dt className="inline font-bold text-white/70">Audible rating: </dt>
                  <dd className="inline">{book.rating_text}</dd>
                </div>
              )}
            </dl>

            {book.description?.trim() && (
              <p className="body-copy mt-6 text-[1.05rem]">{book.description}</p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              {book.audible_url && (
                <a
                  href={book.audible_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-[var(--radius-chip)] bg-gold px-6 py-3.5 font-bold tracking-[1px] text-white shadow-[0_0_14px_rgba(196,139,54,0.28)] transition hover:-translate-y-0.5 hover:bg-gold-bright"
                >
                  Listen on Audible
                </a>
              )}
              <Link
                href="/contact"
                className="email-chip rounded-[var(--radius-chip)] px-6 py-3.5 font-medium text-white/95 transition"
              >
                Book {SITE.narrator.split(" ")[0]}
              </Link>
            </div>
          </div>
        </div>
      </article>

      {alsoNarrated.length > 0 && (
        <section aria-labelledby="also-heading" className="panel mt-6 p-5 md:p-6">
          <h2 id="also-heading" className="section-title mb-5 text-[1.3rem]">
            More Narrated Works
          </h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {alsoNarrated.map((other) => (
              <li key={other.id}>
                <Link
                  href={`/narrated/${other.slug}`}
                  className="group block rounded-[var(--radius-chip)] border border-white/10 bg-white/[0.06] p-2 transition hover:-translate-y-1 hover:border-gold/40"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-[8px] bg-black/40">
                    {hasRealCover(other.cover_url) && (
                      <Image
                        src={other.cover_url}
                        alt=""
                        fill
                        sizes="180px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 font-display text-[0.72rem] uppercase leading-snug tracking-[0.5px] text-white/90 group-hover:text-gold">
                    {other.title}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
