import { PageHeader } from "@/components/dashboard/page-header";
import { parseScheduleSearchParams } from "@/app/(manager)/manager/schedule/_lib/parse-filters";
import { fetchScheduleData, type ScheduleData } from "@/app/(manager)/manager/schedule/_lib/queries";
import { ScheduleCreateForms } from "@/app/(manager)/manager/schedule/schedule-create-forms";
import { ScheduleFilters } from "@/app/(manager)/manager/schedule/schedule-filters";
import { ScheduleLists } from "@/app/(manager)/manager/schedule/schedule-lists";
import { ScheduleSummaryCards } from "@/app/(manager)/manager/schedule/schedule-summary-cards";
import { Card, CardContent } from "@/components/ui/card";
import { getManagerServerContext } from "@/lib/auth/manager-server";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ManagerSchedulePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filters = parseScheduleSearchParams(sp);
  const ctx = await getManagerServerContext();

  if (!ctx) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Sign in as a manager with Supabase configured.
        </CardContent>
      </Card>
    );
  }

  const qs = new URLSearchParams();
  qs.set("view", filters.view);
  qs.set("date", filters.date);
  qs.set("type", filters.type);
  if (filters.locationId) qs.set("locationId", filters.locationId);
  if (filters.trainerId) qs.set("trainerId", filters.trainerId);
  const returnTo = `/manager/schedule?${qs.toString()}`;

  let data: ScheduleData | null = null;
  let loadError: string | null = null;
  try {
    data = await fetchScheduleData(ctx.supabase, filters);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Could not load schedule data.";
    data = null;
  }

  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const error = typeof sp.error === "string" ? sp.error : null;
  const showShifts = filters.type === "all" || filters.type === "shifts";
  const showAvailability = filters.type === "all" || filters.type === "availability";
  const showAppointments = filters.type === "all" || filters.type === "appointments";

  return (
    <>
      <PageHeader
        title="Schedule"
        description="Manage staff shifts, trainer availability, and client appointments with conflict-aware controls."
      />

      {ok ? (
        <Card className="mb-4 border-emerald-500/40 bg-emerald-500/10">
          <CardContent className="pt-6 text-sm text-emerald-900 dark:text-emerald-100">
            {ok}
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="mb-4 border-destructive/40 bg-destructive/10">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {loadError || !data ? (
        <Card className="border-destructive/40">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {loadError ?? "Could not load schedule data."}
          </CardContent>
        </Card>
      ) : (
        <>
          <ScheduleSummaryCards summary={data.summary} />
          <ScheduleFilters filters={filters} data={data.filtersData} />
          <ScheduleCreateForms
            filtersData={data.filtersData}
            returnTo={returnTo}
            anchorDate={filters.date}
          />
          <ScheduleLists
            data={data}
            returnTo={returnTo}
            showShifts={showShifts}
            showAvailability={showAvailability}
            showAppointments={showAppointments}
          />
        </>
      )}
    </>
  );
}
