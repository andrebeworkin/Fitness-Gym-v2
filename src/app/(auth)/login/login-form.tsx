"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { signInAction, type SignInState } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/navigation/dashboard-nav";

const initialState: SignInState = { error: null };

type LoginFormProps = {
  nextPath: string | undefined;
  configError: string | null;
};

export function LoginForm({ nextPath, configError }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    signInAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error) {
      formRef.current?.querySelector<HTMLInputElement>("#password")?.focus();
    }
  }, [state.error]);

  return (
    <Card className="w-full max-w-md border-border/80 shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Sign in
        </CardTitle>
        <CardDescription>
          Use the email and password for your Formula 4 Fitness account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {configError ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {configError}
          </div>
        ) : null}
        {state.error ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {state.error}
          </div>
        ) : null}
        <form ref={formRef} action={formAction} className="space-y-4">
          {nextPath ? (
            <input type="hidden" name="next" value={nextPath} />
          ) : null}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isPending}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isPending}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 border-t border-border/80 bg-muted/20 sm:flex-row sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Demo users and walkthrough are documented in{" "}
          <span className="font-medium">docs/DEMO_DATA_SCENARIOS.md</span> and{" "}
          <span className="font-medium">docs/DEMO_WALKTHROUGH.md</span>.
        </p>
        <Button variant="ghost" size="sm" asChild>
          <Link href={ROUTES.home}>Back to home</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
