import type { User } from "@supabase/supabase-js";

import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createServerSupabase } from "@/services/supabase/server";
import type { ProfileRow } from "@/types/database.types";
import type { AppRole } from "@/types/roles";
import { isAppRole } from "@/types/roles";

export type LoadedAuth = {
  user: User | null;
  profile: ProfileRow | null;
  role: AppRole | null;
};

/**
 * Loads the current Supabase user and matching `profiles` row (server-only).
 * Does not throw if unauthenticated — returns nulls.
 */
export async function loadAuthContext(): Promise<LoadedAuth> {
  if (!isSupabaseConfigured()) {
    return { user: null, profile: null, role: null };
  }

  const supabase = await createServerSupabase();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { user: null, profile: null, role: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { user, profile: null, role: null };
  }

  const row = profile as ProfileRow;
  const role = isAppRole(row.role) ? row.role : null;

  return {
    user,
    profile: role ? row : null,
    role,
  };
}
