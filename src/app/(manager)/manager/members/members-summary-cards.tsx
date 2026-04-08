import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MemberListStats } from "@/app/(manager)/manager/members/_lib/queries";

type Props = { stats: MemberListStats };

export function MembersSummaryCards({ stats }: Props) {
  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Active members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {stats.activeMembers}
          </p>
        </CardContent>
      </Card>
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            By membership
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Open Gym</span>
            <span className="font-medium tabular-nums">
              {stats.byMembership.open_gym}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Semi-Private</span>
            <span className="font-medium tabular-nums">
              {stats.byMembership.semi_private}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Private</span>
            <span className="font-medium tabular-nums">
              {stats.byMembership.private}
            </span>
          </div>
          {stats.byMembership.none > 0 ? (
            <div className="flex justify-between gap-2 text-amber-800 dark:text-amber-200">
              <span>No active period</span>
              <span className="font-medium tabular-nums">
                {stats.byMembership.none}
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Overdue payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums text-destructive">
            {stats.overdueCount}
          </p>
        </CardContent>
      </Card>
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            No active program
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {stats.noActiveProgram}
          </p>
        </CardContent>
      </Card>
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Needs trainer (Semi / Private)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {stats.needsTrainerAssignment}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
