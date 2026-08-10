import type { MetadataRoute } from "next";
import { IS_CANONICAL_HOST, SITE } from "@/lib/content";

export default function robots(): MetadataRoute.Robots {
  // Anything that isn't the real domain — preview builds, *.vercel.app — is
  // closed to crawlers. See IS_CANONICAL_HOST for why this is opt-in.
  if (!IS_CANONICAL_HOST) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin"] }],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
