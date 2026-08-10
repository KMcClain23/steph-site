import About from "@/components/About";
import BooksCarousel from "@/components/BooksCarousel";
import DemoGrid from "@/components/DemoGrid";
import Hero from "@/components/Hero";
import { getPublishedBooks, getPublishedDemos } from "@/lib/queries.server";
import { homepageJsonLd } from "@/lib/structured-data";

// Content changes when Stephanie edits it in Supabase or the Audible pipeline
// syncs, not on every request. Ten minutes keeps it fresh without making the
// database part of the critical path for each visitor.
export const revalidate = 600;

export default async function HomePage() {
  const [demos, books] = await Promise.all([
    getPublishedDemos(),
    getPublishedBooks(),
  ]);

  const jsonLd = homepageJsonLd(books, demos);

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
