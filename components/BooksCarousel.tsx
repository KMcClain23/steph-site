"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { formatReleaseDate, hasRealCover, type Book } from "@/lib/books";

function BookCard({ book }: { book: Book }) {
  const released = formatReleaseDate(book.release_date);
  const narrators = book.co_narrators?.length
    ? book.co_narrators
    : book.narrator_credit
      ? [{ name: book.narrator_credit }]
      : [];

  return (
    <li className="w-[220px] shrink-0 snap-start">
      <article className="flex h-full flex-col gap-3 rounded-[var(--radius-chip)] border border-white/10 bg-white/[0.06] p-3 shadow-[0_0_18px_rgba(0,0,0,0.25)] transition hover:-translate-y-1 hover:border-gold/40 hover:bg-white/[0.09]">
        <div className="relative aspect-square w-full overflow-hidden rounded-[10px] bg-black/40">
          {hasRealCover(book.cover_url) ? (
            <Image
              src={book.cover_url}
              alt={`Cover art for ${book.title}`}
              fill
              sizes="220px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
              <span className="font-display text-[0.7rem] uppercase tracking-[1.5px] text-gold">
                Cover coming soon
              </span>
              <span className="text-[0.75rem] leading-snug text-white/60">
                {book.title}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <h3 className="font-display text-[0.85rem] font-semibold uppercase leading-snug tracking-[0.5px] text-white/95">
            {/*
              The card title links to the title's own page. This is the only
              internal path to those 22 pages, so without it they'd be
              orphaned — reachable in the sitemap but linked from nowhere,
              which is a weak signal to a crawler and a dead end for a reader.
            */}
            <Link
              href={`/narrated/${book.slug}`}
              className="transition-colors hover:text-gold"
            >
              {book.title}
            </Link>
          </h3>
          <p className="text-[0.78rem] text-white/70">{book.author}</p>
          {released && (
            <p className="text-[0.72rem] text-white/50">{released}</p>
          )}
          <p className="mt-1 text-[0.72rem] leading-relaxed text-white/60">
            {narrators.map((n) => n.name).join(" · ")}
          </p>
        </div>

        {book.audible_url && (
          <a
            href={book.audible_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[10px] border border-gold/45 bg-gold/15 px-3 py-2 text-center text-[0.72rem] font-bold uppercase tracking-[1px] text-gold transition hover:bg-gold/25 hover:text-gold-bright"
          >
            Listen on Audible
          </a>
        )}
      </article>
    </li>
  );
}

/**
 * Replaces the 500px-tall <iframe> the old site embedded. Same idea — a
 * horizontal shelf of covers — but the markup is part of the page, so it
 * resizes with the viewport, gets indexed, and inherits the site's styling
 * instead of arriving with its own.
 *
 * Deliberately not auto-scrolling: 21 covers that drift on their own are
 * hard to actually read. Arrows and a swipeable track put the reader in
 * control, and the whole shelf is keyboard-scrollable.
 */
export default function BooksCarousel({ books }: { books: Book[] }) {
  const trackRef = useRef<HTMLUListElement>(null);

  const scrollBy = (direction: 1 | -1) => {
    trackRef.current?.scrollBy({ left: direction * 480, behavior: "smooth" });
  };

  return (
    <section
      id="narrated"
      aria-labelledby="narrated-heading"
      className="mx-auto w-full max-w-[1500px] scroll-mt-24 px-5 py-6 md:px-9"
    >
      <div className="panel p-5 md:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="narrated-heading" className="section-title text-[1.7rem]">
              Books I&rsquo;ve Narrated
            </h2>
            <p className="mt-1 text-[0.85rem] text-white/65">
              {books.length} audiobook{books.length === 1 ? "" : "s"} narrated
            </p>
          </div>

          {books.length > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => scrollBy(-1)}
                aria-label="Scroll to previous titles"
                className="grid h-10 w-10 place-items-center rounded-full border border-gold/45 bg-gold/10 text-gold transition hover:bg-gold/25 hover:text-gold-bright"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => scrollBy(1)}
                aria-label="Scroll to more titles"
                className="grid h-10 w-10 place-items-center rounded-full border border-gold/45 bg-gold/10 text-gold transition hover:bg-gold/25 hover:text-gold-bright"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {books.length === 0 ? (
          <p className="body-copy">Titles are being added — check back soon.</p>
        ) : (
          <ul
            ref={trackRef}
            tabIndex={0}
            aria-label="Narrated audiobooks"
            className="book-shelf flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3"
          >
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
