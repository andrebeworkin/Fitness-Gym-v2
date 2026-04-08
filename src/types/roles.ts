/** Application roles aligned with PRD / permissions matrix. */
export type AppRole = "manager" | "trainer" | "client";

export const APP_ROLES: readonly AppRole[] = ["manager", "trainer", "client"] as const;

export function isAppRole(value: string | undefined | null): value is AppRole {
  return value === "manager" || value === "trainer" || value === "client";
}
