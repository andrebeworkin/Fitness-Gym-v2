import { parseProgramsSearchParams } from "@/app/(manager)/manager/programs/_lib/parse-filters";
import { fetchProgramsOverviewData } from "@/app/(manager)/manager/programs/_lib/queries";
import { ProgramsFilters } from "@/app/(manager)/manager/programs/programs-filters";
import { ProgramsLists } from "@/app/(manager)/manager/programs/programs-lists";
import { ProgramsSummaryCards } from "@/app/(manager)/manager/programs/programs-summary-cards";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getManagerServerContext } from "@/lib/auth/manager-server";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ManagerProgramsPage({ searchParams }: PageProps) {
  const ctx = await getManagerServerContext();
  const sp = await searchParams;
  if (!ctx) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Sign in as a manager with Supabase configured to load programs.
        </CardContent>
      </Card>
    );
  }

  const filters = parseProgramsSearchParams(sp);
  let errorMessage: string | null = null;
  let data: Awaited<ReturnType<typeof fetchProgramsOverviewData>> | null = null;
  try {
    data = await fetchProgramsOverviewData(ctx.supabase, filters);
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : "Failed to load programs.";
  }

  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <>
      <PageHeader
        title="Programs"
        description="Manager programming workspace for reusable templates, client assignments, and change-request review."
      />

      {ok ? (
        <Card className="mb-6 border-emerald-300/60 bg-emerald-50">
          <CardContent className="pt-6 text-sm text-emerald-900">{ok}</CardContent>
        </Card>
      ) : null}

      {error || errorMessage ? (
        <Card className="mb-6 border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 text-sm">
            <p className="font-medium text-destructive">Could not load programs</p>
            <p className="mt-1 text-muted-foreground">{error ?? errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      {data ? (
        <>
          <ProgramsSummaryCards summary={data.summary} />
          <ProgramsFilters
            locations={data.filtersData.locations}
            trainers={data.filtersData.trainers}
            membershipTypes={data.filtersData.membershipTypes}
            values={{
              q: filters.q,
              locationId: filters.locationId ?? "",
              trainerId: filters.trainerId ?? "",
              membership: filters.membershipSlug ?? "",
              status: filters.status,
            }}
          />
          <ProgramsLists
            templates={data.templates}
            clientPrograms={data.clientPrograms}
            pendingRequests={data.pendingRequests}
          />
        </>
      ) : null}
    </>
  );
}
