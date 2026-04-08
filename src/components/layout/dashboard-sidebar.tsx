import Link from "next/link";

import { signOutAction } from "@/app/(auth)/login/actions";
import type { DashboardNavItem } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/types/roles";

type DashboardSidebarProps = {
  role: AppRole;
  navItems: DashboardNavItem[];
};

const roleLabels: Record<AppRole, string> = {
  manager: "Manager",
  trainer: "Trainer",
  client: "Client",
};

export function DashboardSidebar({ role, navItems }: DashboardSidebarProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-border/80 px-6">
        <Link href="/" className="font-semibold tracking-tight text-foreground">
          Formula 4{" "}
          <span className="text-primary">Fitness</span>
        </Link>
      </div>
      <div className="px-4 py-4">
        <p className="px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {roleLabels[role]} workspace
        </p>
        <nav className="mt-4 flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-auto space-y-2 border-t border-border/80 p-4">
        <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
          <Link href="/">Home</Link>
        </Button>
        <form action={signOutAction} className="block w-full">
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="w-full justify-start"
          >
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
