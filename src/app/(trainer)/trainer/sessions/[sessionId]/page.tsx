import { notFound } from "next/navigation";

import {
  addClientSessionNoteAction,
  addSessionExerciseAction,
  addSessionIncidentAction,
  addSetSkeletonAction,
  addStaffSessionNoteAction,
  submitProgramChangeRequestAction,
  updateSessionStatusAction,
  upsertSetLogAction,
} from "@/app/(trainer)/trainer/actions";
import { fetchTrainerSessionDetail } from "@/app/(trainer)/trainer/_lib/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { getTrainerServerContext } from "@/lib/auth/trainer-server";
import { ROUTES } from "@/lib/navigation/dashboard-nav";

type PageProps = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function sessionStatusBadge(status: string) {
  if (status === "in_progress") return "default" as const;
  if (status === "completed") return "secondary" as const;
  return "outline" as const;
}

export default async function TrainerSessionDetailPage({
  params,
  searchParams,
}: PageProps) {
  const ctx = await getTrainerServerContext();
  if (!ctx) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Trainer session required.
        </CardContent>
      </Card>
    );
  }

  const { sessionId } = await params;
  const sp = await searchParams;
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const error = typeof sp.error === "string" ? sp.error : null;
  const data = await fetchTrainerSessionDetail({
    supabase: ctx.supabase,
    trainerId: ctx.trainerId,
    sessionId,
  });
  if (!data) notFound();
  const returnTo = ROUTES.trainer.session(sessionId);

  return (
    <>
      <PageHeader
        title={`Session · ${data.client.display_name}`}
        description="Live workout runner with prescribed targets and actual logged execution."
      />

      {ok ? (
        <Card className="mb-6 border-emerald-300/60 bg-emerald-50">
          <CardContent className="pt-6 text-sm text-emerald-900">{ok}</CardContent>
        </Card>
      ) : null}
      {error ? (
        <Card className="mb-6 border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Session metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={sessionStatusBadge(data.session.status)}>
                {data.session.status}
              </Badge>
              <p className="text-muted-foreground">
                Started {new Date(data.session.started_at).toLocaleString()}
              </p>
            </div>
            <p>
              Client: {data.client.display_name}
              {data.appointment
                ? ` · Appointment ${new Date(data.appointment.starts_at).toLocaleString()}`
                : " · No linked appointment"}
            </p>
            <p>
              Program: {data.activeProgram?.name ?? "No linked active program"}
              {data.prescribedDay
                ? ` · Prescribed day ${data.prescribedDay.day_number}`
                : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              <form action={updateSessionStatusAction}>
                <input type="hidden" name="sessionId" value={sessionId} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <input type="hidden" name="status" value="in_progress" />
                <Button type="submit" size="sm" variant="outline">
                  Mark in progress
                </Button>
              </form>
              <form action={updateSessionStatusAction}>
                <input type="hidden" name="sessionId" value={sessionId} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <input type="hidden" name="status" value="completed" />
                <Button type="submit" size="sm">
                  Complete session
                </Button>
              </form>
              <form action={updateSessionStatusAction}>
                <input type="hidden" name="sessionId" value={sessionId} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <input type="hidden" name="status" value="abandoned" />
                <Button type="submit" size="sm" variant="outline">
                  Mark abandoned
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add logged exercise</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addSessionExerciseAction} className="space-y-3">
              <input type="hidden" name="sessionId" value={sessionId} />
              <input type="hidden" name="returnTo" value={returnTo} />

              <div className="space-y-2">
                <Label htmlFor="prescribedLineId">Prescribed line (optional)</Label>
                <SelectNative id="prescribedLineId" name="prescribedLineId" defaultValue="">
                  <option value="">Ad-hoc line</option>
                  {data.prescribedExercises.map((line) => (
                    <option key={line.id} value={line.id}>
                      #{line.sequence} {line.exercise_name ?? "Exercise"}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="space-y-2">
                <Label htmlFor="performedExerciseId">Performed exercise</Label>
                <SelectNative id="performedExerciseId" name="performedExerciseId" required>
                  <option value="">Select</option>
                  {data.exerciseOptions.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="space-y-2">
                <Label htmlFor="substitutionNote">Substitution note</Label>
                <Textarea
                  id="substitutionNote"
                  name="substitutionNote"
                  rows={2}
                  placeholder="Why this was substituted"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" name="substituted" />
                Mark as substitution
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" name="similarMuscle" />
                Similar muscle group asserted
              </label>
              <Button type="submit" className="w-full">
                Add exercise line
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Prescribed targets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.prescribedExercises.length === 0 ? (
              <p className="text-muted-foreground">
                No prescribed lines linked. You can still log ad-hoc execution.
              </p>
            ) : (
              data.prescribedExercises.map((line) => (
                <div key={line.id} className="rounded border p-2">
                  <p className="font-medium">
                    #{line.sequence} {line.exercise_name ?? "Exercise"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {line.prescribed_sets ? `${line.prescribed_sets} sets` : "sets n/a"} ·{" "}
                    {line.prescribed_reps ?? "reps n/a"} · rest {line.rest_seconds ?? 0}s ·
                    tempo {line.tempo ?? "n/a"} · RPE {line.target_rpe ?? "n/a"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Program change request</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {data.activeProgram?.author_kind === "manager" ? (
              <form action={submitProgramChangeRequestAction} className="space-y-3">
                <input
                  type="hidden"
                  name="clientProgramId"
                  value={data.activeProgram.id}
                />
                <input type="hidden" name="returnTo" value={returnTo} />
                <div className="space-y-2">
                  <Label htmlFor="requestSummary">Reason</Label>
                  <Input
                    id="requestSummary"
                    name="requestSummary"
                    placeholder="Pain with current progression"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="affectedDayId">Affected day id (optional)</Label>
                  <Input
                    id="affectedDayId"
                    name="affectedDayId"
                    defaultValue={data.prescribedDay?.id ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suggestedChange">Suggested change</Label>
                  <Textarea
                    id="suggestedChange"
                    name="suggestedChange"
                    rows={3}
                    placeholder="Replace back squat with goblet squat for week 3."
                  />
                </div>
                <Button type="submit">Submit change request</Button>
              </form>
            ) : (
              <p className="text-muted-foreground">
                No manager-authored active program linked for request workflow.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Live set-by-set logging</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {data.loggedExercises.length === 0 ? (
            <p className="text-muted-foreground">No logged exercises yet.</p>
          ) : (
            data.loggedExercises.map((line) => (
              <div key={line.id} className="rounded-lg border p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    #{line.sequence} {line.performed_exercise_name}
                  </p>
                  {line.substituted ? <Badge variant="outline">Substituted</Badge> : null}
                  {line.prescribed_exercise_name ? (
                    <Badge variant="secondary">
                      Prescribed: {line.prescribed_exercise_name}
                    </Badge>
                  ) : null}
                </div>
                <div className="space-y-2">
                  {line.sets.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No sets yet.</p>
                  ) : (
                    line.sets.map((set) => (
                      <form
                        key={set.id}
                        action={upsertSetLogAction}
                        className="grid gap-2 rounded border p-2 md:grid-cols-6"
                      >
                        <input type="hidden" name="sessionExerciseId" value={line.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <input type="hidden" name="setNumber" value={String(set.set_number)} />
                        <div className="space-y-1">
                          <Label>Set</Label>
                          <Input value={String(set.set_number)} readOnly />
                        </div>
                        <div className="space-y-1">
                          <Label>Reps</Label>
                          <Input
                            name="performedReps"
                            type="number"
                            min={0}
                            defaultValue={set.performed_reps ?? ""}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Weight (kg)</Label>
                          <Input
                            name="performedWeightKg"
                            type="number"
                            step={0.25}
                            defaultValue={set.performed_weight_kg ?? ""}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>RPE</Label>
                          <Input
                            name="performedRpe"
                            type="number"
                            min={1}
                            max={10}
                            step={0.5}
                            defaultValue={set.performed_rpe ?? ""}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Rest (sec)</Label>
                          <Input
                            name="performedRestSeconds"
                            type="number"
                            min={0}
                            step={15}
                            defaultValue={set.performed_rest_seconds ?? ""}
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <label className="flex items-center gap-1 text-xs">
                            <input name="skipped" type="checkbox" defaultChecked={set.skipped} />
                            skipped
                          </label>
                          <Button type="submit" size="sm">
                            Save
                          </Button>
                        </div>
                        <div className="space-y-1 md:col-span-6">
                          <Label>Skip reason</Label>
                          <Input
                            name="skipReason"
                            defaultValue={set.skip_reason ?? ""}
                            placeholder="Reason if skipped"
                          />
                        </div>
                      </form>
                    ))
                  )}
                  <form action={addSetSkeletonAction}>
                    <input type="hidden" name="sessionExerciseId" value={line.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <Button size="sm" variant="outline" type="submit">
                      Add set row
                    </Button>
                  </form>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Client-visible session note</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addClientSessionNoteAction} className="space-y-2">
              <input type="hidden" name="sessionId" value={sessionId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <Textarea name="body" rows={3} placeholder="Session summary visible to client" />
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" name="painReported" />
                pain reported
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" name="discomfortReported" />
                discomfort reported
              </label>
              <Input
                name="skippedExercisesNote"
                placeholder="Skipped exercise note (client visible)"
              />
              <Button type="submit" size="sm">
                Add note
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Internal staff note</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addStaffSessionNoteAction} className="space-y-2">
              <input type="hidden" name="sessionId" value={sessionId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <Textarea name="body" rows={3} placeholder="Internal training note" required />
              <Button type="submit" size="sm">
                Add internal note
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incident flag</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addSessionIncidentAction} className="space-y-2">
              <input type="hidden" name="sessionId" value={sessionId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <SelectNative name="kind" defaultValue="pain">
                <option value="pain">pain</option>
                <option value="dizziness">dizziness</option>
                <option value="form_issue">form_issue</option>
                <option value="missed_appointment">missed_appointment</option>
                <option value="other">other</option>
              </SelectNative>
              <Textarea name="description" rows={3} placeholder="Operational details" />
              <Button type="submit" size="sm">
                Log incident
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Client session notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.clientNotes.length === 0 ? (
              <p className="text-muted-foreground">No client-visible notes yet.</p>
            ) : (
              data.clientNotes.map((n) => (
                <div key={n.id} className="rounded border p-2">
                  <p>{n.body ?? "No body"}</p>
                  <p className="text-xs text-muted-foreground">
                    pain={String(n.pain_reported)} discomfort=
                    {String(n.discomfort_reported)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Internal notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.staffNotes.length === 0 ? (
              <p className="text-muted-foreground">No staff notes yet.</p>
            ) : (
              data.staffNotes.map((n) => (
                <div key={n.id} className="rounded border p-2">
                  <p>{n.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Incidents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.incidents.length === 0 ? (
              <p className="text-muted-foreground">No incidents logged.</p>
            ) : (
              data.incidents.map((i) => (
                <div key={i.id} className="rounded border p-2">
                  <p className="font-medium">{i.kind}</p>
                  {i.description ? <p>{i.description}</p> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
