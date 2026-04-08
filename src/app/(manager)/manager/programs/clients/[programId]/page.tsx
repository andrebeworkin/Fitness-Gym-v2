import Link from "next/link";
import { notFound } from "next/navigation";

import {
  addClientProgramExerciseAction,
  resolveProgramChangeRequestAction,
  updateClientProgramStatusAction,
} from "@/app/(manager)/manager/programs/actions";
import {
  fetchClientProgramDetail,
  fetchExercisesForPicker,
  fetchProgramAssignmentOptions,
} from "@/app/(manager)/manager/programs/_lib/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { getManagerServerContext } from "@/lib/auth/manager-server";
import { ROUTES } from "@/lib/navigation/dashboard-nav";

type PageProps = {
  params: Promise<{ programId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function statusVariant(status: string) {
  if (status === "active") return "default" as const;
  if (status === "completed") return "secondary" as const;
  return "outline" as const;
}

export default async function ManagerClientProgramDetailPage({
  params,
  searchParams,
}: PageProps) {
  const ctx = await getManagerServerContext();
  if (!ctx) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Manager session required.
        </CardContent>
      </Card>
    );
  }
  const { programId } = await params;
  const sp = await searchParams;
  const exerciseQuery = typeof sp.exercise_q === "string" ? sp.exercise_q : "";

  const [detail, options, exercises] = await Promise.all([
    fetchClientProgramDetail(ctx.supabase, programId),
    fetchProgramAssignmentOptions(ctx.supabase),
    fetchExercisesForPicker(ctx.supabase, exerciseQuery),
  ]);
  if (!detail) notFound();

  const returnTo = ROUTES.manager.programClient(programId);

  return (
    <>
      <PageHeader
        title={detail.program.name}
        description={`Client program for ${detail.program.client_name}. Manager edits append prescription rows so completed logs stay intact.`}
      />

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Program overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant(detail.program.status)}>{detail.program.status}</Badge>
              <p className="text-sm text-muted-foreground">
                Assigned by {detail.program.assigned_by_name ?? "staff"}
              </p>
            </div>
            <p className="text-sm">
              <span className="font-medium">Client:</span> {detail.program.client_name}
              {" · "}
              <span className="font-medium">Trainer:</span>{" "}
              {detail.program.trainer_name ?? "Unassigned"}
              {" · "}
              <span className="font-medium">Location:</span>{" "}
              {detail.program.client_location?.name ?? "N/A"}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={ROUTES.manager.member(detail.program.client_id)}>
                  Open member
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={ROUTES.manager.schedule}>Open schedule</Link>
              </Button>
            </div>
            <form action={updateClientProgramStatusAction} className="grid gap-3 lg:grid-cols-2">
              <input type="hidden" name="programId" value={programId} />
              <input type="hidden" name="returnTo" value={returnTo} />

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <SelectNative id="status" name="status" defaultValue={detail.program.status}>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </SelectNative>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trainerId">Trainer</Label>
                <SelectNative
                  id="trainerId"
                  name="trainerId"
                  defaultValue={detail.program.primary_trainer_id ?? ""}
                >
                  <option value="">Unassigned</option>
                  {options.trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.display_name}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start date</Label>
                <Input id="startDate" name="startDate" type="date" defaultValue={detail.program.start_date} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End date</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  defaultValue={detail.program.end_date ?? ""}
                />
              </div>
              <div className="lg:col-span-2">
                <Button type="submit">Save program status</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add prescribed exercise</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addClientProgramExerciseAction} className="space-y-3">
              <input type="hidden" name="programId" value={programId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="weekNumber">Week</Label>
                  <Input id="weekNumber" name="weekNumber" type="number" min={1} defaultValue={1} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dayNumber">Day</Label>
                  <Input id="dayNumber" name="dayNumber" type="number" min={1} defaultValue={1} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exerciseId">Exercise</Label>
                <SelectNative id="exerciseId" name="exerciseId" required>
                  <option value="">Select exercise</option>
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                      {ex.muscles.length ? ` · ${ex.muscles.join(", ")}` : ""}
                    </option>
                  ))}
                </SelectNative>
                <p className="text-xs text-muted-foreground">
                  Alternative/progression/regression relationships are preserved in the exercise library metadata.
                </p>
              </div>
              <div className="grid gap-3 grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sets">Sets</Label>
                  <Input id="sets" name="sets" type="number" min={1} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reps">Reps</Label>
                  <Input id="reps" name="reps" placeholder="8-10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restSeconds">Rest (sec)</Label>
                  <Input id="restSeconds" name="restSeconds" type="number" min={0} step={15} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tempo">Tempo</Label>
                  <Input id="tempo" name="tempo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetRpe">Target RPE</Label>
                  <Input id="targetRpe" name="targetRpe" type="number" min={1} max={10} step={0.5} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supersetGroup">Superset</Label>
                  <Input id="supersetGroup" name="supersetGroup" placeholder="A1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={2} />
              </div>
              <Button type="submit" className="w-full">
                Add line
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Weeks and days</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {detail.weeks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No structure added yet.</p>
          ) : (
            detail.weeks.map((week) => (
              <div key={week.id} className="rounded-lg border p-3">
                <p className="font-medium">{week.label ?? `Week ${week.week_number}`}</p>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {week.days.map((day) => (
                    <div key={day.id} className="rounded-md border p-3">
                      <p className="text-sm font-medium">{day.label ?? `Day ${day.day_number}`}</p>
                      {day.exercises.length === 0 ? (
                        <p className="mt-2 text-xs text-muted-foreground">No prescribed exercises.</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {day.exercises.map((line) => (
                            <div key={line.id} className="rounded border p-2 text-xs">
                              <p className="font-medium">
                                #{line.sequence} {line.exercise?.name ?? "Exercise"}
                              </p>
                              <p className="text-muted-foreground">
                                {line.prescribed_sets ? `${line.prescribed_sets} sets` : "sets n/a"} ·{" "}
                                {line.prescribed_reps ?? "reps n/a"} · rest {line.rest_seconds ?? 0}s
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent workout sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {detail.recentSessions.length === 0 ? (
              <p className="text-muted-foreground">No logged sessions yet for this program.</p>
            ) : (
              detail.recentSessions.map((s) => (
                <div key={s.id} className="rounded border p-2">
                  <p className="font-medium">{new Date(s.started_at).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    Status: {s.status}
                    {s.completed_at
                      ? ` · Completed ${new Date(s.completed_at).toLocaleString()}`
                      : ""}
                    {s.appointment_starts_at
                      ? ` · Appointment ${new Date(s.appointment_starts_at).toLocaleString()}`
                      : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending program change requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {detail.pendingRequests.length === 0 ? (
              <p className="text-muted-foreground">No pending requests for this program.</p>
            ) : (
              detail.pendingRequests.map((req) => (
                <div key={req.id} className="rounded border p-3">
                  <p className="font-medium">{req.requester_name ?? "Trainer"} requested changes</p>
                  {req.request_summary ? <p className="mt-1">{req.request_summary}</p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Payload preview: {JSON.stringify(req.payload).slice(0, 120)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={resolveProgramChangeRequestAction} className="flex gap-2">
                      <input type="hidden" name="requestId" value={req.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <Input name="managerDecisionNote" placeholder="Optional note" className="h-9 w-48" />
                      <Button type="submit" size="sm">
                        Approve
                      </Button>
                    </form>
                    <form action={resolveProgramChangeRequestAction} className="flex gap-2">
                      <input type="hidden" name="requestId" value={req.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <Input name="managerDecisionNote" placeholder="Optional note" className="h-9 w-48" />
                      <Button type="submit" variant="outline" size="sm">
                        Reject
                      </Button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
