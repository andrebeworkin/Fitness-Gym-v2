import Link from "next/link";

import { FlashBanner } from "@/components/dashboard/flash-banner";
import { fetchClientDashboardData } from "@/app/(client)/client/_lib/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientServerContext } from "@/lib/auth/client-server";
import { ROUTES } from "@/lib/navigation/dashboard-nav";

type PageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function ClientDashboardPage({ searchParams }: PageProps) {
  const ctx = await getClientServerContext();
  const sp = await searchParams;
  if (!ctx) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Sign in as a client with Supabase configured to load your dashboard.
        </CardContent>
      </Card>
    );
  }
  const data = await fetchClientDashboardData(ctx.supabase, ctx.clientId);
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <>
      <PageHeader
        title="Your training hub"
        description="Your next session, active plan, and progress at a glance."
      />

      {ok ? <FlashBanner kind="ok" message={ok} className="mb-6" /> : null}
      {error ? <FlashBanner kind="error" message={error} className="mb-6" /> : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Upcoming appointments"
          value={String(
            data.nextAppointment ? 1 : 0,
          )}
          hint={data.nextAppointment ? "Next one is booked" : "None scheduled"}
        />
        <StatCard
          label="Sessions in last 30 days"
          value={String(data.progressSummary.sessionsLast30Days)}
          hint="Trainer-led and self-logged"
        />
        <StatCard
          label="Completed in last 30 days"
          value={String(data.progressSummary.completedLast30Days)}
          hint="Completed status sessions"
        />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>What&apos;s next</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Membership:{" "}
              <span className="font-medium">
                {data.membership.type?.name ?? "Not set"}
              </span>
            </p>
            <p>
              Trainer:{" "}
              <span className="font-medium">
                {data.trainer?.display_name ?? "Not assigned"}
              </span>
            </p>
            {data.nextAppointment ? (
              <div className="rounded border p-3">
                <p className="font-medium">Next appointment</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(data.nextAppointment.starts_at).toLocaleString()}
                  {data.nextAppointment.location_name
                    ? ` · ${data.nextAppointment.location_name}`
                    : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Trainer: {data.nextAppointment.trainer_name ?? "Assigned trainer"}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No upcoming appointments.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" asChild>
                <Link href={ROUTES.client.log}>Start workout</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href={ROUTES.client.plan}>View plan</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href={ROUTES.client.appointments}>Manage appointments</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active program</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.activeProgram ? (
              <>
                <p className="font-medium">{data.activeProgram.name}</p>
                <p className="text-xs text-muted-foreground">
                  {data.activeProgram.weekCount} weeks · {data.activeProgram.dayCount} days
                </p>
                {data.nextWorkoutDayId ? (
                  <Button size="sm" asChild>
                    <Link href={`${ROUTES.client.plan}?dayId=${data.nextWorkoutDayId}`}>
                      Open next workout
                    </Link>
                  </Button>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">No active plan assigned yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recent workouts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.recentSessions.length === 0 ? (
            <p className="text-muted-foreground">No workouts logged yet.</p>
          ) : (
            data.recentSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded border p-2">
                <div>
                  <p className="font-medium">{new Date(s.started_at).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{s.status}</p>
                </div>
                <Badge variant={s.status === "completed" ? "secondary" : "outline"}>
                  {s.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {data.upcomingActions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.upcomingActions.map((a) => (
              <div key={a} className="rounded border p-2 text-muted-foreground">
                {a}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
