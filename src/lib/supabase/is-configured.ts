import { publicEnv } from "@/lib/env";

/** True when public Supabase URL and anon key are set (required for real auth). */
export function isSupabaseConfigured(): boolean {
  return (
    publicEnv.supabaseUrl.length > 0 && publicEnv.supabaseAnonKey.length > 0
  );
}
