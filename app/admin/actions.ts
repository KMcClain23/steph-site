"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { slugify } from "@/lib/books";
import { requireAdmin } from "@/lib/admin-auth";
import { REMOTE_IMAGE_HOSTS, isAllowedImageUrl } from "@/lib/image-hosts";
import { readAudioDuration, uploadCover, uploadDemoAudio } from "@/lib/storage";
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
  siren_url: z.string().max(1000).optional().default(""),
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
    siren_url: formData.get("siren_url") ?? "",
    release_date: formData.get("release_date") ?? "",
    published: formData.get("published") === "on",
    manual: formData.get("manual") === "on",
  });
  if (!parsed.success) return { ok: false, error: "Invalid values." };

  const d = parsed.data;
  const supabase = createServiceRoleClient();

  // An uploaded file wins over the URL field, so choosing an image and
  // forgetting to clear the old URL does the obvious thing rather than
  // silently ignoring the upload.
  let coverUrl = d.cover_url.trim();
  const coverFile = fileOrNull(formData.get("cover_file"));
  if (coverFile) {
    const up = await uploadCover(coverFile, d.id);
    if (!up.ok) return { ok: false, error: up.error };
    coverUrl = up.url;
  }
  if (!coverUrl) return { ok: false, error: "A cover image is required." };
  // A cover from an unlisted host renders as broken alt text with no error
  // anywhere — next/image simply returns 400. Say so at the point of entry.
  if (!isAllowedImageUrl(coverUrl)) {
    return {
      ok: false,
      error:
        `That cover URL is hosted somewhere the site cannot load images from. Upload the image instead, or use a URL on: ${REMOTE_IMAGE_HOSTS.join(", ")}.`,
    };
  }


  const { data: row, error } = await supabase
    .from("books")
    .update({
      description: d.description.trim() || null,
      narrator_credit: d.narrator_credit.trim() || null,
      cover_url: coverUrl,
      audible_url: d.audible_url.trim() || null,
      siren_url: d.siren_url.trim() || null,
      release_date: d.release_date ? toPipelineDate(d.release_date) : null,
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

const DemoFields = z.object({
  title: z.string().min(1).max(200),
  title_secondary: z.string().max(200).optional().default(""),
  subtitle: z.string().max(200).optional().default(""),
  published: z.coerce.boolean(),
});

const DemoUpdate = DemoFields.extend({ id: z.string().uuid() });

/**
 * Where a newly added row goes: the end of the list.
 *
 * Order is set by dragging, so nothing asks for a number any more — but the
 * column is still NOT NULL and a new row has to land somewhere sensible.
 */
async function nextSortOrder(table: "demos" | "books"): Promise<number> {
  const { data } = await createServiceRoleClient()
    .from(table)
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  return ((data?.[0]?.sort_order as number | undefined) ?? -10) + 10;
}

/** An <input type="file"> that was left empty still arrives as a 0-byte File. */
function fileOrNull(value: FormDataEntryValue | null): File | null {
  return value instanceof File && value.size > 0 ? value : null;
}

export async function updateDemo(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = DemoUpdate.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    title_secondary: formData.get("title_secondary") ?? "",
    subtitle: formData.get("subtitle") ?? "",
    published: formData.get("published") === "on",
  });
  if (!parsed.success) return { ok: false, error: "A demo needs a title." };
  const d = parsed.data;

  const patch: Record<string, unknown> = {
    title: d.title.trim(),
    title_secondary: d.title_secondary.trim() || null,
    subtitle: d.subtitle.trim() || null,
    published: d.published,
  };

  // Replacing the audio is optional — leave the field empty and the existing
  // recording stays untouched.
  const audio = fileOrNull(formData.get("audio"));
  if (audio) {
    const up = await uploadDemoAudio(audio, d.title);
    if (!up.ok) return { ok: false, error: up.error };
    patch.audio_url = up.url;
    patch.duration_seconds = await readAudioDuration(audio);
  }

  const { error } = await createServiceRoleClient()
    .from("demos")
    .update(patch)
    .eq("id", d.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/demos");
  return { ok: true };
}

export async function createDemo(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = DemoFields.safeParse({
    title: formData.get("title"),
    title_secondary: formData.get("title_secondary") ?? "",
    subtitle: formData.get("subtitle") ?? "",
    published: formData.get("published") === "on",
  });
  if (!parsed.success) return { ok: false, error: "A demo needs a title." };
  const d = parsed.data;

  const audio = fileOrNull(formData.get("audio"));
  if (!audio) return { ok: false, error: "Choose an MP3 to upload." };

  const up = await uploadDemoAudio(audio, d.title);
  if (!up.ok) return { ok: false, error: up.error };

  const { error } = await createServiceRoleClient().from("demos").insert({
    title: d.title.trim(),
    title_secondary: d.title_secondary.trim() || null,
    subtitle: d.subtitle.trim() || null,
    audio_url: up.url,
    // Parsed here so the card can show a real length without the browser
    // downloading the file to find out.
    duration_seconds: await readAudioDuration(audio),
    sort_order: await nextSortOrder("demos"),
    published: d.published,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/demos");
  return { ok: true };
}

export async function deleteDemo(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: "Invalid id." };

  // The audio file is deliberately left in the bucket. Storage is cheap and a
  // deleted row is far more likely to be a mistake than a stored MP3 is to be
  // a problem.
  const { error } = await createServiceRoleClient()
    .from("demos")
    .delete()
    .eq("id", id.data);

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
  // Not required at the schema level any more: a cover can arrive either as a
  // URL or as an upload, and "one of these two" isn't expressible here.
  // Checked below once the file is in hand.
  cover_url: z.string().max(1000).optional().default(""),
  audible_url: z.string().max(1000).optional().default(""),
  siren_url: z.string().max(1000).optional().default(""),
  release_date: z.string().max(20).optional().default(""),
  narrator_credit: z.string().max(200).optional().default(""),
  description: z.string().max(4000).optional().default(""),
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
    siren_url: formData.get("siren_url") ?? "",
    release_date: formData.get("release_date") ?? "",
    narrator_credit: formData.get("narrator_credit") ?? "",
    description: formData.get("description") ?? "",
    published: formData.get("published") === "on",
  });
  if (!parsed.success) {
    return { ok: false, error: "Title and author are both required." };
  }
  const d = parsed.data;
  const supabase = createServiceRoleClient();

  // Cover: an upload wins over a pasted URL. cover_url is NOT NULL in the
  // database, so one of the two has to be present.
  let coverUrl = d.cover_url.trim();
  const coverFile = fileOrNull(formData.get("cover_file"));
  if (coverFile) {
    const up = await uploadCover(coverFile, d.title);
    if (!up.ok) return { ok: false, error: up.error };
    coverUrl = up.url;
  }
  if (!coverUrl) {
    return { ok: false, error: "Add a cover — either upload an image or paste a URL." };
  }
  // A cover from an unlisted host renders as broken alt text with no error
  // anywhere — next/image simply returns 400. Say so at the point of entry.
  if (!isAllowedImageUrl(coverUrl)) {
    return {
      ok: false,
      error:
        `That cover URL is hosted somewhere the site cannot load images from. Upload the image instead, or use a URL on: ${REMOTE_IMAGE_HOSTS.join(", ")}.`,
    };
  }


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
    cover_url: coverUrl,
    audible_url: d.audible_url.trim() || null,
    siren_url: d.siren_url.trim() || null,
    release_date: d.release_date ? toPipelineDate(d.release_date) : null,
    narrator_credit: d.narrator_credit.trim() || null,
    description: d.description.trim() || null,
    co_narrators: [],
    sort_order: await nextSortOrder("books"),
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

/**
 * Persist a drag-to-reorder.
 *
 * Positions are rewritten as index * 10 rather than 0,1,2 — the gaps leave
 * room to slot something in by hand later without renumbering the whole list,
 * and they match what /api/books/sync already writes.
 */
async function reorder(
  table: "demos" | "books",
  ids: string[]
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = z.array(z.string().uuid()).min(1).max(500).safeParse(ids);
  if (!parsed.success) return { ok: false, error: "Invalid order." };

  const supabase = createServiceRoleClient();

  // One update per row. A bulk upsert would need every NOT NULL column in the
  // payload, and getting that wrong would blank real data to reorder a list.
  const results = await Promise.all(
    parsed.data.map((id, index) =>
      supabase.from(table).update({ sort_order: index * 10 }).eq("id", id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: failed.error.message };

  revalidatePath("/");
  revalidatePath(`/admin/${table}`);
  return { ok: true };
}

export async function reorderDemos(ids: string[]): Promise<ActionResult> {
  return reorder("demos", ids);
}

export async function reorderBooks(ids: string[]): Promise<ActionResult> {
  return reorder("books", ids);
}
