-- ─────────────────────────────────────────────────────────────
-- Depth & Dawn Audio — Stephanie Betschart / Ann Dahlia
-- Initial schema. Applied to Supabase project `depth-and-dawn-audio`.
--
-- There is no /admin UI yet; the site reads these tables and everything is
-- edited through the Supabase dashboard for now. The shape is deliberately
-- close to reinita-site's so an admin can be dropped in without a migration.
-- ─────────────────────────────────────────────────────────────

-- DEMOS
-- The old site rendered demo titles as two lines split by a <br> ("Narrative
-- Voice" / "Russian Accent"), so the break is content, not styling — keeping
-- it as its own column means an editor can't accidentally lose it.
create table if not exists public.demos (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  title_secondary   text,
  subtitle          text,                      -- "1st Person POV", "Dialect Work"
  audio_url         text not null,             -- /demos/*.mp3, served from public/
  duration_seconds  integer,
  sort_order        integer not null default 0,
  published         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists demos_published_idx on public.demos (published, sort_order);

-- BOOKS (Narrated Works)
-- Fed by the existing Audible pipeline via /api/books/sync. `manual` marks a
-- row a human curated, which the sync route must not clobber.
create table if not exists public.books (
  id               uuid primary key default gen_random_uuid(),
  -- Public URL segment for /narrated/[slug]. Stored rather than derived at
  -- render time: these get indexed and linked to, so a later title fix must
  -- not silently move a live page. /api/books/sync reuses the existing slug
  -- on update and only derives one for genuinely new titles.
  slug             text not null,
  title            text not null,
  author           text not null,
  description      text,                      -- optional synopsis, shown on the title page
  cover_url        text not null,
  audible_url      text,
  release_date     text,                       -- pipeline emits MM-DD-YY strings
  narrator_credit  text,                       -- "Ann Dahlia" | "Stephanie Betschart"
  co_narrators     jsonb not null default '[]'::jsonb,
  rating_text      text,
  reviews          integer,
  credit_note      text,
  manual           boolean not null default false,
  sort_order       integer not null default 0,
  published        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index if not exists books_title_author_idx on public.books (title, author);
create unique index if not exists books_slug_idx on public.books (slug);
create index if not exists books_published_idx on public.books (published, sort_order);

-- INQUIRIES (contact form)
create table if not exists public.inquiries (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  message     text not null,
  source      text not null default 'contact_form',
  status      text not null default 'new',     -- new | read | replied | archived
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists inquiries_status_idx on public.inquiries (status, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- RLS. On everywhere; the service-role client bypasses it for writes.
-- ─────────────────────────────────────────────────────────────

alter table public.demos      enable row level security;
alter table public.books      enable row level security;
alter table public.inquiries  enable row level security;

drop policy if exists "Anyone can read published demos" on public.demos;
create policy "Anyone can read published demos"
  on public.demos for select
  using (published = true);

drop policy if exists "Anyone can read published books" on public.books;
create policy "Anyone can read published books"
  on public.books for select
  using (published = true);

-- inquiries: no policies at all, so RLS on = nothing but the service role
-- can read or write it. Contact submissions must never be publicly readable.

-- ─────────────────────────────────────────────────────────────
-- updated_at maintenance
-- ─────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists demos_set_updated_at on public.demos;
create trigger demos_set_updated_at
  before update on public.demos
  for each row execute function public.set_updated_at();

drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at
  before update on public.books
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Added after launch
-- ─────────────────────────────────────────────────────────────

-- Some titles are released through Siren Audio as well as Audible.
alter table public.books add column if not exists siren_url text;

-- Storage buckets for admin uploads. Both public-read: covers and demo audio
-- are served straight to visitors. Writes only happen server-side through the
-- service-role key, behind requireAdmin().
--
--   covers  8MB   image/jpeg, image/png, image/webp, image/avif
--   demos  25MB   audio/mpeg
--
-- Created with supabase.storage.createBucket() rather than SQL; see
-- scripts/ or recreate them in the dashboard with those limits.
