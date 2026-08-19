/**
 * Demo types only — DemoGrid and DemoPlayer are client components, so this
 * module must stay free of server imports. The query is in
 * lib/queries.server.ts.
 */

export type Demo = {
  id: string;
  title: string;
  title_secondary: string | null;
  subtitle: string | null;
  audio_url: string;
  duration_seconds: number | null;
};

/**
 * What the file should be called once it's on someone else's machine.
 *
 * Her name leads, because a casting director downloading half a dozen demos
 * ends up with them loose in a folder — "demo-1787110758996.mp3" is useless
 * there, and even "romantasy-mf.mp3" doesn't say whose it is.
 */
export function downloadFilename(demo: Demo): string {
  const name = [demo.title, demo.title_secondary].filter(Boolean).join(" - ");
  // Strip anything Windows or macOS would reject in a filename.
  const safe = `Stephanie Betschart - ${name}`.replace(/[\\/:*?"<>|]/g, "").trim();
  return `${safe}.mp3`;
}

/**
 * A URL that downloads rather than plays.
 *
 * Every demo lives in Supabase Storage, which answers ?download=<name> with
 * Content-Disposition: attachment. That's what makes this work at all — the
 * HTML `download` attribute is ignored cross-origin, so a plain link would
 * just open the MP3 in a tab.
 *
 * The same-origin case is still handled because a relative path can't take a
 * query parameter meaningfully; nothing produces one today, since uploads go
 * straight to storage.
 */
export function downloadUrl(demo: Demo): string {
  if (demo.audio_url.startsWith("/")) return demo.audio_url;
  const separator = demo.audio_url.includes("?") ? "&" : "?";
  return `${demo.audio_url}${separator}download=${encodeURIComponent(downloadFilename(demo))}`;
}
