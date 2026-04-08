import type { DashboardAuthContext } from "@/lib/auth/dashboard-guard";

export function workspaceUserLabel(ctx: DashboardAuthContext): string | null {
  if (ctx.devBypass) {
    return "Dev bypass";
  }
  return (
    ctx.profile.display_name ||
    ctx.user.email ||
    null
  );
}
