import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Audible cover art. The books pipeline stores Amazon's own image URLs,
      // so covers are the one thing that stays remote — re-hosting them would
      // mean re-downloading 21+ covers every time the sync route runs.
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
      // Covers uploaded through the admin land in Supabase Storage.
      { protocol: "https", hostname: "flddisogifvawenbyvln.supabase.co" },
    ],
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
