"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { signOutAction } from "@/app/(auth)/login/actions";
import type { DashboardNavItem } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { AppRole } from "@/types/roles";

type DashboardMobileNavProps = {
  role: AppRole;
  navItems: DashboardNavItem[];
};

export function DashboardMobileNav({
  role,
  navItems,
}: DashboardMobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden shrink-0">
          <Menu className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(100%,20rem)] p-0">
        <SheetHeader className="border-b border-border px-6 py-4 text-left">
          <SheetTitle className="font-semibold">
            Formula 4 <span className="text-primary">Fitness</span>
          </SheetTitle>
          <p className="text-xs font-medium capitalize text-muted-foreground">
            {role} workspace
          </p>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-5.5rem)]">
          <nav className="flex flex-col gap-1 p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              Home
            </Link>
            <form
              action={signOutAction}
              className="mt-1"
              onClick={() => setOpen(false)}
            >
              <Button
                type="submit"
                variant="outline"
                className="w-full justify-start"
              >
                Sign out
              </Button>
            </form>
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
