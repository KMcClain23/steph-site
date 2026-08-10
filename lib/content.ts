/**
 * Copy and links that aren't worth a database row — they change once a year,
 * if that, and living in code keeps them in review. Anything Stephanie will
 * plausibly want to edit herself (demos, books) is in Supabase instead.
 */

export const SITE = {
  name: "Depth & Dawn Audio",
  legalName: "Depth & Dawn Audio, LLC",
  narrator: "Stephanie Betschart",
  penName: "Ann Dahlia",
  tagline: "Every story deserves a heartbeat, and I give it a voice.",
  genres: ["Thrillers", "Romance", "Mystery", "Fantasy"],
  email: "stephaniebetschart1@gmail.com",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://stephaniebetschart.com",
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
 * `plate: "light"` is for artwork that is dark ink on a solid white ground.
 * Dropped straight onto the near-black panel those read as a hard white
 * rectangle; sitting them on a deliberate white plate makes the same pixels
 * look intentional instead of broken.
 */
export type Partner = {
  name: string;
  href: string;
  logo: string;
  plate?: "light";
};

export const PARTNERS: Partner[] = [
  { name: "Blue Nose Audio", href: "https://www.bluenoseaudio.com/", logo: "/partners/blue-nose-audio.png" },
  { name: "Pink Flamingo Productions", href: "https://pinkflamingoproductions.com/", logo: "/partners/pink-flamingo.webp" },
  { name: "Royal Guard Publishing", href: "https://royalguardpublishing.com/", logo: "/partners/royal-guard.png" },
  { name: "John Marshall Media", href: "https://www.johnmarshallmedia.com/", logo: "/partners/john-marshall-media.webp" },
  { name: "Penguin Random House Audio", href: "https://penguinrandomhouseaudio.com/", logo: "/partners/penguin-random-house-audio.svg" },
  { name: "ACX", href: "https://www.acx.com/", logo: "/partners/acx.png" },
  { name: "Author's Republic", href: "https://www.authorsrepublic.com/", logo: "/partners/authors-republic.png" },
  { name: "High Gravity Productions", href: "https://www.highgravityproductions.com/theteam", logo: "/partners/high-gravity.webp" },
  { name: "Tantor", href: "https://tantor.com/", logo: "/partners/tantor.jpg" },
  { name: "Audio Sorceress", href: "https://audiosorceress.com/", logo: "/partners/audio-sorceress.png" },
  { name: "Enchantress Bookish Brilliance", href: "https://www.enchantressbookishbrilliance.com/?m=0", logo: "/partners/enchantress.jpg" },
  { name: "Spotify", href: "https://www.spotify.com/us/audiobooks/", logo: "/partners/spotify.png" },
  { name: "Macmillan Audio", href: "https://us.macmillan.com/audio/", logo: "/partners/macmillan-audio.jpg", plate: "light" },
  { name: "Podium Entertainment", href: "https://podiumentertainment.com/", logo: "/partners/podium-entertainment.svg" },
  { name: "Fright Night Audio", href: "https://www.frightnightaudio.com/", logo: "/partners/fright-night-audio.png" },
];
