import { parseReportsSearchParams } from "@/app/(manager)/manager/reports/_lib/parse-filters";
import {
  fetchManagerReportsData,
  fetchReportsOptions,
} from "@/app/(manager)/manager/reports/_lib/queries";
import { ReportsBreakdowns } from "@/app/(manager)/manager/reports/reports-breakdowns";
import { ReportsFiltersForm } from "@/app/(manager)/manager/reports/reports-filters";
import { ReportsSummaryCards } from "@/app/(manager)/manager/reports/reports-summary-cards";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getManagerServerContext } from "@/lib/auth/manager-server";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ManagerReportsPage({ searchParams }: PageProps) {
  const ctx = await getManagerServerContext();
  const raw = await searchParams;
  const filters = parseReportsSearchParams(raw);

  if (!ctx) {
    return (
      <>
        <PageHeader
          title="Reports"
          description="Operational reporting is available to managers only."
        />
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Manager session required.
          </CardContent>
        </Card>
      </>
    );
  }

  const [options, reportData] = await Promise.all([
    fetchReportsOptions(ctx.supabase),
    fetchManagerReportsData({
      supabase: ctx.supabase,
      managerId: ctx.managerId,
      filters,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Manager operations reporting, utilization, adherence, and entitlement balances."
      />
      <ReportsFiltersForm filters={filters} options={options} />
      <ReportsSummaryCards summary={reportData.summary} />
      <ReportsBreakdowns data={reportData} />
    </div>
  );
}
