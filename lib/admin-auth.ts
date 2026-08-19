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

/** Thrown by requireAdminInAction so a save can report rather than redirect. */
export const SESSION_EXPIRED =
  "Your session expired, so nothing was saved. Your changes are still on screen — sign in again in another tab, then press Save.";

/**
 * Authorisation check for server actions.
 *
 * requireAdmin() redirects, which is right for a page load and wrong here: a
 * redirect mid-save throws away whatever was typed into the form. Returning a
 * result lets the action answer with a message while the browser keeps the
 * unsaved text exactly where it is.
 */
export async function requireAdminInAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !isAdminEmail(user.email)) {
    return { ok: false, error: SESSION_EXPIRED };
  }
  return { ok: true };
}

/** Non-redirecting variant, for rendering "signed in as" without a hard gate. */
export async function getAdminUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user && isAdminEmail(user.email) ? user : null;
}
