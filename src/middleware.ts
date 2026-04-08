import { type NextRequest, NextResponse } from "next/server";

import { defaultDashboardPath } from "@/lib/auth/post-login-redirect";
import { requiredRoleForPath } from "@/lib/auth/rbac";
import { publicEnv } from "@/lib/env";
import { updateSupabaseSession } from "@/services/supabase/middleware";
import { isAppRole } from "@/types/roles";

/**
 * Refreshes Supabase auth cookies and enforces role-based access for workspace routes.
 * Dev-only bypass: NEXT_PUBLIC_DEV_AUTH_BYPASS=true (see docs/ENVIRONMENT.md).
 */
export async function middleware(request: NextRequest) {
  if (publicEnv.devAuthBypass) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  const { supabase, response } = await updateSupabaseSession(request);

  if (!supabase) {
    const needed = requiredRoleForPath(pathname);
    if (needed) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      url.searchParams.set("error", "config");
      return NextResponse.redirect(url);
    }
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname.startsWith("/login") || pathname.startsWith("/auth/")) {
    if (user && pathname.startsWith("/login")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role = profile?.role as string | undefined;
      if (isAppRole(role)) {
        return NextResponse.redirect(
          new URL(defaultDashboardPath(role), request.url),
        );
      }
    }
    return response;
  }

  const neededRole = requiredRoleForPath(pathname);
  if (!neededRole) {
    return response;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role as string | undefined;
  if (!isAppRole(role)) {
    return NextResponse.redirect(new URL("/auth/setup-profile", request.url));
  }

  if (role !== neededRole) {
    const url = request.nextUrl.clone();
    url.pathname = "/unauthorized";
    url.searchParams.set("required", neededRole);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
