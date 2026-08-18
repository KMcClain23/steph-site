"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { slugify } from "@/lib/books";
import { requireAdmin } from "@/lib/admin-auth";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase";

/**
 * Every action here calls requireAdmin() first. The service-role client
 * bypasses RLS entirely, so that check is the only thing standing between a
 * form post and the database — it is not optional and it is not covered by
 * middleware alone.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

const InquiryUpdate = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "read", "replied", "archived"]),
  notes: z.string().max(5000).optional().default(""),
});

export async function updateInquiry(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = InquiryUpdate.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { ok: false, error: "Invalid values." };

  const { error } = await createServiceRoleClient()
    .from("inquiries")
    .update({ status: parsed.data.status, notes: parsed.data.notes || null })
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/inquiries");
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteInquiry(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: "Invalid id." };

  const { error } = await createServiceRoleClient()
    .from("inquiries")
    .delete()
    .eq("id", id.data);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/inquiries");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Convert the browser date input's YYYY-MM-DD to the MM-DD-YY the Audible
 * pipeline writes. Storing the input's own format would work for a while and
 * then quietly render as "2026-04-22" on the title page, because
 * formatReleaseDate only recognises the pipeline's shape.
 */
function toPipelineDate(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const [, yyyy, mm, dd] = m;
  return `${mm}-${dd}-${yyyy.slice(2)}`;
}

const BookUpdate = z.object({
  id: z.string().uuid(),
  release_date: z.string().max(20).optional().default(""),
  description: z.string().max(4000).optional().default(""),
  narrator_credit: z.string().max(200).optional().default(""),
  cover_url: z.string().max(1000).optional().default(""),
  audible_url: z.string().max(1000).optional().default(""),
  sort_order: z.coerce.number().int().min(0).max(100000),
  published: z.coerce.boolean(),
  manual: z.coerce.boolean(),
});

export async function updateBook(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = BookUpdate.safeParse({
    id: formData.get("id"),
    description: formData.get("description") ?? "",
    narrator_credit: formData.get("narrator_credit") ?? "",
    cover_url: formData.get("cover_url") ?? "",
    audible_url: formData.get("audible_url") ?? "",
    release_date: formData.get("release_date") ?? "",
    sort_order: formData.get("sort_order") ?? 0,
    published: formData.get("published") === "on",
    manual: formData.get("manual") === "on",
  });
  if (!parsed.success) return { ok: false, error: "Invalid values." };

  const d = parsed.data;
  const supabase = createServiceRoleClient();

  const { data: row, error } = await supabase
    .from("books")
    .update({
      description: d.description.trim() || null,
      narrator_credit: d.narrator_credit.trim() || null,
      cover_url: d.cover_url.trim(),
      audible_url: d.audible_url.trim() || null,
      release_date: d.release_date ? toPipelineDate(d.release_date) : null,
      sort_order: d.sort_order,
      published: d.published,
      manual: d.manual,
    })
    .eq("id", d.id)
    .select("slug")
    .single();

  if (error) return { ok: false, error: error.message };

  // Slug is intentionally not editable here — it's a live, indexed URL.
  revalidatePath("/");
  if (row?.slug) revalidatePath(`/narrated/${row.slug}`);
  revalidatePath("/admin/books");
  return { ok: true };
}

const DemoUpdate = z.object({
  id: z.string().uuid(),
  sort_order: z.coerce.number().int().min(0).max(100000),
  published: z.coerce.boolean(),
});

export async function updateDemo(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = DemoUpdate.safeParse({
    id: formData.get("id"),
    sort_order: formData.get("sort_order") ?? 0,
    published: formData.get("published") === "on",
  });
  if (!parsed.success) return { ok: false, error: "Invalid values." };

  const { error } = await createServiceRoleClient()
    .from("demos")
    .update({ sort_order: parsed.data.sort_order, published: parsed.data.published })
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/demos");
  return { ok: true };
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  // Back to the public site, not the login form. Signing out means you're
  // done with the admin — landing on a login screen implies you're meant to
  // sign straight back in, and on a one-administrator site you almost never
  // are. Getting back in is a triple-click on the wordmark.
  redirect("/");
}

const BookCreate = z.object({
  title: z.string().min(1).max(300),
  author: z.string().min(1).max(200),
  cover_url: z.string().min(1).max(1000),
  audible_url: z.string().max(1000).optional().default(""),
  release_date: z.string().max(20).optional().default(""),
  narrator_credit: z.string().max(200).optional().default(""),
  description: z.string().max(4000).optional().default(""),
  sort_order: z.coerce.number().int().min(0).max(100000),
  published: z.coerce.boolean(),
});

/**
 * Hand-add a title the Audible pipeline can't see.
 *
 * This exists because the feed searches Audible's structured narrator field,
 * and some titles credit her only in the description — the 2026 Harem
 * Anthology being the case that proved it. Those will never appear
 * automatically.
 *
 * Always inserted with manual = true, so the next sync leaves it alone rather
 * than treating it as a row that has gone missing from the feed.
 */
export async function createBook(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = BookCreate.safeParse({
    title: formData.get("title"),
    author: formData.get("author"),
    cover_url: formData.get("cover_url"),
    audible_url: formData.get("audible_url") ?? "",
    release_date: formData.get("release_date") ?? "",
    narrator_credit: formData.get("narrator_credit") ?? "",
    description: formData.get("description") ?? "",
    sort_order: formData.get("sort_order") || 0,
    published: formData.get("published") === "on",
  });
  if (!parsed.success) {
    return { ok: false, error: "Title, author and cover URL are all required." };
  }
  const d = parsed.data;
  const supabase = createServiceRoleClient();

  // slug is unique and NOT NULL, so resolve collisions before inserting
  // rather than letting Postgres reject the row with a constraint error.
  const { data: existing, error: readErr } = await supabase.from("books").select("slug");
  if (readErr) return { ok: false, error: readErr.message };

  const taken = new Set((existing ?? []).map((r) => r.slug as string));
  const base = slugify(d.title);
  let slug = base;
  if (taken.has(slug)) slug = `${base}-${slugify(d.author)}`;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;

  const { error } = await supabase.from("books").insert({
    slug,
    title: d.title.trim(),
    author: d.author.trim(),
    cover_url: d.cover_url.trim(),
    audible_url: d.audible_url.trim() || null,
    release_date: d.release_date ? toPipelineDate(d.release_date) : null,
    narrator_credit: d.narrator_credit.trim() || null,
    description: d.description.trim() || null,
    co_narrators: [],
    sort_order: d.sort_order,
    published: d.published,
    manual: true,
  });

  if (error) {
    // 23505 is Postgres' unique violation; the only one reachable here is the
    // (title, author) index, and "duplicate key value violates..." is not a
    // useful thing to show someone adding a book.
    if (error.code === "23505") {
      return { ok: false, error: "That title and author are already in the list." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath(`/narrated/${slug}`);
  revalidatePath("/admin/books");
  return { ok: true };
}
