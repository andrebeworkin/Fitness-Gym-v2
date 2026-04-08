import { loadAuthContext } from "@/lib/auth/current-user";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createServerSupabase } from "@/services/supabase/server";

export type TrainerServerContext = {
  trainerId: string;
  supabase: Awaited<ReturnType<typeof createServerSupabase>>;
};

/**
 * Returns null if caller is not a trainer or Supabase is not configured.
 * Use at the start of trainer-only server actions and data loaders.
 */
export async function getTrainerServerContext(): Promise<TrainerServerContext | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const ctx = await loadAuthContext();
  if (!ctx.user || ctx.role !== "trainer") {
    return null;
  }
  const supabase = await createServerSupabase();
  return { trainerId: ctx.user.id, supabase };
}
