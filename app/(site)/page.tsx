import About from "@/components/About";
import BooksCarousel from "@/components/BooksCarousel";
import DemoGrid from "@/components/DemoGrid";
import Hero from "@/components/Hero";
import { SITE, SOCIALS } from "@/lib/content";
import { getPublishedBooks, getPublishedDemos } from "@/lib/queries.server";

// Content changes when Stephanie edits it in Supabase or the Audible pipeline
// syncs, not on every request. Ten minutes keeps it fresh without making the
// database part of the critical path for each visitor.
export const revalidate = 600;

export default async function HomePage() {
  const [demos, books] = await Promise.all([
    getPublishedDemos(),
    getPublishedBooks(),
  ]);

  // Both names need to resolve to the same person in search results — that's
  // the whole reason Ann Dahlia is mentioned on the page at all.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: SITE.narrator,
    alternateName: SITE.penName,
    jobTitle: "Audiobook Narrator",
    url: SITE.url,
    email: `mailto:${SITE.email}`,
    image: `${SITE.url}/headshot.jpg`,
    worksFor: { "@type": "Organization", name: SITE.legalName },
    knowsAbout: SITE.genres,
    sameAs: SOCIALS.map((s) => s.href),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <About />
      <DemoGrid demos={demos} />
      <BooksCarousel books={books} />
    </>
  );
}
