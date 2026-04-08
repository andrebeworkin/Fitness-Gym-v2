import Link from "next/link";

import { Button } from "@/components/ui/button";

export function PublicSiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:h-16 md:px-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight md:text-base"
        >
          Formula 4 <span className="text-primary">Fitness</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Product</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
