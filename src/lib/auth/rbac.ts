import type { AppRole } from "@/types/roles";

/**
 * Prefix → allowed role. Used by middleware and `safeNextPath`.
 * Aligns with `docs/PERMISSIONS_MATRIX.md` and RLS in Supabase.
 */
export const PROTECTED_ROUTE_ROLES: { prefix: string; role: AppRole }[] = [
  { prefix: "/manager", role: "manager" },
  { prefix: "/trainer", role: "trainer" },
  { prefix: "/client", role: "client" },
];

export function requiredRoleForPath(pathname: string): AppRole | null {
  const hit = PROTECTED_ROUTE_ROLES.find((r) => pathname.startsWith(r.prefix));
  return hit?.role ?? null;
}
