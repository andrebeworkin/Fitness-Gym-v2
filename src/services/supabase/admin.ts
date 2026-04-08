import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";

/**
 * Service-role client — bypasses RLS. Use only in verified manager server actions
 * for Auth admin (create user). Never import from client components.
 */
export function createSupabaseAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!publicEnv.supabaseUrl || !key) {
    return null;
  }
  return createClient(publicEnv.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
