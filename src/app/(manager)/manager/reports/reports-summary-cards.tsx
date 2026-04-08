import type { ReportsData } from "@/app/(manager)/manager/reports/_lib/queries";
import { StatCard } from "@/components/dashboard/stat-card";

type Props = {
  summary: ReportsData["summary"];
};

export function ReportsSummaryCards({ summary }: Readonly<Props>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard label="Active members" value={String(summary.activeMembers)} />
      <StatCard label="Overdue payments" value={String(summary.overduePayments)} />
      <StatCard label="Trainer utilization" value={`${summary.trainerUtilizationPct}%`} />
      <StatCard label="Appointments in range" value={String(summary.totalAppointments)} />
      <StatCard label="Completed sessions" value={String(summary.completedSessions)} />
      <StatCard label="No-shows" value={String(summary.noShows)} />
      <StatCard
        label="No active program"
        value={String(summary.clientsNoActiveProgram)}
      />
      <StatCard
        label="No trainer assigned"
        value={String(summary.clientsNoTrainerAssigned)}
      />
      <StatCard
        label="Low adherence clients"
        value={String(summary.lowAdherenceCount)}
      />
    </div>
  );
}
