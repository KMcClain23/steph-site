import Image from "next/image";
import { PARTNERS } from "@/lib/content";

/**
 * Infinite logo marquee. The track holds the list twice and translates by
 * -50%, so the seam lands exactly where the first copy ends — the same trick
 * the old site used, minus the runtime script that counted the <a> tags to
 * write the heading. The count is just PARTNERS.length here.
 */
export default function PartnerMarquee() {
  const track = [...PARTNERS, ...PARTNERS];

  return (
    <div className="panel overflow-hidden p-7 pb-6">
      <h2 className="section-title mb-5 text-[0.95rem] uppercase md:text-[0.95rem]">
        {PARTNERS.length} Publishing Houses &amp; Production Partners
      </h2>

      <div className="marquee-viewport relative w-full overflow-hidden">
        <ul className="marquee-track flex w-max items-center gap-[45px] md:gap-[45px]">
          {track.map((p, i) => (
            <li key={`${p.name}-${i}`} className="shrink-0">
              <a
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                // The second copy is decorative duplication; hiding it from
                // assistive tech stops every partner being announced twice.
                aria-hidden={i >= PARTNERS.length}
                tabIndex={i >= PARTNERS.length ? -1 : undefined}
                className={`partner-chip flex min-w-[100px] items-center justify-center rounded-[var(--radius-chip)] px-[18px] py-[14px] md:min-w-[120px] ${
                  p.plate === "light" ? "partner-chip--light" : ""
                }`}
              >
                <Image
                  src={p.logo}
                  alt={p.name}
                  width={200}
                  height={60}
                  // sharp can't rasterise SVG, so the PRH and Podium logos
                  // have to bypass the optimiser rather than 500 on it.
                  unoptimized={p.logo.endsWith(".svg")}
                  className={`partner-logo h-[35px] w-auto max-w-[100px] object-contain md:h-[60px] md:max-w-[200px] ${
                    p.plate === "light" ? "partner-logo--plated" : ""
                  }`}
                />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
