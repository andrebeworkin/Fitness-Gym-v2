import { redirect } from "next/navigation";

import { LoginForm } from "@/app/(auth)/login/login-form";
import { loadAuthContext } from "@/lib/auth/current-user";
import { safeNextPath } from "@/lib/auth/post-login-redirect";
import { publicEnv } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

type LoginPageProps = Readonly<{
  searchParams: Promise<{ next?: string; error?: string }>;
}>;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sp = await searchParams;
  const next = sp.next;
  const errorParam = sp.error;
  const configured = isSupabaseConfigured();

  if (publicEnv.devAuthBypass) {
    return (
      <div className="w-full max-w-md space-y-4">
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-50">
          <p className="font-semibold">Dev auth bypass is on</p>
          <p className="mt-1 text-xs opacity-90">
            Middleware is not enforcing Supabase sessions. Turn off{" "}
            <code className="rounded bg-muted px-1">NEXT_PUBLIC_DEV_AUTH_BYPASS</code>{" "}
            for real auth. See docs/ENVIRONMENT.md.
          </p>
        </div>
        <LoginForm
          nextPath={next}
          configError={
            configured
              ? null
              : "Supabase env vars are missing — sign-in will fail until they are set."
          }
        />
      </div>
    );
  }

  if (!configured) {
    return (
      <LoginForm
        nextPath={next}
        configError={
          errorParam === "config"
            ? "Supabase is not configured for this deployment."
            : "Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment settings, then restart the app."
        }
      />
    );
  }

  const ctx = await loadAuthContext();

  if (ctx.user && ctx.role) {
    redirect(safeNextPath(next, ctx.role));
  }

  if (ctx.user && !ctx.role) {
    redirect("/auth/setup-profile");
  }

  return <LoginForm nextPath={next} configError={null} />;
}
