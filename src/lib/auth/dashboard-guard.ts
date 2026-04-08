import { redirect } from "next/navigation";

import { loadAuthContext, type LoadedAuth } from "@/lib/auth/current-user";
import { publicEnv } from "@/lib/env";
import { ROUTES } from "@/lib/navigation/dashboard-nav";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { AppRole } from "@/types/roles";

export type DashboardAuthContext =
  | {
      devBypass: true;
      role: AppRole;
      user: null;
      profile: null;
    }
  | {
      devBypass?: false;
      user: NonNullable<LoadedAuth["user"]>;
      profile: NonNullable<LoadedAuth["profile"]>;
      role: AppRole;
    };

/**
 * Server layouts: require Supabase session + `profiles.role` matching this workspace.
 * When `NEXT_PUBLIC_DEV_AUTH_BYPASS=true`, skips Supabase (UI-only; see docs/ENVIRONMENT.md).
 */
export async function requireDashboardRole(
  expected: AppRole,
  loginNextPath: string,
): Promise<DashboardAuthContext> {
  if (publicEnv.devAuthBypass) {
    return { devBypass: true, role: expected, user: null, profile: null };
  }

  if (!isSupabaseConfigured()) {
    redirect(
      `${ROUTES.login}?error=config&next=${encodeURIComponent(loginNextPath)}`,
    );
  }

  const ctx = await loadAuthContext();

  if (!ctx.user) {
    redirect(`/login?next=${encodeURIComponent(loginNextPath)}`);
  }

  if (!ctx.profile || !ctx.role) {
    redirect("/auth/setup-profile");
  }

  if (ctx.role !== expected) {
    redirect(
      `/unauthorized?required=${encodeURIComponent(expected)}&from=${encodeURIComponent(loginNextPath)}`,
    );
  }

  return {
    user: ctx.user,
    profile: ctx.profile,
    role: ctx.role,
  };
}
