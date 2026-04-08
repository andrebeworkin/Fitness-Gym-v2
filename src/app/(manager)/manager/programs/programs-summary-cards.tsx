import { StatCard } from "@/components/dashboard/stat-card";
import type { ProgramsSummary } from "@/app/(manager)/manager/programs/_lib/queries";

type Props = {
  summary: ProgramsSummary;
};

export function ProgramsSummaryCards({ summary }: Readonly<Props>) {
  return (
    <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <StatCard
        label="Active programs"
        value={summary.activePrograms.toString()}
        hint="Current active client plans"
      />
      <StatCard
        label="Templates"
        value={summary.templateCount.toString()}
        hint="Reusable non-archived templates"
      />
      <StatCard
        label="Clients without program"
        value={summary.clientsWithNoActiveProgram.toString()}
        hint="No active plan assigned"
      />
      <StatCard
        label="Pending requests"
        value={summary.pendingChangeRequests.toString()}
        hint="Trainer change requests awaiting review"
      />
      <StatCard
        label="Ending soon"
        value={summary.endingSoon.toString()}
        hint="Active programs ending in 14 days"
      />
    </section>
  );
}
