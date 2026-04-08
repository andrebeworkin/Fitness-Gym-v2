"use client";

import { createBrowserClient as createSbBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";

/**
 * Client Components — use for client-side auth helpers only when needed.
 * Prefer server actions + `createServerSupabase` for sign-in / sign-out.
 */
export function createBrowserClient() {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    throw new Error(
      "Supabase env vars are missing. See docs/ENVIRONMENT.md.",
    );
  }
  return createSbBrowserClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
  );
}
