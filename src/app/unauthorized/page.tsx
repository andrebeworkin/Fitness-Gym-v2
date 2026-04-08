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
import { publicEnv } from "@/lib/env";
import { ROUTES } from "@/lib/navigation/dashboard-nav";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { AppRole } from "@/types/roles";
import { isAppRole } from "@/types/roles";

type UnauthorizedPageProps = Readonly<{
  searchParams: Promise<{ required?: string }>;
}>;

export default async function UnauthorizedPage({
  searchParams,
}: UnauthorizedPageProps) {
  if (publicEnv.devAuthBypass) {
    redirect(ROUTES.home);
  }

  if (!isSupabaseConfigured()) {
    redirect(`${ROUTES.login}?error=config`);
  }

  const sp = await searchParams;
  const requiredRaw = sp.required;
  const required: AppRole | null =
    typeof requiredRaw === "string" && isAppRole(requiredRaw)
      ? requiredRaw
      : null;
  const requiredLabel = required ? `${required}s` : "another role";

  const ctx = await loadAuthContext();
  const roleLabel = ctx.role ? ` (${ctx.role})` : "";

  const yourHome =
    ctx.role && isAppRole(ctx.role)
      ? defaultDashboardPath(ctx.role)
      : ROUTES.login;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md border-border/80 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Wrong workspace</CardTitle>
          <CardDescription>
            You are signed in, but this area is for{" "}
            <span className="font-medium text-foreground">{requiredLabel}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {ctx.profile?.display_name ? (
            <p>
              Signed in as{" "}
              <span className="font-medium text-foreground">
                {ctx.profile.display_name}
              </span>
              {roleLabel}
            </p>
          ) : null}
          {!ctx.profile?.display_name && ctx.user?.email ? (
            <p>
              Signed in as{" "}
              <span className="font-medium text-foreground">
                {ctx.user.email}
              </span>
            </p>
          ) : null}
          <p className="mt-3">
            If you believe this is incorrect, ask an administrator to verify your
            assigned role for this workspace.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button asChild variant="default">
            <Link href={yourHome}>Go to my dashboard</Link>
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
