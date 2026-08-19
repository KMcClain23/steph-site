# Depth & Dawn Audio — stephaniebetschart.com

Stephanie Betschart's narrator site (she is also credited as **Ann Dahlia**),
rebuilt off Fourthwall. Next.js 16 App Router · React 19 · Tailwind 4 ·
Supabase · Resend, on Vercel. **Live.**

## Why the rebuild

The old site was three "Custom HTML" blocks pasted into a Fourthwall store theme:

- Partner logos were hotlinked from other companies' servers. Two of them
  (Blue Nose, Tantor) already refuse hotlinked requests.
- Demo MP3s came from Dropbox `?raw=1` links.
- "Narrated Works" was a fixed-height 500px `<iframe>` — not responsive, not indexed.
- A shopping cart with no products, because Fourthwall is a store.
- Nothing was editable without hand-editing HTML.

Everything is now self-hosted, database-driven and responsive. The public look
is a near-copy on purpose, including her custom full-page background.

## Running it

```bash
npm run dev
```

Then http://localhost:3007. In this workspace the dev server is registered in
`~/.claude/launch.json` as `steph-site`.

## Environment

Copy `.env.example` to `.env.local`.

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public. Needed at **build** time — the homepage is prerendered. |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → Project Settings → API keys. Server-only, bypasses RLS. |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` / `CONTACT_INBOX_EMAIL` | Contact form delivery. |
| `ADMIN_EMAILS` | Comma-separated allowlist for `/admin`. **Empty denies everyone.** |
| `BOOKS_SYNC_TOKEN` | Shared with the Audible pipeline. |
| `CRON_SECRET` | What Vercel Cron sends. Production only; crons don't run on previews. |
| `NEXT_PUBLIC_SITE_URL` | **Gates search indexing** — see below. |
| `GOOGLE_SITE_VERIFICATION` | Optional; Search Console is verified by file instead. |

Two of these fail in ways that aren't obvious:

- **`NEXT_PUBLIC_SITE_URL` controls whether the site is indexable.** Anything
  other than the production host makes `robots.txt` return `Disallow: /`. That's
  deliberate — a preview shouldn't be crawled — but it means forgetting it on
  production keeps the real site out of Google.
- **Without the service-role and Resend keys** the site renders fine and only
  the contact form fails, loudly, with an "email her directly" message rather
  than pretending to have sent.

## Content

| What | Lives in | Edited via |
|---|---|---|
| Demos (audio + metadata) | `demos` table, audio in Supabase Storage | `/admin/demos` |
| Narrated works | `books` table, covers in Storage or on Amazon/Siren | `/admin/books`, plus the sync |
| Inquiries | `inquiries` table | `/admin/inquiries` |
| Bio, booth specs, partners, socials | `lib/content.ts` | Code |

## Admin

`/admin` — triple-click the wordmark on the public site to reach it, or go
there directly. Email + password via Supabase Auth.

Inquiries inbox, full book editing, and demo add/edit/delete with MP3 upload.
Both lists have search, filters, and drag-to-reorder.

**Access requires two things**: a Supabase Auth user, *and* that address in
`ADMIN_EMAILS`. Authenticated is not authorised — Supabase allows sign-ups by
default, so without the allowlist anyone who created an account would land in
an admin whose every form is backed by a service-role client. An empty
allowlist denies everyone; it fails closed on purpose.

To grant access: Supabase → Authentication → Users → Add user, then add the
address to `ADMIN_EMAILS` in Vercel. Also turn **off** public sign-ups under
Authentication → Providers → Email.

`proxy.ts` gates the routes but is not the security boundary — every server
action calls `requireAdminInAction()` itself, because a check performed in
exactly one place is one you eventually forget.

## The books pipeline

The Audible scraper publishes `books.json`; `/api/books/sync` pulls it and
upserts into `books`. **A Vercel cron runs it daily at 13:00 UTC** — the
pipeline can also POST to it directly at the end of a scrape.

```bash
curl -X POST https://stephaniebetschart.com/api/books/sync \
  -H "Authorization: Bearer $BOOKS_SYNC_TOKEN"
```

Rows flagged `manual` are skipped, so hand-corrections survive a sync. That
matters for titles the scraper structurally cannot find: it searches Audible's
narrator field, and some titles credit her only in the description. Add those
by hand in the admin — they're marked `manual` automatically.

## Scripts

```bash
node scripts/generate-icons.mjs                                   # favicons, emblem, og.jpg
node scripts/books-to-sql.mjs                                     # one-off books seed
node --env-file=.env.local scripts/migrate-demos-to-storage.mjs   # moves any /public demo into Storage
node --env-file=.env.local scripts/backfill-demo-durations.mjs    # only for hand-inserted rows
```

## Things worth knowing before you edit

- **All demo audio is in Supabase Storage, none in the repo.** Uploading via
  the admin parses the duration at the same time, which keeps
  `demos.duration_seconds` populated without anyone remembering a script — and
  that column is the only reason cards can show a length while the player uses
  `preload="none"`.
- **Remote image hosts are an allowlist** in `lib/image-hosts.ts`, shared with
  `next.config.ts`. A cover from an unlisted host doesn't error anywhere; the
  optimizer just returns 400 and the card renders alt text. The admin rejects
  such URLs at entry for that reason. Kept an allowlist rather than `"**"`,
  which would make the optimizer an open proxy.
- **`app/globals.css` — write `backdrop-filter` unprefixed only.** Lightning CSS
  adds `-webkit-` itself; hand-writing both makes it collapse the pair down to
  the prefixed form alone, silently killing the glass blur in Chrome and Firefox.
- **`.site-bg` is a fixed-position layer, not `background-attachment: fixed`.**
  iOS Safari doesn't honour the latter — it rescales on scroll and can drop the
  image. Her background is the identity of the site; don't "simplify" this back.
- **`lib/supabase.ts` must never reach a client component.** It imports
  `next/headers`. Types and pure helpers live in `lib/books.ts` / `lib/demos.ts`;
  queries live in `lib/queries.server.ts`.
- **`createAnonSupabaseClient()` deliberately doesn't touch cookies.** Touching
  `cookies()` opts the page into dynamic rendering and silently defeats
  `export const revalidate`.
- **`<summary>` must be the first child of `<details>`.** Wrapping it in a
  styling div makes browsers ignore it and render their own "Details" marker.
  Use the `AddPanel` / `Row` components rather than hand-rolling one.
- **Book slugs are stored, not derived.** They're indexed public URLs, so the
  sync reuses an existing slug and only derives one for genuinely new titles.

## Deploying

Push to `main`; Vercel builds automatically. `stephaniebetschart.com` points at
Vercel, DNS is managed at **WordPress.com** (not Fourthwall — that was only ever
the old A-record target).
