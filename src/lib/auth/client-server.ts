import { loadAuthContext } from "@/lib/auth/current-user";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createServerSupabase } from "@/services/supabase/server";

export type ClientServerContext = {
  clientId: string;
  supabase: Awaited<ReturnType<typeof createServerSupabase>>;
};

/**
 * Returns null if caller is not a client or Supabase is not configured.
 * Use at the start of client-only server actions and data loaders.
 */
export async function getClientServerContext(): Promise<ClientServerContext | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const ctx = await loadAuthContext();
  if (!ctx.user || ctx.role !== "client") {
    return null;
  }
  const supabase = await createServerSupabase();
  return { clientId: ctx.user.id, supabase };
}
