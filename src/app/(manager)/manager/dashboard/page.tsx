import Link from "next/link";

import { fetchManagerReportsData } from "@/app/(manager)/manager/reports/_lib/queries";
import { FlashBanner } from "@/components/dashboard/flash-banner";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getManagerServerContext } from "@/lib/auth/manager-server";
import { ROUTES } from "@/lib/navigation/dashboard-nav";

type PageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function weekBounds() {
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7;
  const from = new Date(now);
  from.setDate(from.getDate() - mondayOffset);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 6);
  return { from: toYmd(from), to: toYmd(to) };
}

export default async function ManagerDashboardPage({ searchParams }: PageProps) {
  const ctx = await getManagerServerContext();
  const sp = await searchParams;
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const error = typeof sp.error === "string" ? sp.error : null;

  if (!ctx) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Sign in as a manager with Supabase configured to load operations metrics.
        </CardContent>
      </Card>
    );
  }

  const { from, to } = weekBounds();
  const data = await fetchManagerReportsData({
    supabase: ctx.supabase,
    managerId: ctx.managerId,
    filters: { from, to, locationId: null, trainerId: null },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations overview"
        description="Live weekly snapshot across members, schedule, programs, and execution."
      />

      {ok ? <FlashBanner kind="ok" message={ok} /> : null}
      {error ? <FlashBanner kind="error" message={error} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active members"
          value={String(data.summary.activeMembers)}
          hint="Current active membership periods"
        />
        <StatCard
          label="Appointments this week"
          value={String(data.summary.totalAppointments)}
          hint="Scheduled + completed + no-show"
        />
        <StatCard
          label="No-shows this week"
          value={String(data.summary.noShows)}
          hint="Attendance exceptions to review"
        />
        <StatCard
          label="Overdue payments"
          value={String(data.summary.overduePayments)}
          hint="Members currently flagged overdue"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Manager path</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Start from reports, then inspect member operations.
            </p>
            <Button asChild className="w-full">
              <Link href={ROUTES.manager.reports}>Open reports</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={ROUTES.manager.members}>Open members</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trainer handoff</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Review schedule readiness, then hand off to trainer today flow.
            </p>
            <Button asChild className="w-full">
              <Link href={ROUTES.manager.schedule}>Open schedule</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={ROUTES.manager.programs}>Open programs</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client experience check</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Use seeded demo clients to verify plan, booking, and workout UX.
            </p>
            <Button asChild className="w-full" variant="outline">
              <Link href={ROUTES.manager.members}>Select a demo member</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
