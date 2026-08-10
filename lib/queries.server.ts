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
