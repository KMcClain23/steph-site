import type { NextConfig } from "next";
import { REMOTE_IMAGE_HOSTS } from "./lib/image-hosts";

const nextConfig: NextConfig = {
  images: {
    // Single source of truth, shared with the admin's cover validation — see
    // lib/image-hosts.ts. A host missing here doesn't error anywhere obvious;
    // it just makes the optimizer return 400 and the card render alt text.
    remotePatterns: REMOTE_IMAGE_HOSTS.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },

  experimental: {
    serverActions: {
      // Server actions cap request bodies at 1MB by default, which silently
      // rejects any cover upload and every demo MP3 — the longest reel is
      // 3.6MB. Raised to cover the 25MB bucket limit on demos with headroom.
      bodySizeLimit: "30mb",
    },
  },

  // Fourthwall served the contact page at /pages/contact-me, and that URL is
  // in her link-in-bio and on printed cards. Keep it alive permanently.
  async redirects() {
    return [
      { source: "/pages/contact-me", destination: "/contact", permanent: true },
      { source: "/pages/:slug", destination: "/", permanent: false },
      { source: "/cart", destination: "/", permanent: false },
      { source: "/collections/:slug*", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
