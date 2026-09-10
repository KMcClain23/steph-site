/**
 * Copy and links that aren't worth a database row — they change once a year,
 * if that, and living in code keeps them in review. Anything Stephanie will
 * plausibly want to edit herself (demos, books) is in Supabase instead.
 */

/** The registrable domain that is allowed to be indexed. */
export const PRODUCTION_HOST = "stephaniebetschart.com";

const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

/** www and the apex are the same site — only one of them is ever canonical. */
const bareHost = (host: string) => host.replace(/^www\./i, "").toLowerCase();

/**
 * Whether this deployment is the real site.
 *
 * An unset NEXT_PUBLIC_SITE_URL counts as "no" on purpose. Metadata still
 * falls back to the production domain — a canonical is better than none — but
 * being indexed has to be opted into explicitly. Otherwise a *.vercel.app
 * build gets crawled while canonicalising to a domain that is still serving
 * somebody else's markup, which is how a preview quietly competes with the
 * site it's meant to replace.
 *
 * The www prefix is stripped before comparing. Vercel defaults to making www
 * the primary domain and 308-ing the apex to it, so an exact match here would
 * have left the real site noindex'd — the precise silent failure this gate
 * exists to prevent.
 */
export const IS_CANONICAL_HOST =
  !!configuredUrl && URL.canParse(configuredUrl)
    ? bareHost(new URL(configuredUrl).host) === PRODUCTION_HOST
    : false;

export const SITE = {
  name: "Depth & Dawn Audio",
  legalName: "Depth & Dawn Audio, LLC",
  narrator: "Stephanie Betschart",
  penName: "Ann Dahlia",
  tagline: "Every story deserves a heartbeat, and I give it a voice.",
  genres: ["Thrillers", "Romance", "Mystery", "Fantasy"],
  email: "stephaniebetschart1@gmail.com",
  url: configuredUrl || `https://${PRODUCTION_HOST}`,
};

export const NAV = [
  { label: "Narrated Works", href: "/#narrated" },
  { label: "About", href: "/#about" },
  { label: "Demos", href: "/#demos" },
  { label: "Contact Me", href: "/contact" },
];

export const SOCIALS = [
  {
    label: "TikTok",
    href: "https://tiktok.com/@stephanie.betschart",
    icon: "tiktok" as const,
  },
  {
    label: "Instagram",
    href: "https://instagram.com/stephanie.betschart.narrator",
    icon: "instagram" as const,
  },
  {
    label: "Facebook",
    href: "https://facebook.com/stephanie.betschart.narrator",
    icon: "facebook" as const,
  },
  {
    label: "Discord",
    href: "https://discordapp.com/invite/WzEnvy5R",
    icon: "discord" as const,
  },
  {
    label: "Threads",
    href: "https://threads.net/@stephanie.betschart.narrator",
    icon: "threads" as const,
  },
];

export const BOOTH = [
  { label: "Interface", value: "Scarlett Solo" },
  { label: "Microphone", value: "Rode NT1" },
  { label: "DAW", value: "Reaper (RX11 Standard)" },
  { label: "Space", value: "Treated Home Studio meeting ACX Specs" },
];

/**
 * Logos are served from /public/partners rather than hotlinked from each
 * partner's own site, which is how the old site did it — two of them
 * (Blue Nose and Tantor) already refuse hotlinked requests.
 *
 * The current set is all transparent artwork, so every chip gets the glow
 * treatment (.partner-logo in globals.css) and none of them carry a plate.
 * Pink Flamingo's file shipped as an opaque grey rectangle — it read as a
 * literal grey block sitting on the panel — so the grey was keyed out to
 * match the rest. Only the grey *outside* the flamingo's ring: the ring
 * encloses the same flat colour, and clearing that too would have hollowed
 * out the mark rather than freed it from its background.
 *
 * `plate: "light"` remains available per-partner, for artwork that is dark
 * ink on a solid white ground. Dropped straight onto the near-black panel
 * those read as a hard white rectangle; sitting them on a deliberate white
 * plate makes the same pixels look intentional instead of broken. It is also
 * the escape hatch for any logo whose type is too dark to separate from the
 * panel — set it on that one entry and the glow gives way to the plate.
 */
export type Partner = {
  name: string;
  href: string;
  logo: string;
  plate?: "light";
};

export const PARTNERS: Partner[] = [
  { name: "Peitho Press Audio Productions", href: "https://www.peithopress.com/", logo: "/partners/peitho-press.webp" },
  { name: "Pink Flamingo Productions", href: "https://pinkflamingoproductions.com/", logo: "/partners/pink-flamingo.webp" },
  { name: "John Marshall Media", href: "https://www.johnmarshallmedia.com/", logo: "/partners/john-marshall-media.webp" },
  { name: "Tantor Audio", href: "https://tantor.com/", logo: "/partners/tantor-audio.webp" },
  { name: "Spotify", href: "https://www.spotify.com/us/audiobooks/", logo: "/partners/spotify.webp" },
  { name: "Royal Guard Publishing", href: "https://royalguardpublishing.com/", logo: "/partners/royal-guard.webp" },
  { name: "Penguin Random House Audio", href: "https://penguinrandomhouseaudio.com/", logo: "/partners/penguin-random-house-audio.webp" },
  { name: "OSYS Studios", href: "https://www.osysstudios.com/", logo: "/partners/osys-studios.webp" },
  { name: "Macmillan Audio", href: "https://us.macmillan.com/audio/", logo: "/partners/macmillan-audio.webp" },
  { name: "Podium Entertainment", href: "https://podiumentertainment.com/", logo: "/partners/podium-entertainment.webp" },
  { name: "Audiobook Empire International", href: "https://audiobookempire.com/ae-international/", logo: "/partners/audiobook-empire.webp" },
  { name: "High Gravity Productions", href: "https://www.highgravityproductions.com/theteam", logo: "/partners/high-gravity.webp" },
  { name: "Fright Audio", href: "https://www.frightnightaudio.com/", logo: "/partners/fright-audio.webp" },
  { name: "Blue Nose Audio", href: "https://www.bluenoseaudio.com/", logo: "/partners/blue-nose-audio.webp" },
  { name: "Audio Sorceress", href: "https://audiosorceress.com/", logo: "/partners/audio-sorceress.webp" },
  { name: "Author's Republic", href: "https://www.authorsrepublic.com/", logo: "/partners/authors-republic.webp" },
  { name: "ACX", href: "https://www.acx.com/", logo: "/partners/acx.webp" },
];
