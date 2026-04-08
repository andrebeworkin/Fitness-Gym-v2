import Link from "next/link";

import { fetchClientProgressData } from "@/app/(client)/client/_lib/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientServerContext } from "@/lib/auth/client-server";
import { ROUTES } from "@/lib/navigation/dashboard-nav";

export default async function ClientProgressPage() {
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
  const data = await fetchClientProgressData(ctx.supabase, ctx.clientId);

  return (
    <>
      <PageHeader
        title="Progress"
        description="Your training consistency, goals, and visible progress snapshots."
      />

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.goals.length === 0 ? (
              <p className="text-muted-foreground">No goals set yet.</p>
            ) : (
              data.goals.map((g) => (
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
            {data.latestAssessment ? (
              <div className="space-y-2">
                <p className="font-medium">
                  {new Date(data.latestAssessment.assessed_at).toLocaleDateString()}
                </p>
                <p className="text-muted-foreground">
                  {data.latestAssessment.summary ?? "No summary available."}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No assessment available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Consistency (last 12 weeks)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.sessionsLast12Weeks.length === 0 ? (
              <p className="text-muted-foreground">No workout activity in this period.</p>
            ) : (
              data.sessionsLast12Weeks.map((w) => (
                <div key={w.weekStart} className="flex items-center justify-between rounded border p-2">
                  <span>{w.weekStart}</span>
                  <span className="font-medium">{w.count} sessions</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Progress photo metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.progressPhotos.length === 0 ? (
              <p className="text-muted-foreground">No progress photos found.</p>
            ) : (
              data.progressPhotos.map((p) => (
                <div key={p.id} className="rounded border p-2">
                  <p className="font-medium">{p.taken_on}</p>
                  <p className="text-xs text-muted-foreground">{p.caption ?? "No caption"}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.recentSessions.length === 0 ? (
            <p className="text-muted-foreground">No recent sessions.</p>
          ) : (
            data.recentSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded border p-2">
                <div>
                  <p className="font-medium">{new Date(s.started_at).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{s.status}</p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={ROUTES.client.session(s.id)}>Open</Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
