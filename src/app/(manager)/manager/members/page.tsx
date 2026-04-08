import { PageHeader } from "@/components/dashboard/page-header";
import { parseMemberListSearchParams } from "@/app/(manager)/manager/members/_lib/parse-filters";
import {
  computeMemberListStats,
  fetchGymLocations,
  fetchMembersList,
  fetchMembershipTypes,
  type MemberListRow,
} from "@/app/(manager)/manager/members/_lib/queries";
import type { GymLocationRow, MembershipTypeRow } from "@/types/database.types";
import { MembersFilters } from "@/app/(manager)/manager/members/members-filters";
import { MembersSummaryCards } from "@/app/(manager)/manager/members/members-summary-cards";
import { MembersTable } from "@/app/(manager)/manager/members/members-table";
import { getManagerServerContext } from "@/lib/auth/manager-server";
import { Card, CardContent } from "@/components/ui/card";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ManagerMembersPage({ searchParams }: PageProps) {
  const ctx = await getManagerServerContext();
  const sp = await searchParams;

  if (!ctx) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Sign in as a manager with Supabase configured to load members.
        </CardContent>
      </Card>
    );
  }

  const filters = parseMemberListSearchParams(sp);

  let rows: MemberListRow[] = [];
  let locations: GymLocationRow[] = [];
  let membershipTypes: MembershipTypeRow[] = [];
  let errorMessage: string | null = null;

  try {
    ;[rows, locations, membershipTypes] = await Promise.all([
      fetchMembersList(ctx.supabase, filters),
      fetchGymLocations(ctx.supabase),
      fetchMembershipTypes(ctx.supabase),
    ]);
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : "Failed to load members.";
  }

  const stats = computeMemberListStats(rows);

  return (
    <>
      <PageHeader
        title="Members"
        description="Live roster with memberships, assignments, programs, and payment flags. History is preserved when you change membership."
      />

      {errorMessage ? (
        <Card className="mb-6 border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 text-sm">
            <p className="font-medium text-destructive">Could not load data</p>
            <p className="mt-1 text-muted-foreground">{errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <MembersSummaryCards stats={stats} />

      <MembersFilters
        locations={locations}
        membershipTypes={membershipTypes}
        values={{
          q: filters.q,
          membership: filters.membershipSlug ?? "",
          locationId: filters.locationId ?? "",
          payment: filters.payment,
          sort: filters.sort,
        }}
      />

      <MembersTable rows={rows} />
    </>
  );
}
