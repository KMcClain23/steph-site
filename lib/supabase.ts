import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Fail with a message that says what to do.
 *
 * Left to itself, supabase-js throws "Your project's URL and Key are required
 * to create a Supabase client!" from inside a prerender worker — which doesn't
 * name the missing variable, doesn't say where to set it, and points at a
 * dashboard URL with `_` in place of the project ref. On a Vercel build that
 * reads as a code bug rather than an unset environment variable.
 *
 * These are NEXT_PUBLIC_*, so they're needed at BUILD time, not just at
 * runtime: the homepage is prerendered, and prerendering runs these queries.
 */
function requireSupabaseEnv() {
  const missing = [
    !URL && "NEXT_PUBLIC_SUPABASE_URL",
    !ANON && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ].filter(Boolean);

  if (missing.length) {
    throw new Error(
      `Missing ${missing.join(" and ")}. ` +
        `Set ${missing.length > 1 ? "them" : "it"} in .env.local for local dev, ` +
        `and in Vercel under Settings → Environment Variables with ALL THREE ` +
        `environments ticked (Production, Preview, Development) — these are ` +
        `read at build time, so a Preview build fails if they're only set for ` +
        `Production. Values are in .env.example.`
    );
  }
}

/**
 * Anon client with no cookie access — for public, session-independent reads.
 *
 * Touching cookies() opts a route into dynamic rendering, which silently
 * defeats `export const revalidate`. Every public page here is cacheable and
 * there is no logged-in user, so nothing should be reading cookies at all.
 */
export function createAnonSupabaseClient() {
  requireSupabaseEnv();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        /* no session to persist */
      },
    },
  });
}

/**
 * Cookie-aware server client. Unused until there's an /admin with a session —
 * kept so adding one doesn't mean rediscovering the wiring.
 */
export async function createServerSupabaseClient() {
  requireSupabaseEnv();
  const cookieStore = await cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options?: CookieOptions }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server component context — setAll is a no-op there.
        }
      },
    },
  });
}

/**
 * Service-role client. Bypasses RLS, so it must never be imported into
 * anything that ships to the browser — route handlers only.
 */
export function createServiceRoleClient() {
  requireSupabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Supabase dashboard → Project " +
        "Settings → API keys → service_role. Server-side only — never expose " +
        "it to the browser or prefix it with NEXT_PUBLIC_."
    );
  }
  return createClient(URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
