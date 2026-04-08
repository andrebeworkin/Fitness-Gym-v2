import Link from "next/link";
import { notFound } from "next/navigation";

import {
  startSessionFromClientDetailAction,
  submitProgramChangeRequestAction,
} from "@/app/(trainer)/trainer/actions";
import { fetchTrainerClientDetail } from "@/app/(trainer)/trainer/_lib/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getTrainerServerContext } from "@/lib/auth/trainer-server";
import { ROUTES } from "@/lib/navigation/dashboard-nav";

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function TrainerClientDetailPage({ params }: PageProps) {
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
  const { clientId } = await params;

  const detail = await fetchTrainerClientDetail({
    supabase: ctx.supabase,
    trainerId: ctx.trainerId,
    clientId,
  });
  if (!detail) notFound();

  const returnTo = ROUTES.trainer.client(clientId);

  return (
    <>
      <PageHeader
        title={detail.profile.display_name}
        description="Training-safe client detail with active programming context and quick session start."
      />

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Client snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {detail.profile.email ?? "No email on file"}
            </p>
            <p>
              Relationship:{" "}
              {detail.activeAssignment ? (
                <Badge>Assigned trainer</Badge>
              ) : (
                <Badge variant="outline">Coverage access</Badge>
              )}
            </p>
            <form action={startSessionFromClientDetailAction}>
              <input type="hidden" name="clientId" value={detail.profile.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <Button type="submit">Start session</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active program</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {detail.activeProgram ? (
              <div className="space-y-2">
                <p className="font-medium">{detail.activeProgram.name}</p>
                <p className="text-xs text-muted-foreground">
                  {detail.activeProgram.status} · {detail.activeProgram.weekCount} weeks ·{" "}
                  {detail.activeProgram.dayCount} days
                </p>
                <p className="text-xs text-muted-foreground">
                  {detail.activeProgram.start_date}
                  {detail.activeProgram.end_date
                    ? ` to ${detail.activeProgram.end_date}`
                    : ""}
                </p>
                {detail.activeProgram.author_kind === "manager" ? (
                  <form action={submitProgramChangeRequestAction} className="mt-3 space-y-2">
                    <input
                      type="hidden"
                      name="clientProgramId"
                      value={detail.activeProgram.id}
                    />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <Label htmlFor="requestSummary">Request program change</Label>
                    <Input
                      id="requestSummary"
                      name="requestSummary"
                      placeholder="Reason for change"
                      required
                    />
                    <Textarea
                      name="suggestedChange"
                      rows={2}
                      placeholder="Suggested replacement or progression/regression"
                    />
                    <Button type="submit" size="sm">
                      Submit request
                    </Button>
                  </form>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    This program is not manager-authored; no request needed.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No active program.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {detail.goals.length === 0 ? (
              <p className="text-muted-foreground">No goals recorded.</p>
            ) : (
              detail.goals.map((g) => (
                <div key={g.id} className="rounded border p-2">
                  <p className="font-medium">{g.title}</p>
                  {g.detail ? <p className="text-xs text-muted-foreground">{g.detail}</p> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest assessment</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {detail.latestAssessment ? (
              <div className="space-y-2">
                <p className="font-medium">
                  {new Date(detail.latestAssessment.assessed_at).toLocaleDateString()}
                </p>
                <p className="text-muted-foreground">
                  {detail.latestAssessment.summary ?? "No summary"}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No assessment yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {detail.upcomingAppointments.length === 0 ? (
              <p className="text-muted-foreground">No upcoming appointments.</p>
            ) : (
              detail.upcomingAppointments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded border p-2"
                >
                  <div>
                    <p className="font-medium">
                      {new Date(a.starts_at).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{a.status}</p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={ROUTES.trainer.sessionStart(a.id)}>Start</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {detail.recentSessions.length === 0 ? (
              <p className="text-muted-foreground">No sessions yet.</p>
            ) : (
              detail.recentSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded border p-2"
                >
                  <div>
                    <p className="font-medium">
                      {new Date(s.started_at).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.status}</p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={ROUTES.trainer.session(s.id)}>Open</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Internal training notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {detail.staffNotes.length === 0 ? (
              <p className="text-muted-foreground">No internal notes.</p>
            ) : (
              detail.staffNotes.map((n) => (
                <div key={n.id} className="rounded border p-2">
                  <p>{n.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {n.author_name ?? "Staff"} · {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent incident flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {detail.incidents.length === 0 ? (
              <p className="text-muted-foreground">No incidents logged.</p>
            ) : (
              detail.incidents.map((i) => (
                <div key={i.id} className="rounded border p-2">
                  <p className="font-medium">{i.kind}</p>
                  {i.description ? <p>{i.description}</p> : null}
                  <p className="text-xs text-muted-foreground">
                    {new Date(i.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
