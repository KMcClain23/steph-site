"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
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

const BookUpdate = z.object({
  id: z.string().uuid(),
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
