import Link from "next/link";
import { notFound } from "next/navigation";

import {
  addTemplateExerciseAction,
  archiveTemplateAction,
  updateTemplateMetaAction,
} from "@/app/(manager)/manager/programs/actions";
import {
  fetchExercisesForPicker,
  fetchTemplateDetail,
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
  params: Promise<{ templateId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProgramTemplateDetailPage({
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

  const { templateId } = await params;
  const sp = await searchParams;
  const exerciseQuery = typeof sp.exercise_q === "string" ? sp.exercise_q : "";

  const [detail, exercises] = await Promise.all([
    fetchTemplateDetail(ctx.supabase, templateId),
    fetchExercisesForPicker(ctx.supabase, exerciseQuery),
  ]);
  if (!detail) notFound();
  const archived = detail.template.name.startsWith("[ARCHIVED]");

  return (
    <>
      <PageHeader
        title={detail.template.name}
        description="Reusable program template structure: weeks, days, and prescribed exercises."
      />
      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Template details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={updateTemplateMetaAction} className="grid gap-4 lg:grid-cols-2">
              <input type="hidden" name="templateId" value={templateId} />
              <input type="hidden" name="returnTo" value={ROUTES.manager.programTemplate(templateId)} />
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={detail.template.name} required />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  defaultValue={detail.template.description ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationWeeks">Duration (weeks)</Label>
                <Input
                  id="durationWeeks"
                  name="durationWeeks"
                  type="number"
                  min={1}
                  max={52}
                  defaultValue={detail.template.duration_weeks ?? 4}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit">Save</Button>
                <Button type="button" variant="ghost" asChild>
                  <Link href={ROUTES.manager.programs}>Back</Link>
                </Button>
              </div>
            </form>
            <form action={archiveTemplateAction}>
              <input type="hidden" name="templateId" value={templateId} />
              <input type="hidden" name="returnTo" value={ROUTES.manager.programTemplate(templateId)} />
              <Button type="submit" variant="outline">
                {archived ? "Restore template" : "Archive template"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add day exercise</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addTemplateExerciseAction} className="space-y-3">
              <input type="hidden" name="templateId" value={templateId} />
              <input type="hidden" name="returnTo" value={ROUTES.manager.programTemplate(templateId)} />
              <div className="grid gap-3 grid-cols-2">
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
                  Tip: use `?exercise_q=press` in URL for targeted lookup.
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
                  <Input id="tempo" name="tempo" placeholder="3-1-1-0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetRpe">Target RPE</Label>
                  <Input id="targetRpe" name="targetRpe" type="number" min={1} max={10} step={0.5} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supersetGroup">Superset group</Label>
                  <Input id="supersetGroup" name="supersetGroup" placeholder="A1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={2} />
              </div>
              <Button type="submit" className="w-full">
                Add exercise
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Week/day structure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {detail.weeks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No weeks configured yet.</p>
          ) : (
            detail.weeks.map((week) => (
              <div key={week.id} className="rounded-lg border p-3">
                <p className="font-medium">{week.label ?? `Week ${week.week_number}`}</p>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {week.days.map((day) => (
                    <div key={day.id} className="rounded-md border p-3">
                      <p className="text-sm font-medium">{day.label ?? `Day ${day.day_number}`}</p>
                      {day.exercises.length === 0 ? (
                        <p className="mt-2 text-xs text-muted-foreground">No exercises yet.</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {day.exercises.map((line) => (
                            <div key={line.id} className="rounded border p-2 text-xs">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">#{line.sequence}</Badge>
                                <p className="font-medium">{line.exercise?.name ?? "Exercise"}</p>
                              </div>
                              <p className="mt-1 text-muted-foreground">
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
    </>
  );
}
