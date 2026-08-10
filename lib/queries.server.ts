import type { Book } from "@/lib/books";
import type { Demo } from "@/lib/demos";
import { createAnonSupabaseClient } from "@/lib/supabase";

/**
 * Public reads, server-side only. RLS exposes just the published rows, so
 * the anon key is enough — nothing here needs the service role.
 *
 * A failed read returns an empty list rather than throwing. A database blip
 * should cost a section, not the whole page.
 */

export async function getPublishedDemos(): Promise<Demo[]> {
  const supabase = createAnonSupabaseClient();
  const { data, error } = await supabase
    .from("demos")
    .select("id, title, title_secondary, subtitle, audio_url, duration_seconds")
    .eq("published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to load demos:", error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Newest updated_at across the content tables, for sitemap lastmod.
 * Falls back to now() if the read fails — a slightly-too-recent lastmod is
 * harmless, a missing one loses the signal entirely.
 */
export async function getContentLastModified(): Promise<Date> {
  const supabase = createAnonSupabaseClient();
  const [demos, books] = await Promise.all([
    supabase
      .from("demos")
      .select("updated_at")
      .eq("published", true)
      .order("updated_at", { ascending: false })
      .limit(1),
    supabase
      .from("books")
      .select("updated_at")
      .eq("published", true)
      .order("updated_at", { ascending: false })
      .limit(1),
  ]);

  const stamps = [demos.data?.[0]?.updated_at, books.data?.[0]?.updated_at]
    .filter(Boolean)
    .map((s) => new Date(s as string).getTime())
    .filter((n) => Number.isFinite(n));

  return stamps.length ? new Date(Math.max(...stamps)) : new Date();
}

export async function getPublishedBooks(): Promise<Book[]> {
  const supabase = createAnonSupabaseClient();
  const { data, error } = await supabase
    .from("books")
    .select(
      "id, title, author, cover_url, audible_url, release_date, narrator_credit, co_narrators, rating_text"
    )
    .eq("published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to load books:", error.message);
    return [];
  }
  return (data ?? []) as Book[];
}
