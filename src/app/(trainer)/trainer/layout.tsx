import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireDashboardRole } from "@/lib/auth/dashboard-guard";
import { workspaceUserLabel } from "@/lib/auth/workspace-user-label";
import { getDashboardNav, ROUTES } from "@/lib/navigation/dashboard-nav";

export const dynamic = "force-dynamic";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireDashboardRole("trainer", ROUTES.trainer.dashboard);

  return (
    <DashboardShell
      role="trainer"
      title="Trainer"
      navItems={getDashboardNav("trainer")}
      userLabel={workspaceUserLabel(ctx)}
    >
      {children}
    </DashboardShell>
  );
}
