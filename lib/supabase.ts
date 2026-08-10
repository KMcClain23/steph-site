import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Anon client with no cookie access — for public, session-independent reads.
 *
 * Touching cookies() opts a route into dynamic rendering, which silently
 * defeats `export const revalidate`. Every public page here is cacheable and
 * there is no logged-in user, so nothing should be reading cookies at all.
 */
export function createAnonSupabaseClient() {
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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }
  return createClient(URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
