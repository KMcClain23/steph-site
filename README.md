# Depth & Dawn Audio — stephaniebetschart.com

Rebuild of Stephanie Betschart's narrator site (also credited as **Ann Dahlia**),
moving off Fourthwall. Next.js 16 App Router · React 19 · Tailwind 4 · Supabase ·
Resend, deployed to Vercel.

## Why the rebuild

The old site was three "Custom HTML" blocks pasted into a Fourthwall store theme:

- Partner logos were hotlinked from other companies' servers. Two of them
  (Blue Nose, Tantor) already refuse hotlinked requests.
- Demo MP3s came from Dropbox `?raw=1` links.
- "Narrated Works" was a fixed-height 500px `<iframe>` — not responsive, not indexed.
- A shopping cart with no products, because Fourthwall is a store.
- Nothing was editable without hand-editing HTML.

Everything is now self-hosted, database-driven, and responsive. The look is a
near-copy on purpose — including her custom full-page background.

## Running it

```bash
npm run dev
```

Then http://localhost:3007. In this workspace the dev server is registered in
`~/.claude/launch.json` as `steph-site`.

## Environment

Copy `.env.example` to `.env.local`. Supabase URL and anon key are already filled
in; the rest have to be supplied:

| Variable | Where it comes from |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → API keys → `service_role`. Server-only. |
| `RESEND_API_KEY` | Resend dashboard. Needs a verified sending domain. |
| `RESEND_FROM_EMAIL` | Must be on the verified domain. |
| `CONTACT_INBOX_EMAIL` | Where inquiries land. |
| `BOOKS_SYNC_TOKEN` | Any long random string; shared with the Audible pipeline. |

Without the service-role and Resend keys the site renders fine — only the contact
form fails, and it fails loudly with a "email her directly" message rather than
pretending to have sent.

## Content

| What | Lives in | Edited via |
|---|---|---|
| Demos | `demos` table | Supabase dashboard (`published` toggles visibility) |
| Narrated works | `books` table | The sync route, or by hand |
| Inquiries | `inquiries` table | Read-only record of the contact form |
| Bio, booth specs, partners, socials | `lib/content.ts` | Code |

There is **no `/admin` UI yet**. The schema is shaped like `reinita-site`'s so one
can be added without a migration.

15 demos are seeded; the 9 that were live on the old site are published and the
other 6 are one `published` flip away.

## The books pipeline

`books.json` from the Audible scraper still drives the list. Instead of embedding
its GitHub Pages app, `POST /api/books/sync` pulls the feed and upserts into
`books`:

```bash
curl -X POST https://stephaniebetschart.com/api/books/sync \
  -H "Authorization: Bearer $BOOKS_SYNC_TOKEN"
```

Rows flagged `manual` in Supabase are skipped, so hand-corrections survive a sync.

## Scripts

```bash
node scripts/generate-icons.mjs                                   # favicons + og.jpg from the brand assets
node --env-file=.env.local scripts/backfill-demo-durations.mjs    # after adding demos
node scripts/books-to-sql.mjs                                     # one-off books seed
```

**Run the duration backfill whenever you add a demo.** The player uses
`preload="none"`, so the browser knows nothing about a track until it's played
— the card reads its length from `demos.duration_seconds` instead. Skip the
backfill and the new card shows elapsed time with no total.

## Things worth knowing before you edit

- **`app/globals.css` — write `backdrop-filter` unprefixed only.** Lightning CSS
  adds the `-webkit-` prefix itself; hand-writing both makes it collapse the pair
  down to the prefixed form alone, silently killing the glass blur in Chrome and
  Firefox.
- **`.site-bg` is a fixed-position layer, not `background-attachment: fixed`.**
  iOS Safari doesn't honour the latter — it rescales on scroll and can drop the
  image entirely. Her background is the identity of the site; don't "simplify"
  this back.
- **`lib/supabase.ts` must never reach a client component.** It imports
  `next/headers`. Types and pure helpers live in `lib/books.ts` / `lib/demos.ts`;
  queries live in `lib/queries.server.ts`.
- **`createAnonSupabaseClient()` deliberately doesn't touch cookies.** Touching
  `cookies()` opts the page into dynamic rendering and silently defeats
  `export const revalidate`.
- **The About grid needs an explicit `grid-cols-[minmax(0,1fr)]` on mobile.**
  Without it the implicit track sizes to the columns' `max-w-[620px]` and the
  whole page scrolls sideways on a phone.

## Deploying

Vercel project + the env vars above. **DNS is a deliberate separate step** —
`stephaniebetschart.com` still points at Fourthwall and should stay there until
the preview is signed off.
