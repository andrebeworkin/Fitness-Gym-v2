import Link from "next/link";

import { fetchClientPlanData } from "@/app/(client)/client/_lib/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientServerContext } from "@/lib/auth/client-server";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientPlanPage({ searchParams }: PageProps) {
  const ctx = await getClientServerContext();
  if (!ctx) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Client session required.
        </CardContent>
      </Card>
    );
  }
  const sp = await searchParams;
  const dayId = typeof sp.dayId === "string" ? sp.dayId : null;
  const data = await fetchClientPlanData({
    supabase: ctx.supabase,
    clientId: ctx.clientId,
    selectedDayId: dayId,
  });
  const selectedDay =
    data.activePlanWeeks
      .flatMap((w) => w.days)
      .find((d) => d.id === data.selectedDayId) ?? null;

  return (
    <>
      <PageHeader
        title="My plan"
        description="Your active program and prescribed day structure. Logged results stay separate from prescribed targets."
      />

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Active program</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data.activeProgram ? (
              <>
                <p className="font-medium">{data.activeProgram.name}</p>
                <p className="text-xs text-muted-foreground">
                  {data.activeProgram.start_date}
                  {data.activeProgram.end_date ? ` to ${data.activeProgram.end_date}` : ""}
                </p>
                {data.activePlanWeeks.length === 0 ? (
                  <p className="text-muted-foreground">Program structure is not available yet.</p>
                ) : (
                  <div className="space-y-3">
                    {data.activePlanWeeks.map((week) => (
                      <div key={week.id} className="rounded border p-3">
                        <p className="font-medium">{week.label ?? `Week ${week.week_number}`}</p>
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          {week.days.map((day) => (
                            <Link
                              key={day.id}
                              href={`?dayId=${day.id}`}
                              className={`rounded border p-2 text-xs ${
                                day.id === data.selectedDayId ? "border-primary bg-primary/5" : ""
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{day.label ?? `Day ${day.day_number}`}</span>
                                {day.exercises.some((e) => e.recently_logged) ? (
                                  <Badge variant="secondary">Logged</Badge>
                                ) : null}
                              </div>
                              <p className="mt-1 text-muted-foreground">
                                {day.exercises.length} exercises
                              </p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No active plan is assigned yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Selected day</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {!selectedDay ? (
              <p className="text-muted-foreground">Select a day to view exercises.</p>
            ) : selectedDay.exercises.length === 0 ? (
              <p className="text-muted-foreground">No exercises on this day yet.</p>
            ) : (
              selectedDay.exercises.map((line) => (
                <div key={line.id} className="rounded border p-2">
                  <p className="font-medium">
                    #{line.sequence} {line.exercise?.name ?? "Exercise"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {line.prescribed_sets ? `${line.prescribed_sets} sets` : "sets n/a"} ·{" "}
                    {line.prescribed_reps ?? "reps n/a"} · rest {line.rest_seconds ?? 0}s ·
                    tempo {line.tempo ?? "n/a"} · RPE {line.target_rpe ?? "n/a"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {line.exercise?.machine ? `Machine: ${line.exercise.machine} · ` : ""}
                    {line.exercise?.grip ? `Grip: ${line.exercise.grip} · ` : ""}
                    {line.exercise?.bar_type ? `Bar: ${line.exercise.bar_type}` : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!data.historyAllowed ? (
            <p className="text-muted-foreground">
              Plan history is hidden for your account.
            </p>
          ) : data.historyPrograms.length === 0 ? (
            <p className="text-muted-foreground">No historical plans yet.</p>
          ) : (
            data.historyPrograms.map((p) => (
              <div key={p.id} className="rounded border p-2">
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.status} · {p.start_date}
                  {p.end_date ? ` to ${p.end_date}` : ""}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
