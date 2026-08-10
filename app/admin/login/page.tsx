import { adminEmails, isAdminEmail } from "@/lib/admin-emails";
import { createServerSupabaseClient } from "@/lib/supabase";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Only ever redirect to a path on this site. Taking the raw value would let
  // a crafted ?next=https://evil.example bounce someone off the login screen
  // to somewhere else entirely, wearing our domain in the referring link.
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin";

  /**
   * Signed in, but not on the allowlist.
   *
   * Without this the failure is silent and looks like a wrong password:
   * Supabase authenticates fine, the browser navigates to /admin, the proxy
   * sees a non-allowlisted address and bounces straight back here. The user
   * types their correct password repeatedly and nothing ever happens. Say
   * plainly what's wrong instead.
   */
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedInButNotAllowed = !!user && !isAdminEmail(user.email);
  const allowlistEmpty = adminEmails().length === 0;

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="section-title mb-2 text-2xl">Sign in</h1>
      <p className="mb-8 text-sm text-white/60">Depth &amp; Dawn Audio admin.</p>

      {signedInButNotAllowed && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-[#ffb4b4]/30 bg-[#ffb4b4]/10 p-4 text-sm leading-relaxed text-[#ffd0d0]"
        >
          <p>
            You&rsquo;re signed in as <strong>{user!.email}</strong>, but that
            address isn&rsquo;t allowed into the admin.
          </p>
          <p className="mt-2 text-[#ffd0d0]/80">
            {allowlistEmpty
              ? "No addresses are configured yet — ADMIN_EMAILS needs setting."
              : "Add it to ADMIN_EMAILS, or sign in with an address that's already on the list."}
          </p>
        </div>
      )}

      <LoginForm next={safeNext} />
    </div>
  );
}
