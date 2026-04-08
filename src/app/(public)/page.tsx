import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/lib/navigation/dashboard-nav";

export default function HomePage() {
  return (
    <main>
      <section className="border-b border-border/80 bg-gradient-to-b from-accent/40 to-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 md:flex-row md:items-end md:justify-between md:px-6 md:py-24">
          <div className="max-w-xl space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Formula 4 Fitness
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl lg:text-5xl">
              One platform for gym operations, coaching execution, and client outcomes.
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">
              Built for owner demos and real-world handoff: manager operations,
              trainer workflows, and client self-service in one secure system.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg">
                <Link href={ROUTES.login}>Sign in</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={ROUTES.manager.dashboard}>Open manager workspace</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              After sign-in, you are sent to the dashboard for your role
              (manager, trainer, or client). Suggested demo script:{" "}
              <span className="font-medium">docs/DEMO_WALKTHROUGH.md</span>.
            </p>
          </div>
          <Card className="w-full max-w-md border-border/80 shadow-md md:mb-2">
            <CardHeader>
              <CardTitle className="text-lg">Operational model</CardTitle>
              <CardDescription>
                Membership, scheduling, programming, and execution stay separate
                so reports and billing context remain trustworthy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Manager</span>:
                member lifecycle, schedule ops, programming, reports.
              </p>
              <p>
                <span className="font-medium text-foreground">Trainer</span>:
                day view, live session runner, set logging, change requests.
              </p>
              <p>
                <span className="font-medium text-foreground">Client</span>:
                plan visibility, self-log, booking, progress history.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Role value
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Manager visibility",
              body: "Live reporting for utilization, attendance, overdue risk, and entitlement balances with auditable history.",
            },
            {
              title: "Trainer speed",
              body: "Tablet-friendly today workflow for session start, set logging, substitutions, incidents, and follow-up notes.",
            },
            {
              title: "Client clarity",
              body: "Simple plan, booking, and progress experience that keeps internal staff data private by design.",
            },
          ].map((item) => (
            <Card key={item.title} className="border-border/80">
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border/80 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">1. Manager setup</CardTitle>
                <CardDescription>Open reports and members</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">2. Trainer execution</CardTitle>
                <CardDescription>Run live session from appointment</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">3. Client outcome</CardTitle>
                <CardDescription>Show plan, booking, and progress loop</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
