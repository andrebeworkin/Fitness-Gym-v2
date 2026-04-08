import Link from "next/link";

import { assignProgramAction } from "@/app/(manager)/manager/programs/actions";
import {
  fetchExercisesForPicker,
  fetchProgramAssignmentOptions,
} from "@/app/(manager)/manager/programs/_lib/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { getManagerServerContext } from "@/lib/auth/manager-server";
import { ROUTES } from "@/lib/navigation/dashboard-nav";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ManagerProgramAssignPage({ searchParams }: PageProps) {
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

  const sp = await searchParams;
  const exerciseQuery = typeof sp.exercise_q === "string" ? sp.exercise_q : "";
  const [options, exercises] = await Promise.all([
    fetchProgramAssignmentOptions(ctx.supabase),
    fetchExercisesForPicker(ctx.supabase, exerciseQuery),
  ]);

  return (
    <>
      <PageHeader
        title="Assign program"
        description="Assign a reusable template or create a client-specific plan from scratch."
      />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Template or scratch assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={assignProgramAction} className="grid gap-4 lg:grid-cols-2">
            <input type="hidden" name="returnTo" value={ROUTES.manager.programsAssign} />

            <div className="space-y-2">
              <Label htmlFor="clientId">Client</Label>
              <SelectNative id="clientId" name="clientId" required>
                <option value="">Select client</option>
                {options.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name} {c.email ? `(${c.email})` : ""}
                  </option>
                ))}
              </SelectNative>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trainerId">Trainer (optional)</Label>
              <SelectNative id="trainerId" name="trainerId">
                <option value="">None</option>
                {options.trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.display_name}
                  </option>
                ))}
              </SelectNative>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Program name</Label>
              <Input id="name" name="name" placeholder="8-week private progression" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="templateId">Template (optional)</Label>
              <SelectNative id="templateId" name="templateId">
                <option value="">No template (scratch)</option>
                {options.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.duration_weeks ? `(${t.duration_weeks}w)` : ""}
                  </option>
                ))}
              </SelectNative>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End date (optional)</Label>
              <Input id="endDate" name="endDate" type="date" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <SelectNative id="status" name="status" defaultValue="active">
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </SelectNative>
            </div>

            <div className="space-y-2 rounded-md border p-3 lg:col-span-2">
              <p className="text-sm font-medium">Scratch plan starter (used only when no template selected)</p>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="weekNumber">Week</Label>
                  <Input id="weekNumber" name="weekNumber" type="number" min={1} defaultValue={1} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dayNumber">Day</Label>
                  <Input id="dayNumber" name="dayNumber" type="number" min={1} defaultValue={1} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="exerciseId">Exercise</Label>
                  <SelectNative id="exerciseId" name="exerciseId">
                    <option value="">No starter exercise</option>
                    {exercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                        {ex.muscles.length ? ` · ${ex.muscles.join(", ")}` : ""}
                      </option>
                    ))}
                  </SelectNative>
                </div>
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
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" rows={2} />
                </div>
              </div>
            </div>

            <div className="flex gap-2 lg:col-span-2">
              <Button type="submit">Assign program</Button>
              <Button type="button" variant="ghost" asChild>
                <Link href={ROUTES.manager.programs}>Back to programs</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
