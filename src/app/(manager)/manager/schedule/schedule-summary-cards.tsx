import type { ScheduleSummary } from "@/app/(manager)/manager/schedule/_lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { summary: ScheduleSummary };

export function ScheduleSummaryCards({ summary }: Props) {
  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Today appointments
          </CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold tabular-nums">
          {summary.todaysAppointments}
        </CardContent>
      </Card>
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Today shifts
          </CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold tabular-nums">
          {summary.todaysShifts}
        </CardContent>
      </Card>
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Open availability
          </CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold tabular-nums">
          {summary.openAvailabilityCount}
        </CardContent>
      </Card>
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            No-shows this week
          </CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold tabular-nums text-destructive">
          {summary.noShowsThisWeek}
        </CardContent>
      </Card>
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Need attention
          </CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold tabular-nums">
          {summary.appointmentsNeedingAttention}
        </CardContent>
      </Card>
    </div>
  );
}
