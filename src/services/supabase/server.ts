import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

/**
 * Server Component / Server Action / Route Handler client.
 * Uses the caller's cookie jar so sessions persist across SSR and mutations.
 */
export async function createServerSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see docs/ENVIRONMENT.md).",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* set from Server Component — ignore if read-only context */
          }
        },
      },
    },
  );
}
