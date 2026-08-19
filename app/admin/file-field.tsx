"use client";

import { useEffect, useRef, useState } from "react";

/**
 * File picker with the three things the old one lacked: it checks the file
 * before sending it, shows you what you picked, and reports progress.
 *
 * Previously a 40MB MP3 was accepted by the browser, uploaded in full, and
 * only then rejected by the server — and a cover couldn't be seen until after
 * it was live. Both checks now happen locally before a byte leaves.
 *
 * The upload runs on selection, not on Save, so the form only ever carries the
 * resulting URL. That keeps server action bodies tiny and means a validation
 * failure elsewhere in the form doesn't discard a finished upload.
 */

type Kind = "cover" | "demo";

const LIMITS: Record<Kind, { bytes: number; label: string; accept: string; types: RegExp }> = {
  cover: {
    bytes: 8 * 1024 * 1024,
    label: "8MB",
    accept: "image/jpeg,image/png,image/webp,image/avif",
    types: /^image\/(jpeg|png|webp|avif)$/,
  },
  demo: {
    bytes: 25 * 1024 * 1024,
    label: "25MB",
    accept: "audio/mpeg,.mp3",
    types: /^audio\/(mpeg|mp3)$/,
  },
};

function humanBytes(n: number) {
  return n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)}MB`
    : `${Math.round(n / 1024)}KB`;
}

function mmss(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

export default function FileField({
  kind,
  name,
  durationName,
  title,
  currentUrl,
  onUploaded,
}: {
  kind: Kind;
  /** Hidden input that carries the resulting URL into the form. */
  name: string;
  /** For demos: hidden input carrying the parsed duration. */
  durationName?: string;
  /** Used to name the stored object. */
  title: string;
  currentUrl?: string | null;
  onUploaded?: (url: string) => void;
}) {
  const limit = LIMITS[kind];
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploaded, setUploaded] = useState<{
    url: string;
    bytes: number;
    duration?: number | null;
    localPreview?: string;
    fileName: string;
  } | null>(null);

  // Revoke the object URL when it's replaced or the field unmounts, or the
  // blob stays in memory for the life of the page.
  useEffect(() => {
    const preview = uploaded?.localPreview;
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [uploaded?.localPreview]);

  async function handle(file: File) {
    setError(null);

    // Checked here so an oversized file never leaves the machine.
    const looksRight = limit.types.test(file.type) || file.name.toLowerCase().endsWith(".mp3");
    if (kind === "cover" ? !limit.types.test(file.type) : !looksRight) {
      setError(
        kind === "cover"
          ? "Needs to be a JPEG, PNG, WebP or AVIF image."
          : "Needs to be an MP3."
      );
      return;
    }
    if (file.size > limit.bytes) {
      setError(`That file is ${humanBytes(file.size)}. The limit is ${limit.label}.`);
      return;
    }

    const localPreview = kind === "cover" ? URL.createObjectURL(file) : undefined;
    setProgress(0);

    const body = new FormData();
    body.set("file", file);
    body.set("kind", kind);
    body.set("title", title);

    // XHR rather than fetch: fetch still can't report request upload progress.
    const result = await new Promise<{ url: string; bytes: number; duration?: number } | { error: string }>(
      (resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/admin/upload");
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        });
        xhr.addEventListener("load", () => {
          try {
            const json = JSON.parse(xhr.responseText);
            resolve(xhr.status >= 200 && xhr.status < 300 ? json : { error: json.error ?? "Upload failed." });
          } catch {
            resolve({ error: "Upload failed." });
          }
        });
        xhr.addEventListener("error", () =>
          resolve({ error: "Upload failed — check your connection." })
        );
        xhr.send(body);
      }
    );

    setProgress(null);

    if ("error" in result) {
      setError(result.error);
      if (localPreview) URL.revokeObjectURL(localPreview);
      return;
    }

    setUploaded({ ...result, localPreview, fileName: file.name });
    onUploaded?.(result.url);
  }

  const busy = progress !== null;

  return (
    <div>
      <input type="hidden" name={name} value={uploaded?.url ?? ""} />
      {durationName && (
        <input type="hidden" name={durationName} value={uploaded?.duration ?? ""} />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-gold/40 bg-gold/12 px-3 py-2 text-sm font-bold text-gold transition hover:bg-gold/20 disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? "Uploading…" : uploaded ? "Choose another" : "Choose a file"}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={limit.accept}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Reset so re-picking the same file still fires a change event.
            e.target.value = "";
            if (file) void handle(file);
          }}
        />

        {!uploaded && !busy && (
          <span className="text-xs text-white/35">
            {kind === "cover" ? `Square artwork, up to ${limit.label}` : `MP3, up to ${limit.label}`}
          </span>
        )}

        {uploaded && !busy && (
          <span className="flex items-center gap-2 text-xs text-emerald-300">
            <span aria-hidden="true">✓</span>
            {uploaded.fileName} · {humanBytes(uploaded.bytes)}
            {uploaded.duration ? ` · ${mmss(uploaded.duration)}` : ""}
          </span>
        )}
      </div>

      {busy && (
        <div className="mt-2.5">
          <div
            role="progressbar"
            aria-valuenow={progress ?? 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Upload progress"
            className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
          >
            <div
              className="h-full rounded-full bg-gold transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-white/40">{progress}%</p>
        </div>
      )}

      {/* Seeing the cover before committing to it is the entire point of the
          preview — the previous field gave no clue you'd picked the wrong one
          until it was live on the site. */}
      {(uploaded?.localPreview || (currentUrl && !uploaded)) && kind === "cover" && (
        <div className="mt-3 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={uploaded?.localPreview ?? currentUrl ?? ""}
            alt=""
            className="h-16 w-16 rounded-lg border border-white/10 object-cover"
          />
          <span className="text-xs text-white/35">
            {uploaded ? "New cover — save to apply" : "Current cover"}
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-[#ffb4b4]">
          {error}
        </p>
      )}
    </div>
  );
}
