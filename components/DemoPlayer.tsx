"use client";

import { useEffect, useRef, useState } from "react";
import { downloadFilename, downloadUrl, type Demo } from "@/lib/demos";

const BARS = [10, 18, 26, 14, 22, 12, 28, 16, 24, 10];

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function DemoPlayer({
  demo,
  isActive,
  onPlay,
  onEnded,
}: {
  demo: Demo;
  isActive: boolean;
  onPlay: () => void;
  onEnded: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(demo.duration_seconds ?? 0);

  // Only one demo plays at a time. The grid owns which one that is; each
  // player just stops itself the moment it stops being the active one.
  useEffect(() => {
    if (!isActive && playing) {
      audioRef.current?.pause();
    }
  }, [isActive, playing]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      onPlay();
      void audio.play();
    } else {
      audio.pause();
    }
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = value;
    setCurrent(value);
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;
  const label = [demo.title, demo.title_secondary].filter(Boolean).join(" — ");

  // duration_seconds comes from the database (see
  // scripts/backfill-demo-durations.mjs), so the real length renders on the
  // server before any audio is touched. If a demo hasn't been backfilled the
  // browser fills it in on first play — until then, show elapsed time alone
  // rather than a meaningless "0:00 / 0:00".
  const knownDuration = duration > 0;

  return (
    <article
      className={`audio-card flex flex-col gap-2.5 rounded-[var(--radius-chip)] border border-white/10 bg-white/[0.06] p-2.5 shadow-[0_0_18px_rgba(0,0,0,0.25)] transition ${
        playing ? "is-playing" : ""
      }`}
    >
      {/*
        Three lines carrying three different kinds of fact, so each gets its
        own treatment rather than the title and its qualifier sharing one.

          title            what the piece is        white, heaviest
          title_secondary  the accent or register   gold, lighter, wider tracking
          subtitle         POV or category          muted, sentence case

        The case change on the third line matters as much as the colour — two
        lines of caps followed by a third would still read as one block.
      */}
      <div className="px-1 pt-1">
        <h3 className="font-display text-[0.95rem] font-semibold uppercase leading-snug tracking-[0.5px] text-white">
          {demo.title}
          {demo.title_secondary && (
            <span className="mt-1 block text-[0.78rem] font-medium tracking-[1.4px] text-gold/90">
              {demo.title_secondary}
            </span>
          )}
        </h3>
        {demo.subtitle && (
          <p className="mt-2 whitespace-pre-line text-[0.78rem] leading-snug text-white/50">
            {demo.subtitle}
          </p>
        )}
      </div>

      <div className="waveform flex h-8 items-center justify-center gap-1" aria-hidden="true">
        {BARS.map((h, i) => (
          <span
            key={i}
            style={{ height: `${h}px`, animationDelay: `${i * 0.1}s` }}
            className="block w-1 rounded-full bg-gold"
          />
        ))}
      </div>

      <div className="flex items-center gap-2.5 px-1 pb-1">
        <button
          type="button"
          onClick={toggle}
          aria-label={`${playing ? "Pause" : "Play"} demo: ${label}`}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold/50 bg-gold/15 text-gold transition hover:bg-gold/25 hover:text-gold-bright"
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
              <rect x="0" y="0" width="4" height="14" rx="1" />
              <rect x="8" y="0" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
              <path d="M1 1.2v11.6a1 1 0 0 0 1.53.85l9.2-5.8a1 1 0 0 0 0-1.7l-9.2-5.8A1 1 0 0 0 1 1.2Z" />
            </svg>
          )}
        </button>

        <input
          type="range"
          min={0}
          max={knownDuration ? duration : 1}
          step={0.1}
          value={current}
          disabled={!knownDuration}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label={`Seek within ${label}`}
          className="demo-scrubber h-1.5 min-w-0 flex-1 disabled:cursor-default disabled:opacity-50"
          style={{ ["--progress" as string]: `${progress}%` }}
        />

        <span className="shrink-0 font-mono text-[0.7rem] tabular-nums text-white/60">
          {knownDuration
            ? `${formatTime(current)} / ${formatTime(duration)}`
            : formatTime(current)}
        </span>

        {/*
          Producers and casting directors keep demos on file rather than
          streaming them from a site, so this needs to save a real file with a
          real name. Both come from Supabase's ?download= parameter — the HTML
          download attribute alone is ignored cross-origin and would simply
          open the MP3 in a tab.
        */}
        <a
          href={downloadUrl(demo)}
          download={downloadFilename(demo)}
          aria-label={`Download ${label}`}
          title="Download"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/40 transition-colors hover:bg-white/5 hover:text-gold"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-4 w-4"
          >
            <path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5M4 18.5V19a2 2 0 002 2h12a2 2 0 002-2v-.5" />
          </svg>
        </a>
      </div>

      {/*
        preload="none" is the point of the custom player: the old grid mounted
        nine native <audio> elements that each fetched metadata on load. These
        stay at zero bytes until someone actually presses play.
      */}
      <audio
        ref={audioRef}
        preload="none"
        src={demo.audio_url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
          onEnded();
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
    </article>
  );
}
