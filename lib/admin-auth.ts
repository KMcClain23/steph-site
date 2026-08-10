import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin-emails";
import { createServerSupabaseClient } from "@/lib/supabase";

/**
 * The security boundary for every admin read and write.
 *
 * Middleware already redirects signed-out visitors away from /admin, but that
 * only covers navigations it intercepts. Server actions must verify
 * independently — otherwise an action is a public write endpoint that merely
 * happens to be hard to find.
 *
 * Uses getUser(), not getSession(): getSession decodes the cookie the client
 * sent without checking it, so it can be forged. getUser revalidates against
 * Supabase.
 */
export async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Authenticated is not the same as authorised — the address must also be on
  // the ADMIN_EMAILS allowlist.
  if (error || !user || !isAdminEmail(user.email)) {
    redirect("/admin/login");
  }

  return user;
}

/** Non-redirecting variant, for rendering "signed in as" without a hard gate. */
export async function getAdminUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user && isAdminEmail(user.email) ? user : null;
}
