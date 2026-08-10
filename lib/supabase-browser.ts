import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client, used only for the admin sign-in form.
 *
 * Separate module from lib/supabase.ts on purpose: that one imports
 * next/headers and the service-role key, neither of which can be allowed
 * anywhere near a client component.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
