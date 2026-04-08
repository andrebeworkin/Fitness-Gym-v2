import Link from "next/link";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/(auth)/login/actions";
import { loadAuthContext } from "@/lib/auth/current-user";
import { defaultDashboardPath } from "@/lib/auth/post-login-redirect";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/lib/navigation/dashboard-nav";
import { publicEnv } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { isAppRole } from "@/types/roles";

export default async function SetupProfilePage() {
  if (publicEnv.devAuthBypass) {
    redirect(ROUTES.home);
  }

  if (!isSupabaseConfigured()) {
    redirect(`${ROUTES.login}?error=config`);
  }

  const ctx = await loadAuthContext();

  if (!ctx.user) {
    redirect(ROUTES.login);
  }

  if (ctx.role && isAppRole(ctx.role)) {
    redirect(defaultDashboardPath(ctx.role));
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-lg border-border/80 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Finish account setup</CardTitle>
          <CardDescription>
            You are signed in, but we could not load a complete profile with a
            valid role from the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Common causes:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              The <code className="rounded bg-muted px-1">profiles</code> row is
              missing (trigger not run or user created outside Auth).
            </li>
            <li>
              <code className="rounded bg-muted px-1">profiles.role</code> is not
              one of <strong>manager</strong>, <strong>trainer</strong>, or{" "}
              <strong>client</strong>.
            </li>
          </ul>
          <p>
            Ask an administrator to verify your account profile and role mapping.
            For local demo environments, use{" "}
            <strong>docs/DEMO_AUTH_SETUP.md</strong>.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button asChild variant="ghost">
            <Link href={ROUTES.home}>Home</Link>
          </Button>
          <form action={signOutAction}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
