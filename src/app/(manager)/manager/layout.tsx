import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireDashboardRole } from "@/lib/auth/dashboard-guard";
import { workspaceUserLabel } from "@/lib/auth/workspace-user-label";
import { getDashboardNav, ROUTES } from "@/lib/navigation/dashboard-nav";

export const dynamic = "force-dynamic";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireDashboardRole("manager", ROUTES.manager.dashboard);

  return (
    <DashboardShell
      role="manager"
      title="Manager"
      navItems={getDashboardNav("manager")}
      userLabel={workspaceUserLabel(ctx)}
    >
      {children}
    </DashboardShell>
  );
}
