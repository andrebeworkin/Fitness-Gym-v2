import { loadAuthContext } from "@/lib/auth/current-user";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createServerSupabase } from "@/services/supabase/server";

export type ManagerServerContext = {
  managerId: string;
  supabase: Awaited<ReturnType<typeof createServerSupabase>>;
};

/**
 * Returns null if caller is not a manager or Supabase is not configured.
 * Use at the start of manager-only server actions and data loaders.
 */
export async function getManagerServerContext(): Promise<ManagerServerContext | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const ctx = await loadAuthContext();
  if (!ctx.user || ctx.role !== "manager") {
    return null;
  }
  const supabase = await createServerSupabase();
  return { managerId: ctx.user.id, supabase };
}
