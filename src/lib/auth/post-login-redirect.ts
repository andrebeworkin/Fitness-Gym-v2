import { requiredRoleForPath } from "@/lib/auth/rbac";
import { ROUTES } from "@/lib/navigation/dashboard-nav";
import type { AppRole } from "@/types/roles";

export function defaultDashboardPath(role: AppRole): string {
  switch (role) {
    case "manager":
      return ROUTES.manager.dashboard;
    case "trainer":
      return ROUTES.trainer.dashboard;
    case "client":
      return ROUTES.client.dashboard;
    default:
      return ROUTES.home;
  }
}

/**
 * Uses `next` only if it is a same-origin path and matches the signed-in role.
 * Prevents open redirects and cross-role deep links.
 */
export function safeNextPath(next: unknown, role: AppRole): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) {
    return defaultDashboardPath(role);
  }
  const required = requiredRoleForPath(next);
  if (required && required !== role) {
    return defaultDashboardPath(role);
  }
  return next;
}
