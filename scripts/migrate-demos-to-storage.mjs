/**
 * Moves any demo still served from public/demos into Supabase Storage.
 *
 *   node --env-file=.env.local scripts/migrate-demos-to-storage.mjs
 *   node --env-file=.env.local scripts/migrate-demos-to-storage.mjs --commit
 *
 * The first 15 demos were committed to the repo before uploads existed, so
 * audio lived in two places: some rows pointed at /demos/*.mp3, the rest at
 * storage. That split meant every consumer had to branch — the download link
 * especially, since the `download` attribute is ignored cross-origin but works
 * same-origin. One location removes the branch.
 *
 * Dry run by default; pass --commit to actually write.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const commit = process.argv.includes("--commit");

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: demos, error } = await db
  .from("demos")
  .select("id, title, title_secondary, audio_url")
  .order("sort_order");

if (error) {
  console.error("Could not read demos:", error.message);
  process.exit(1);
}

const local = demos.filter((d) => d.audio_url.startsWith("/"));
console.log(`${local.length} demo(s) still in the repo.${commit ? "" : "  (dry run — pass --commit to write)"}\n`);

let moved = 0;
for (const demo of local) {
  const file = path.join("public", demo.audio_url.replace(/^\//, ""));
  const name = [demo.title, demo.title_secondary].filter(Boolean).join(" — ");

  let bytes;
  try {
    bytes = await readFile(file);
  } catch {
    console.error(`  ! missing on disk: ${file} (${name})`);
    continue;
  }

  // Keep the existing filename — it's already a readable slug, and reusing it
  // makes the migration idempotent if this is re-run after a partial failure.
  const key = path.basename(file);

  if (!commit) {
    console.log(`  would upload ${key.padEnd(42)} ${Math.round(bytes.length / 1024)}KB  ${name}`);
    continue;
  }

  const { error: upErr } = await db.storage
    .from("demos")
    .upload(key, bytes, { contentType: "audio/mpeg", upsert: true });

  if (upErr) {
    console.error(`  x upload failed for ${key}: ${upErr.message}`);
    continue;
  }

  const { data: pub } = db.storage.from("demos").getPublicUrl(key);
  const { error: dbErr } = await db
    .from("demos")
    .update({ audio_url: pub.publicUrl })
    .eq("id", demo.id);

  if (dbErr) {
    console.error(`  x database update failed for ${name}: ${dbErr.message}`);
    continue;
  }

  console.log(`  ✓ ${key.padEnd(42)} ${Math.round(bytes.length / 1024)}KB  ${name}`);
  moved++;
}

if (commit) console.log(`\nMoved ${moved} of ${local.length}.`);
