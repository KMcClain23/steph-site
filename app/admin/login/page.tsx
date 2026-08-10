import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Only ever redirect to a path on this site. Taking the raw value would let
  // a crafted ?next=https://evil.example bounce someone off the login screen
  // to somewhere else entirely, wearing our domain in the referring link.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin";

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="section-title mb-2 text-2xl">Sign in</h1>
      <p className="mb-8 text-sm text-white/60">Depth &amp; Dawn Audio admin.</p>
      <LoginForm next={safeNext} />
    </div>
  );
}
