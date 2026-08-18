import type { Book } from "@/lib/books";
import { SITE, SOCIALS } from "@/lib/content";
import type { Demo } from "@/lib/demos";

/**
 * Schema.org graph for the homepage.
 *
 * Written as a single @graph with @id cross-references rather than a pile of
 * disconnected blocks, so search engines can see that one Person narrates all
 * of these titles — including the ones credited to Ann Dahlia. That link is
 * the whole point: her two working names should resolve to one entity.
 *
 * Deliberately NOT included: aggregateRating. Audible's star ratings are real,
 * but marking up ratings you don't host, on your own site, about your own
 * work, is what Google's review-snippet guidelines call self-serving — it
 * risks a manual action for a rich result she doesn't need.
 */

const id = (fragment: string) => `${SITE.url}/#${fragment}`;

const PERSON = id("person");
const ORGANISATION = id("organisation");
const WEBSITE = id("website");

/** The pipeline stores MM-DD-YY; schema.org wants ISO 8601. */
function isoDate(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const m = /^(\d{2})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return undefined;
  const [, mm, dd, yy] = m;
  return `20${yy}-${mm}-${dd}`;
}

/** Seconds → ISO 8601 duration, e.g. 41 → "PT41S", 130 → "PT2M10S". */
function isoDuration(seconds: number | null): string | undefined {
  if (!seconds || seconds <= 0) return undefined;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `PT${m ? `${m}M` : ""}${s ? `${s}S` : ""}` || undefined;
}

/** Her own credits point at the single Person node; everyone else is inline. */
function narratorNode(name: string) {
  const isHer =
    name.toLowerCase().includes(SITE.narrator.toLowerCase()) ||
    name.toLowerCase().includes(SITE.penName.toLowerCase());
  return isHer ? { "@id": PERSON } : { "@type": "Person", name };
}

export function homepageJsonLd(books: Book[], demos: Demo[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": WEBSITE,
        url: SITE.url,
        name: SITE.name,
        inLanguage: "en-US",
        publisher: { "@id": ORGANISATION },
      },
      {
        "@type": "Organization",
        "@id": ORGANISATION,
        name: SITE.legalName,
        alternateName: SITE.name,
        url: SITE.url,
        email: `mailto:${SITE.email}`,
        logo: {
          "@type": "ImageObject",
          url: `${SITE.url}/logo.png`,
          width: 456,
          height: 587,
        },
        founder: { "@id": PERSON },
        sameAs: SOCIALS.map((s) => s.href),
      },
      {
        "@type": "Person",
        "@id": PERSON,
        name: SITE.narrator,
        alternateName: SITE.penName,
        jobTitle: "Audiobook Narrator",
        description: `${SITE.narrator} is an audiobook narrator working in ${SITE.genres.join(", ").toLowerCase()}. She also records explicit and horror titles as ${SITE.penName}.`,
        url: SITE.url,
        email: `mailto:${SITE.email}`,
        image: `${SITE.url}/headshot.jpg`,
        worksFor: { "@id": ORGANISATION },
        knowsAbout: [...SITE.genres, "Audiobook narration", "Character voice acting"],
        sameAs: SOCIALS.map((s) => s.href),
        mainEntityOfPage: { "@id": WEBSITE },
      },
      {
        "@type": "ProfilePage",
        "@id": id("webpage"),
        url: SITE.url,
        name: `${SITE.narrator} | ${SITE.name}`,
        isPartOf: { "@id": WEBSITE },
        /**
         * mainEntity, not about.
         *
         * Both are valid schema.org for "this page is about that thing", but
         * Google's ProfilePage rich result specifically requires mainEntity —
         * with `about` alone Search Console reports the page as missing a
         * required field and drops the result entirely. `about` is kept
         * alongside it because it remains correct and costs nothing.
         */
        mainEntity: { "@id": PERSON },
        about: { "@id": PERSON },
        primaryImageOfPage: { "@type": "ImageObject", url: `${SITE.url}/og.jpg` },
      },

      // Every narrated title, each tied back to the same Person via readBy.
      ...books.map((book) => {
        const narrators = book.co_narrators?.length
          ? book.co_narrators.map((n) => n.name)
          : book.narrator_credit
            ? [book.narrator_credit]
            : [];

        return {
          "@type": "Audiobook",
          "@id": id(`book-${book.id}`),
          name: book.title,
          bookFormat: "https://schema.org/AudiobookFormat",
          inLanguage: "en",
          author: { "@type": "Person", name: book.author },
          readBy: narrators.map(narratorNode),
          image: book.cover_url.startsWith("http")
            ? book.cover_url
            : `${SITE.url}${book.cover_url}`,
          ...(book.audible_url ? { url: book.audible_url } : {}),
          ...(isoDate(book.release_date)
            ? { datePublished: isoDate(book.release_date) }
            : {}),
        };
      }),

      // Demo reels. Durations come from the database, so these are accurate
      // without the page having to touch a single audio file.
      ...demos.map((demo) => ({
        "@type": "AudioObject",
        "@id": id(`demo-${demo.id}`),
        name: [demo.title, demo.title_secondary].filter(Boolean).join(" — "),
        ...(demo.subtitle ? { description: demo.subtitle.replace(/\n/g, ", ") } : {}),
        contentUrl: `${SITE.url}${demo.audio_url}`,
        encodingFormat: "audio/mpeg",
        ...(isoDuration(demo.duration_seconds)
          ? { duration: isoDuration(demo.duration_seconds) }
          : {}),
        creator: { "@id": PERSON },
      })),
    ],
  };
}

/**
 * Per-title graph for /narrated/[slug]. Repeats the Person node rather than
 * only referencing it, because this page is crawled on its own and a bare
 * @id pointing at the homepage's graph resolves to nothing here.
 */
export function bookJsonLd(book: Book) {
  const narrators = book.co_narrators?.length
    ? book.co_narrators.map((n) => n.name)
    : book.narrator_credit
      ? [book.narrator_credit]
      : [];

  const url = `${SITE.url}/narrated/${book.slug}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": PERSON,
        name: SITE.narrator,
        alternateName: SITE.penName,
        jobTitle: "Audiobook Narrator",
        url: SITE.url,
        image: `${SITE.url}/headshot.jpg`,
      },
      {
        "@type": "Audiobook",
        "@id": `${url}#audiobook`,
        name: book.title,
        bookFormat: "https://schema.org/AudiobookFormat",
        inLanguage: "en",
        url,
        author: { "@type": "Person", name: book.author },
        readBy: narrators.map(narratorNode),
        image: book.cover_url.startsWith("http")
          ? book.cover_url
          : `${SITE.url}${book.cover_url}`,
        ...(book.description?.trim() ? { description: book.description.trim() } : {}),
        ...(isoDate(book.release_date)
          ? { datePublished: isoDate(book.release_date) }
          : {}),
        // Every place the title can be heard. sameAs takes an array, so a
        // title on both Audible and Siren lists both.
        ...(() => {
          const elsewhere = [book.audible_url, book.siren_url].filter(Boolean);
          return elsewhere.length ? { sameAs: elsewhere } : {};
        })(),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumbs`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
          {
            "@type": "ListItem",
            position: 2,
            name: "Narrated Works",
            item: `${SITE.url}/#narrated`,
          },
          { "@type": "ListItem", position: 3, name: book.title, item: url },
        ],
      },
    ],
  };
}

export function contactPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "@id": `${SITE.url}/contact#webpage`,
    url: `${SITE.url}/contact`,
    name: `Contact ${SITE.narrator}`,
    isPartOf: { "@id": WEBSITE },
    about: { "@id": PERSON },
  };
}
