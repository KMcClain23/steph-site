/**
 * Allowlist of addresses permitted into /admin.
 *
 * Being authenticated is not the same as being an administrator. Supabase
 * projects allow sign-ups by default, so without this anyone who could create
 * an account would land in the admin with a service-role client behind every
 * form. The allowlist means access is granted deliberately, in an environment
 * variable, rather than implied by the existence of a user row.
 *
 * ADMIN_EMAILS is a comma-separated list.
 */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = adminEmails();
  // An empty allowlist denies everyone. Failing closed matters more here than
  // convenience: a missing env var must not silently open the admin up.
  if (allowed.length === 0) return false;
  return allowed.includes(email.toLowerCase());
}
