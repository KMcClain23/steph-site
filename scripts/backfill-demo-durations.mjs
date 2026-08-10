/**
 * Reads the real duration out of every MP3 in public/demos and writes it to
 * the matching demos row.
 *
 *   node --env-file=.env.local scripts/backfill-demo-durations.mjs
 *
 * Why this exists: the player sets preload="none" so the page doesn't pull
 * megabytes of audio on load. The cost of that is the browser knowing nothing
 * about a track until you press play, which rendered every card as
 * "0:00 / 0:00". Storing the duration means the card can show the real length
 * immediately, server-rendered, at zero network cost.
 *
 * Re-run after adding demos.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseFile } from "music-metadata";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Run with: node --env-file=.env.local scripts/backfill-demo-durations.mjs");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: demos, error } = await supabase
  .from("demos")
  .select("id, title, title_secondary, audio_url, duration_seconds");

if (error) {
  console.error("Could not read demos:", error.message);
  process.exit(1);
}

const dir = "public/demos";
const files = new Set(await readdir(dir));

let updated = 0;
let skipped = 0;

for (const demo of demos) {
  const file = path.basename(demo.audio_url);
  if (!files.has(file)) {
    console.warn(`  ! no file for ${demo.title} (${file})`);
    skipped++;
    continue;
  }

  const { format } = await parseFile(path.join(dir, file), { duration: true });
  if (!format.duration) {
    console.warn(`  ! no duration parsed for ${file}`);
    skipped++;
    continue;
  }

  const seconds = Math.round(format.duration);
  if (demo.duration_seconds === seconds) continue;

  const { error: upErr } = await supabase
    .from("demos")
    .update({ duration_seconds: seconds })
    .eq("id", demo.id);

  if (upErr) {
    console.error(`  x ${file}: ${upErr.message}`);
    skipped++;
    continue;
  }

  const label = [demo.title, demo.title_secondary].filter(Boolean).join(" — ");
  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  console.log(`  ${mmss.padStart(5)}  ${label}`);
  updated++;
}

console.log(`\n  updated ${updated}, skipped ${skipped}, total ${demos.length}`);
