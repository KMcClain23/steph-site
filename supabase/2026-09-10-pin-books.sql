-- 2026-09-10 — pin titles to the front of the narrated-works shelf.
--
-- Run in the Supabase SQL editor. Safe to re-run.
--
-- Context: the shelf now orders by release date (newest first) instead of
-- sort_order. `pinned` is the override — a pinned title is held at the front
-- whatever its release date, ordered among the other pins by sort_order, which
-- is what dragging in /admin/books writes.

alter table public.books add column if not exists pinned boolean not null default false;

create index if not exists books_published_pinned_idx
  on public.books (published, pinned, sort_order);
