import Link from "next/link";
import { BOOTH, SITE } from "@/lib/content";
import PartnerMarquee from "./PartnerMarquee";
import { SocialIcon } from "./SocialIcons";

export default function About() {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="mx-auto w-full max-w-[1500px] scroll-mt-24 px-5 py-14 md:px-9"
    >
      {/*
        grid-cols-1 is load-bearing on mobile. Without an explicit track the
        single implicit column sizes to content, and the columns' max-w-[620px]
        drags it to 620px inside a ~335px container — the whole page scrolls
        sideways on a phone. minmax(0,1fr) pins the track to the container.
      */}
      <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)] items-start gap-9 md:grid-cols-[minmax(0,1fr)_4px_minmax(0,1fr)] md:gap-12">
        {/* Column 1 — Meet the Narrator */}
        <div className="w-full min-w-0 max-w-[620px] md:justify-self-end">
          <div className="panel p-6 md:p-7">
            <h2 id="about-heading" className="section-title mb-4 text-[1.7rem]">
              Meet the Narrator
            </h2>
            <p className="body-copy mb-4 text-[1.17rem]">
              I&rsquo;m Stephanie, an Audiobook narrator with a passion for
              bringing characters and worlds to life. From my early theater days
              to rediscovering voice acting while raising my twin boys in
              Georgia, storytelling has always been at my core. Whether it&rsquo;s
              heartfelt romance, thrilling suspense, or imaginative fantasy, I
              aim to make every word resonate with listeners.
            </p>
            <p className="body-copy text-[1.17rem]">
              For spicier explicit content projects and horror, I&rsquo;m
              available to work as <strong>{SITE.penName}</strong>
            </p>
          </div>

          <div className="mt-6 flex flex-col items-center">
            <Link
              href="/contact"
              className="email-chip mt-2 inline-flex w-full flex-wrap items-center justify-center gap-3 rounded-[var(--radius-chip)] px-[22px] py-[14px] text-center sm:w-auto"
            >
              <span className="text-[0.82rem] font-bold uppercase tracking-[2.5px] text-gold [text-shadow:0_2px_10px_rgba(0,0,0,0.8)]">
                Contact Me
              </span>
              <SocialIcon
                name="mail"
                className="h-[15px] w-[15px] text-gold [filter:drop-shadow(0_0_6px_rgba(196,139,54,0.35))]"
              />
              <span className="text-base font-medium tracking-[0.3px] text-white/95 [text-shadow:0_2px_8px_rgba(0,0,0,0.85)]">
                Send an Inquiry
              </span>
            </Link>
          </div>
        </div>

        {/* Divider — decorative, and only where there are two columns to divide */}
        <div
          aria-hidden="true"
          className="hidden h-full w-[4px] bg-white/85 shadow-[0_0_12px_rgba(255,255,255,0.5)] md:block"
        />

        {/* Column 2 — Meet the Booth + partners */}
        <div className="flex w-full min-w-0 max-w-[620px] flex-col gap-[22px] md:justify-self-start">
          <div className="panel p-6 md:p-7">
            <h2 className="section-title mb-4 text-[1.7rem]">Meet the Booth</h2>
            <dl className="body-copy text-[1.12rem]">
              {BOOTH.map((row) => (
                <div key={row.label} className="mb-3.5 last:mb-0">
                  <dt className="inline font-bold">{row.label}:</dt>{" "}
                  <dd className="inline">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <PartnerMarquee />
        </div>
      </div>
    </section>
  );
}
