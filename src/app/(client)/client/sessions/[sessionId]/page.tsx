import { notFound } from "next/navigation";

import {
  addClientSessionExerciseAction,
  addClientSessionNoteAction,
  addClientSetSkeletonAction,
  updateClientSessionStatusAction,
  upsertClientSetLogAction,
} from "@/app/(client)/client/actions";
import { fetchClientSessionDetail } from "@/app/(client)/client/_lib/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { getClientServerContext } from "@/lib/auth/client-server";
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

export default async function ClientSessionDetailPage({
  params,
  searchParams,
}: PageProps) {
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

  const { sessionId } = await params;
  const sp = await searchParams;
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const error = typeof sp.error === "string" ? sp.error : null;
  const data = await fetchClientSessionDetail({
    supabase: ctx.supabase,
    clientId: ctx.clientId,
    sessionId,
  });
  if (!data) notFound();
  const returnTo = ROUTES.client.session(sessionId);

  return (
    <>
      <PageHeader
        title="Workout session"
        description="Log your actual performance while keeping prescribed targets untouched."
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
            <div className="flex items-center gap-2">
              <Badge variant={sessionStatusBadge(data.session.status)}>
                {data.session.status}
              </Badge>
              <p className="text-muted-foreground">
                {new Date(data.session.started_at).toLocaleString()}
              </p>
            </div>
            <p>
              Trainer: {data.trainer?.display_name ?? "Self-led"}
              {data.appointment
                ? ` · Appointment ${new Date(data.appointment.starts_at).toLocaleString()}`
                : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              <form action={updateClientSessionStatusAction}>
                <input type="hidden" name="sessionId" value={sessionId} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <input type="hidden" name="status" value="in_progress" />
                <Button size="sm" variant="outline" type="submit">
                  Mark in progress
                </Button>
              </form>
              <form action={updateClientSessionStatusAction}>
                <input type="hidden" name="sessionId" value={sessionId} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <input type="hidden" name="status" value="completed" />
                <Button size="sm" type="submit">
                  Complete
                </Button>
              </form>
              <form action={updateClientSessionStatusAction}>
                <input type="hidden" name="sessionId" value={sessionId} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <input type="hidden" name="status" value="abandoned" />
                <Button size="sm" variant="outline" type="submit">
                  Abandon
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add exercise</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addClientSessionExerciseAction} className="space-y-2">
              <input type="hidden" name="sessionId" value={sessionId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <div className="space-y-2">
                <Label htmlFor="prescribedLineId">Prescribed line (optional)</Label>
                <SelectNative id="prescribedLineId" name="prescribedLineId">
                  <option value="">No prescribed line</option>
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
                  <option value="">Select exercise</option>
                  {data.exerciseOptions.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <Textarea name="substitutionNote" rows={2} placeholder="Optional substitution note" />
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" name="substituted" />
                this exercise substitutes the prescription
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" name="similarMuscle" />
                similar muscle group
              </label>
              <Button type="submit" className="w-full">
                Add line
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Set logging</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {data.loggedExercises.length === 0 ? (
            <p className="text-muted-foreground">No exercise lines logged yet.</p>
          ) : (
            data.loggedExercises.map((line) => (
              <div key={line.id} className="rounded border p-3">
                <p className="font-medium">
                  #{line.sequence} {line.exercise_name}
                </p>
                {line.prescribed_name ? (
                  <p className="text-xs text-muted-foreground">
                    Prescribed: {line.prescribed_name}
                  </p>
                ) : null}
                <div className="mt-2 space-y-2">
                  {line.sets.map((set) => (
                    <form key={set.id} action={upsertClientSetLogAction} className="grid gap-2 rounded border p-2 md:grid-cols-6">
                      <input type="hidden" name="sessionExerciseId" value={line.id} />
                      <input type="hidden" name="setNumber" value={String(set.set_number)} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <Input value={String(set.set_number)} readOnly />
                      <Input name="performedReps" type="number" min={0} defaultValue={set.performed_reps ?? ""} />
                      <Input name="performedWeightKg" type="number" step={0.25} defaultValue={set.performed_weight_kg ?? ""} />
                      <Input name="performedRpe" type="number" min={1} max={10} step={0.5} defaultValue={set.performed_rpe ?? ""} />
                      <Input name="performedRestSeconds" type="number" min={0} step={15} defaultValue={set.performed_rest_seconds ?? ""} />
                      <div className="flex items-center gap-2">
                        <label className="text-xs">
                          <input type="checkbox" name="skipped" defaultChecked={set.skipped} /> skipped
                        </label>
                        <Button type="submit" size="sm">
                          Save
                        </Button>
                      </div>
                      <Input className="md:col-span-6" name="skipReason" defaultValue={set.skip_reason ?? ""} placeholder="Skip reason" />
                    </form>
                  ))}
                  <form action={addClientSetSkeletonAction}>
                    <input type="hidden" name="sessionExerciseId" value={line.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <Button type="submit" size="sm" variant="outline">
                      Add set
                    </Button>
                  </form>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Client-visible session notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <form action={addClientSessionNoteAction} className="space-y-2">
              <input type="hidden" name="sessionId" value={sessionId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <Textarea name="body" rows={3} placeholder="How did the session feel?" />
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" name="painReported" />
                pain reported
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" name="discomfortReported" />
                discomfort reported
              </label>
              <Input name="skippedExercisesNote" placeholder="Skipped exercise note" />
              <Button type="submit" size="sm">
                Save note
              </Button>
            </form>
            {data.clientNotes.length === 0 ? (
              <p className="text-muted-foreground">No notes yet.</p>
            ) : (
              data.clientNotes.map((n) => (
                <div key={n.id} className="rounded border p-2">
                  <p>{n.body ?? "No body"}</p>
                  <p className="text-xs text-muted-foreground">
                    pain={String(n.pain_reported)} discomfort={String(n.discomfort_reported)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Incident flags (your records)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.incidents.length === 0 ? (
              <p className="text-muted-foreground">No incident flags on this session.</p>
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
