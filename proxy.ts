import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/admin-emails";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Refreshes the Supabase session cookie and gates /admin.
 *
 * Runs before the App Router, so it can't use cookies() from next/headers —
 * it builds its own client against the request/response cookie jars instead.
 *
 * This is a convenience gate, not the security boundary. Every server action
 * independently calls requireAdmin(), because an auth check you only perform
 * in one place is one you eventually forget to perform.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Has to be reachable without a session, or you could never obtain one.
  const isLogin = pathname === "/admin/login";

  // Rebuilt by setAll below whenever Supabase rotates an expiring token, so
  // refreshed cookies ride back to the browser on this same response.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() revalidates the token with Supabase. getSession() only decodes
  // whatever cookie arrived, which a client can forge — never gate on it.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allowed = !!user && isAdminEmail(user.email);

  if (!allowed && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    // Send them back where they were headed once signed in.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (allowed && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
