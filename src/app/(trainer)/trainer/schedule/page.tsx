import Link from "next/link";

import { fetchTrainerScheduleData } from "@/app/(trainer)/trainer/_lib/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTrainerServerContext } from "@/lib/auth/trainer-server";
import { ROUTES } from "@/lib/navigation/dashboard-nav";

export default async function TrainerSchedulePage() {
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

  const schedule = await fetchTrainerScheduleData(ctx.supabase, ctx.trainerId);

  return (
    <>
      <PageHeader
        title="Schedule"
        description="Today and next-week appointments with quick access to session runner."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {schedule.today.length === 0 ? (
              <p className="text-muted-foreground">No appointments today.</p>
            ) : (
              schedule.today.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded border p-2">
                  <div>
                    <p className="font-medium">{a.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.starts_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {a.location_name ? ` · ${a.location_name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.status === "scheduled" ? "default" : "outline"}>
                      {a.status}
                    </Badge>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={ROUTES.trainer.sessionStart(a.id)}>Run</Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next 7 days</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {schedule.upcomingWeek.length === 0 ? (
              <p className="text-muted-foreground">No upcoming appointments.</p>
            ) : (
              schedule.upcomingWeek.map((a) => (
                <div key={a.id} className="rounded border p-2">
                  <p className="font-medium">{a.client_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.starts_at).toLocaleString()} · {a.status}
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
