/**
 * Hosts next/image is allowed to fetch remote images from.
 *
 * Shared between next.config.ts and the admin's cover validation so the two
 * can't drift. When they drift, the symptom is a silently broken image: the
 * URL is perfectly valid, the optimizer just returns 400 and the card renders
 * alt text. That's what happened the first time a Siren Audio cover was
 * pasted in.
 *
 * Deliberately an allowlist rather than a wildcard. `hostname: "**"` would fix
 * every case at once and turn the image optimizer into an open proxy — anyone
 * could pass any URL and spend our bandwidth resizing it.
 */
export const REMOTE_IMAGE_HOSTS = [
  // Audible cover art, from the books pipeline.
  "m.media-amazon.com",
  "images-na.ssl-images-amazon.com",
  // Siren Audio, a second storefront for some titles.
  "cdn.siren.audio",
  // Covers uploaded through the admin.
  "flddisogifvawenbyvln.supabase.co",
] as const;

/** True if next/image will actually be able to render this URL. */
export function isAllowedImageUrl(url: string): boolean {
  // Relative paths are served from /public and never touch the optimiser's
  // remote allowlist.
  if (url.startsWith("/")) return true;
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== "https:") return false;
    return REMOTE_IMAGE_HOSTS.includes(hostname as (typeof REMOTE_IMAGE_HOSTS)[number]);
  } catch {
    return false;
  }
}
