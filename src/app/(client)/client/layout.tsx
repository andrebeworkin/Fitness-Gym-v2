import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireDashboardRole } from "@/lib/auth/dashboard-guard";
import { workspaceUserLabel } from "@/lib/auth/workspace-user-label";
import { getDashboardNav, ROUTES } from "@/lib/navigation/dashboard-nav";

export const dynamic = "force-dynamic";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireDashboardRole("client", ROUTES.client.dashboard);

  return (
    <DashboardShell
      role="client"
      title="Member"
      navItems={getDashboardNav("client")}
      userLabel={workspaceUserLabel(ctx)}
    >
      {children}
    </DashboardShell>
  );
}
