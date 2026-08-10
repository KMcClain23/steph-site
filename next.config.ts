import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Audible cover art. The books pipeline stores Amazon's own image URLs,
      // so covers are the one thing that stays remote — re-hosting them would
      // mean re-downloading 21+ covers every time the sync route runs.
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
    ],
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
