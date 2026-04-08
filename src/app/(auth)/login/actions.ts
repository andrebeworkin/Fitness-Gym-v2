"use server";

import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/navigation/dashboard-nav";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createServerSupabase } from "@/services/supabase/server";

export type SignInState = {
  error: string | null;
};

export async function signInAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  if (!isSupabaseConfigured()) {
    return {
      error:
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (see docs/ENVIRONMENT.md).",
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = formData.get("next");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // After successful sign-in, let middleware + server auth loaders resolve role
  // on the next request. This avoids false "no profile" negatives within the same action cycle.
  const nextPath = typeof next === "string" ? next : null;
  if (nextPath) {
    redirect(`${ROUTES.login}?next=${encodeURIComponent(nextPath)}`);
  }
  redirect(ROUTES.login);
}

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  }
  redirect(ROUTES.login);
}
