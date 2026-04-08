import Link from "next/link";

import { signOutAction } from "@/app/(auth)/login/actions";
import { DashboardMobileNav } from "@/components/layout/dashboard-mobile-nav";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { AppRole } from "@/types/roles";
import { cn } from "@/lib/utils";

export type DashboardNavItem = {
  label: string;
  href: string;
};

type DashboardShellProps = Readonly<{
  role: AppRole;
  title: string;
  navItems: DashboardNavItem[];
  /** Shown in header; omit in dev bypass mode if desired */
  userLabel?: string | null;
  children: React.ReactNode;
}>;

export function DashboardShell({
  role,
  title,
  navItems,
  userLabel,
  children,
}: DashboardShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30 md:flex-row">
      <aside className="hidden w-64 shrink-0 border-r border-border/80 bg-card md:flex md:flex-col">
        <DashboardSidebar navItems={navItems} role={role} />
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/80 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80",
            "md:h-16 md:px-6",
          )}
        >
          <div className="flex flex-1 items-center gap-3">
            <DashboardMobileNav navItems={navItems} role={role} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-muted-foreground md:hidden">
                Formula 4 Fitness
              </p>
              <h1 className="truncate text-lg font-semibold tracking-tight md:text-xl">
                {title}
              </h1>
            </div>
          </div>
          <Separator orientation="vertical" className="hidden h-6 md:block" />
          <div className="hidden flex-col items-end gap-1 text-right md:flex">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground capitalize">
                {role}
              </span>
              {userLabel ? (
                <span className="max-w-[10rem] truncate text-xs text-muted-foreground">
                  {userLabel}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                <Link href="/">Home</Link>
              </Button>
              <form action={signOutAction}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-primary"
                >
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
