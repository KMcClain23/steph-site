import "server-only";
import { slugify } from "@/lib/books";
import { createServiceRoleClient } from "@/lib/supabase";

/**
 * Uploads for the admin, straight into Supabase Storage.
 *
 * Both buckets are public-read, so the returned URL can go into the database
 * and be served directly. Writes only ever happen here, behind requireAdmin()
 * and the service-role key.
 */

export const COVERS_BUCKET = "covers";
export const DEMOS_BUCKET = "demos";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const AUDIO_TYPES = ["audio/mpeg", "audio/mp3"];

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export type UploadResult =
  | { ok: true; url: string; bytes: number }
  | { ok: false; error: string };

/** A stable, collision-proof object name derived from the title. */
function objectName(title: string, file: File, fallback: string) {
  const ext = (file.name.split(".").pop() ?? fallback).toLowerCase();
  const base = slugify(title) || "upload";
  // Date suffix so replacing an image doesn't get served from a CDN cache
  // under its old key.
  return `${base}-${Date.now()}.${ext}`;
}

async function upload(
  bucket: string,
  file: File,
  name: string
): Promise<UploadResult> {
  const supabase = createServiceRoleClient();
  const bytes = await file.arrayBuffer();

  const { error } = await supabase.storage.from(bucket).upload(name, bytes, {
    contentType: file.type,
    upsert: false,
  });

  if (error) return { ok: false, error: error.message };

  const { data } = supabase.storage.from(bucket).getPublicUrl(name);
  return { ok: true, url: data.publicUrl, bytes: file.size };
}

export async function uploadCover(file: File, title: string): Promise<UploadResult> {
  if (!IMAGE_TYPES.includes(file.type)) {
    return { ok: false, error: "Cover must be a JPEG, PNG, WebP or AVIF image." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Cover must be under 8MB." };
  }
  return upload(COVERS_BUCKET, file, objectName(title, file, "jpg"));
}

export async function uploadDemoAudio(
  file: File,
  title: string
): Promise<UploadResult> {
  // Browsers are inconsistent about which of these they report for an .mp3,
  // so check the extension too rather than rejecting a valid file on a
  // technicality.
  const looksLikeMp3 = file.name.toLowerCase().endsWith(".mp3");
  if (!AUDIO_TYPES.includes(file.type) && !looksLikeMp3) {
    return { ok: false, error: "Demo must be an MP3." };
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return { ok: false, error: "Demo must be under 25MB." };
  }
  return upload(DEMOS_BUCKET, file, objectName(title, file, "mp3"));
}

/**
 * Reads the real duration out of an uploaded MP3.
 *
 * The public player sets preload="none", so the browser never learns a
 * track's length on its own — the card reads it from the database instead.
 * Parsing on upload is what keeps that column populated without anyone
 * remembering to run the backfill script.
 */
export async function readAudioDuration(file: File): Promise<number | null> {
  try {
    const { parseBuffer } = await import("music-metadata");
    const buf = Buffer.from(await file.arrayBuffer());
    const { format } = await parseBuffer(buf, { mimeType: "audio/mpeg" });
    return format.duration ? Math.round(format.duration) : null;
  } catch (err) {
    // A missing duration degrades to "elapsed time only" on the card, which
    // is survivable — failing the whole upload over it would not be.
    console.error("Could not read audio duration:", err);
    return null;
  }
}
