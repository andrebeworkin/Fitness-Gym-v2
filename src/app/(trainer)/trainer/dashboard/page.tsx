import Link from "next/link";

import { FlashBanner } from "@/components/dashboard/flash-banner";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { startSessionFromAppointmentAction } from "@/app/(trainer)/trainer/actions";
import { fetchTrainerTodayData } from "@/app/(trainer)/trainer/_lib/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTrainerServerContext } from "@/lib/auth/trainer-server";
import { ROUTES } from "@/lib/navigation/dashboard-nav";

type PageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function TrainerDashboardPage({ searchParams }: PageProps) {
  const ctx = await getTrainerServerContext();
  const sp = await searchParams;
  if (!ctx) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Sign in as a trainer with Supabase configured to load today&apos;s workflow.
        </CardContent>
      </Card>
    );
  }

  const data = await fetchTrainerTodayData(ctx.supabase, ctx.trainerId);
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <>
      <PageHeader
        title="Today"
        description="Live trainer workflow for appointments, in-progress sessions, and follow-up actions."
      />

      {ok ? <FlashBanner kind="ok" message={ok} className="mb-6" /> : null}
      {error ? <FlashBanner kind="error" message={error} className="mb-6" /> : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Sessions today"
          value={String(data.summary.sessionsToday)}
          hint="Appointments on your schedule today"
        />
        <StatCard
          label="Completed today"
          value={String(data.summary.completedToday)}
          hint="Sessions marked completed"
        />
        <StatCard
          label="Upcoming"
          value={String(data.summary.upcoming)}
          hint="Still to run today"
        />
        <StatCard
          label="Follow-up notes"
          value={String(data.summary.followUpNotesNeeded)}
          hint="Completed or abandoned sessions missing notes"
        />
        <StatCard
          label="Pending program requests"
          value={String(data.summary.pendingChangeRequests)}
          hint="Trainer-authored change requests awaiting manager review"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Today&apos;s appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data.todayAppointments.length === 0 ? (
              <p className="text-muted-foreground">No appointments scheduled today.</p>
            ) : (
              data.todayAppointments.map((a) => (
                <div key={a.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{a.client_name}</p>
                    <Badge variant={a.status === "scheduled" ? "default" : "outline"}>
                      {a.status}
                    </Badge>
                    {a.linked_session_status ? (
                      <Badge variant="secondary">Session {a.linked_session_status}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(a.starts_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" - "}
                    {new Date(a.ends_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {a.location_name ? ` · ${a.location_name}` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {a.linked_session_id ? (
                      <Button size="sm" asChild>
                        <Link href={ROUTES.trainer.session(a.linked_session_id)}>
                          Continue session
                        </Link>
                      </Button>
                    ) : (
                      <form action={startSessionFromAppointmentAction}>
                        <input type="hidden" name="appointmentId" value={a.id} />
                        <input
                          type="hidden"
                          name="returnTo"
                          value={ROUTES.trainer.dashboard}
                        />
                        <Button type="submit" size="sm">
                          Start session
                        </Button>
                      </form>
                    )}
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={ROUTES.trainer.client(a.client_id)}>Open client</Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {data.nextUpcoming ? (
              <div className="rounded-lg border p-3">
                <p className="font-medium">{data.nextUpcoming.client_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(data.nextUpcoming.starts_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {data.nextUpcoming.location_name
                    ? ` · ${data.nextUpcoming.location_name}`
                    : ""}
                </p>
                <div className="mt-3">
                  <Button asChild size="sm">
                    <Link href={ROUTES.trainer.sessionStart(data.nextUpcoming.id)}>
                      Open runner
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No upcoming sessions today.</p>
            )}

            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                Sessions in progress
              </p>
              {data.inProgressSessions.length === 0 ? (
                <p className="text-muted-foreground">No active session right now.</p>
              ) : (
                <div className="space-y-2">
                  {data.inProgressSessions.map((s) => (
                    <Button key={s.id} variant="outline" size="sm" asChild className="w-full justify-start">
                      <Link href={ROUTES.trainer.session(s.id)}>{s.client_name}</Link>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assigned clients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.assignedClients.length === 0 ? (
              <p className="text-muted-foreground">No open assignments.</p>
            ) : (
              data.assignedClients.map((c) => (
                <Button key={c.id} variant="outline" size="sm" asChild className="w-full justify-start">
                  <Link href={ROUTES.trainer.client(c.id)}>{c.display_name}</Link>
                </Button>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Clients scheduled today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.clientsScheduledToday.length === 0 ? (
              <p className="text-muted-foreground">No scheduled clients today.</p>
            ) : (
              data.clientsScheduledToday.map((c) => (
                <Button key={c.id} variant="outline" size="sm" asChild className="w-full justify-start">
                  <Link href={ROUTES.trainer.client(c.id)}>{c.display_name}</Link>
                </Button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Pending program change requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.pendingRequests.length === 0 ? (
            <p className="text-muted-foreground">No pending requests.</p>
          ) : (
            data.pendingRequests.map((r) => (
              <div key={r.id} className="rounded border p-2">
                <p className="font-medium">
                  {r.client_name ?? "Client"} · {r.program_name ?? "Program"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.request_summary ?? "No summary"}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
