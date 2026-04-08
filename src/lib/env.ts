/**
 * Typed access to public environment variables.
 * Server-only secrets belong in server modules and must never use NEXT_PUBLIC_*.
 */
export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    "",
  /**
   * When true, skips Supabase session + role checks in middleware and layouts
   * use a synthetic role (see docs/ENVIRONMENT.md). Not for production.
   */
  devAuthBypass: process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true",
} as const;

