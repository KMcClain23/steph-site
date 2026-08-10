import type { MetadataRoute } from "next";
import { SITE } from "@/lib/content";
import { getContentLastModified } from "@/lib/queries.server";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Build time is what this used to report, which meant every redeploy
  // claimed the content had changed. Using the newest updated_at across the
  // content tables keeps lastmod honest — it moves when the page actually
  // does, not when the CSS did.
  const lastModified = await getContentLastModified();

  return [
    {
      url: SITE.url,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE.url}/contact`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.6,
    },
  ];
}
