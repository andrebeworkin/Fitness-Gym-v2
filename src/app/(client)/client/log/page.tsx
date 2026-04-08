import Link from "next/link";

import { startClientSessionAction } from "@/app/(client)/client/actions";
import { fetchClientLogData } from "@/app/(client)/client/_lib/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { getClientServerContext } from "@/lib/auth/client-server";
import { ROUTES } from "@/lib/navigation/dashboard-nav";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientLogPage({ searchParams }: PageProps) {
  const ctx = await getClientServerContext();
  const sp = await searchParams;
  if (!ctx) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Client session required.
        </CardContent>
      </Card>
    );
  }
  const data = await fetchClientLogData(ctx.supabase, ctx.clientId);
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <>
      <PageHeader
        title="Log workout"
        description="Start a self-led session, log set-by-set actuals, and keep your plan separate from your execution data."
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

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Start self-led session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data.inProgressSession ? (
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  You already have an in-progress session.
                </p>
                <Button asChild>
                  <Link href={ROUTES.client.session(data.inProgressSession.id)}>
                    Continue session
                  </Link>
                </Button>
              </div>
            ) : (
              <form action={startClientSessionAction} className="space-y-3">
                <input type="hidden" name="returnTo" value={ROUTES.client.log} />
                {data.activeProgram ? (
                  <div className="space-y-2">
                    <Label htmlFor="clientProgramDayId">Link to a plan day (optional)</Label>
                    <SelectNative id="clientProgramDayId" name="clientProgramDayId">
                      <option value="">No linked day</option>
                      {data.programDays.map((day) => (
                        <option key={day.id} value={day.id}>
                          {day.label ?? `Day ${day.day_number}`}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No active program linked. You can still self-log a workout.
                  </p>
                )}
                <Button type="submit">Start session</Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.recentSessions.length === 0 ? (
              <p className="text-muted-foreground">No sessions logged yet.</p>
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
      </div>
    </>
  );
}
