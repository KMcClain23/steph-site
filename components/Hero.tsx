import Image from "next/image";
import { SITE } from "@/lib/content";

/**
 * The hero is a single piece of finished artwork — her name, pen name,
 * genres, tagline, logo, and headshot are all baked into it. It carries the
 * page's real H1, which lives in text underneath for search engines and
 * screen readers rather than being re-drawn on top of the image.
 */
export default function Hero() {
  return (
    <section className="mx-auto w-full max-w-[1500px] px-5 pt-6 md:px-9">
      <h1 className="sr-only">
        {SITE.narrator} — audiobook narrator, also credited as {SITE.penName}.{" "}
        {SITE.genres.join(", ")}. {SITE.tagline}
      </h1>
      <Image
        src="/hero.webp"
        alt={`${SITE.narrator} / ${SITE.penName} — ${SITE.genres.join(", ")}. ${SITE.tagline}`}
        width={1599}
        height={729}
        priority
        sizes="(max-width: 1500px) 100vw, 1500px"
        className="h-auto w-full rounded-[var(--radius-panel)]"
      />
    </section>
  );
}
