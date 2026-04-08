import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  invoiceIsOverdue,
  invoiceOpenBalanceCents,
} from "@/app/(manager)/manager/members/_lib/payment-helpers";
import type {
  ClientMembershipPeriodRow,
  ClientProgramRow,
  GymLocationRow,
  InvoiceRow,
  MembershipTypeRow,
  ProfileRow,
  TrainerClientAssignmentRow,
} from "@/types/database.types";

export type MemberListFilters = {
  q: string;
  membershipSlug: string | null;
  locationId: string | null;
  payment: "all" | "overdue" | "ok";
  sort: "newest" | "name" | "overdue";
};

export type MemberListRow = {
  profile: ProfileRow;
  location: Pick<GymLocationRow, "id" | "name" | "code"> | null;
  membershipType: Pick<MembershipTypeRow, "id" | "name" | "slug"> | null;
  membershipPeriod: ClientMembershipPeriodRow | null;
  trainer: Pick<ProfileRow, "id" | "display_name"> | null;
  overdue: boolean;
  openBalanceCents: number;
  worstInvoiceStatus: InvoiceRow["status"] | null;
  activeProgram: Pick<ClientProgramRow, "id" | "name" | "status"> | null;
};

export async function fetchGymLocations(
  supabase: SupabaseClient,
): Promise<GymLocationRow[]> {
  const { data, error } = await supabase
    .from("gym_locations")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as GymLocationRow[];
}

export async function fetchMembershipTypes(
  supabase: SupabaseClient,
): Promise<MembershipTypeRow[]> {
  const { data, error } = await supabase
    .from("membership_types")
    .select("*")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as MembershipTypeRow[];
}

export async function fetchTrainerOptions(
  supabase: SupabaseClient,
): Promise<Pick<ProfileRow, "id" | "display_name">[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("role", "trainer")
    .is("deleted_at", null)
    .order("display_name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<ProfileRow, "id" | "display_name">[];
}

export async function fetchMembersList(
  supabase: SupabaseClient,
  filters: MemberListFilters,
): Promise<MemberListRow[]> {
  let qb = supabase
    .from("profiles")
    .select("*")
    .eq("role", "client")
    .is("deleted_at", null);

  const search = filters.q.trim();
  if (search.length > 0) {
    const esc = search.replace(/%/g, "\\%").replace(/_/g, "\\_");
    qb = qb.or(`display_name.ilike.%${esc}%,email.ilike.%${esc}%`);
  }

  if (filters.locationId) {
    qb = qb.eq("primary_location_id", filters.locationId);
  }

  const { data: profiles, error: pErr } = await qb;
  if (pErr) throw new Error(pErr.message);
  const clients = (profiles ?? []) as ProfileRow[];
  if (clients.length === 0) return [];

  const ids = clients.map((c) => c.id);
  const locIds = [
    ...new Set(
      clients.map((c) => c.primary_location_id).filter(Boolean),
    ),
  ] as string[];

  const [
    locationsRes,
    periodsRes,
    typesRes,
    assignmentsRes,
    trainersRes,
    invoicesRes,
    programsRes,
  ] = await Promise.all([
    locIds.length
      ? supabase.from("gym_locations").select("id, name, code").in("id", locIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("client_membership_periods")
      .select("*")
      .in("client_id", ids),
    supabase.from("membership_types").select("*"),
    supabase
      .from("trainer_client_assignments")
      .select("*")
      .in("client_id", ids)
      .is("effective_to", null),
    supabase
      .from("profiles")
      .select("id, display_name")
      .eq("role", "trainer")
      .is("deleted_at", null),
    supabase
      .from("invoices")
      .select("*")
      .in("client_id", ids)
      .neq("status", "voided")
      .order("created_at", { ascending: false }),
    supabase
      .from("client_programs")
      .select("id, client_id, name, status")
      .in("client_id", ids)
      .eq("status", "active"),
  ]);

  if (locationsRes.error) throw new Error(locationsRes.error.message);
  if (periodsRes.error) throw new Error(periodsRes.error.message);
  if (typesRes.error) throw new Error(typesRes.error.message);
  if (assignmentsRes.error) throw new Error(assignmentsRes.error.message);
  if (trainersRes.error) throw new Error(trainersRes.error.message);
  if (invoicesRes.error) throw new Error(invoicesRes.error.message);
  if (programsRes.error) throw new Error(programsRes.error.message);

  const locations = (locationsRes.data ?? []) as Pick<
    GymLocationRow,
    "id" | "name" | "code"
  >[];
  const locationById = new Map(locations.map((l) => [l.id, l]));

  const types = (typesRes.data ?? []) as MembershipTypeRow[];
  const typeById = new Map(types.map((t) => [t.id, t]));

  const periods = (periodsRes.data ?? []) as ClientMembershipPeriodRow[];
  const activeByClient = new Map<string, ClientMembershipPeriodRow>();
  for (const p of periods) {
    if (p.status === "active") {
      activeByClient.set(p.client_id, p);
    }
  }

  const assignments = (assignmentsRes.data ?? []) as TrainerClientAssignmentRow[];
  const trainerProfiles = new Map(
    (trainersRes.data ?? []).map((t: { id: string; display_name: string }) => [
      t.id,
      t,
    ]),
  );

  /** Prefer primary open assignment, else any open */
  const trainerByClient = new Map<string, ProfileRow>();
  for (const c of clients) {
    const mine = assignments.filter((a) => a.client_id === c.id);
    const primary = mine.find((a) => a.is_primary);
    const pick = primary ?? mine[0];
    if (pick) {
      const tp = trainerProfiles.get(pick.trainer_id);
      if (tp) {
        trainerByClient.set(c.id, tp as ProfileRow);
      }
    }
  }

  const invoices = (invoicesRes.data ?? []) as InvoiceRow[];
  const invoicesByClient = new Map<string, InvoiceRow[]>();
  for (const inv of invoices) {
    const list = invoicesByClient.get(inv.client_id) ?? [];
    list.push(inv);
    invoicesByClient.set(inv.client_id, list);
  }

  const programs = (programsRes.data ?? []) as (Pick<
    ClientProgramRow,
    "id" | "client_id" | "name" | "status"
  >)[];
  const programByClient = new Map(
    programs.map((p) => [p.client_id, p]),
  );

  const rows: MemberListRow[] = clients.map((profile) => {
    const location = profile.primary_location_id
      ? locationById.get(profile.primary_location_id) ?? null
      : null;
    const membershipPeriod = activeByClient.get(profile.id) ?? null;
    const membershipType = membershipPeriod
      ? typeById.get(membershipPeriod.membership_type_id) ?? null
      : null;
    const trainer = trainerByClient.get(profile.id) ?? null;
    const invs = invoicesByClient.get(profile.id) ?? [];
    let overdue = false;
    let openBalanceCents = 0;
    let worst: InvoiceRow["status"] | null = null;
    const now = new Date();
    for (const inv of invs) {
      if (invoiceIsOverdue(inv, now)) overdue = true;
      openBalanceCents += invoiceOpenBalanceCents(inv);
      if (!worst) worst = inv.status;
    }
    const activeProgram = programByClient.get(profile.id) ?? null;

    return {
      profile,
      location,
      membershipType,
      membershipPeriod,
      trainer: trainer
        ? { id: trainer.id, display_name: trainer.display_name }
        : null,
      overdue,
      openBalanceCents,
      worstInvoiceStatus: worst,
      activeProgram,
    };
  });

  let filtered = rows;

  if (filters.membershipSlug) {
    filtered = filtered.filter(
      (r) => r.membershipType?.slug === filters.membershipSlug,
    );
  }

  if (filters.payment === "overdue") {
    filtered = filtered.filter((r) => r.overdue);
  } else if (filters.payment === "ok") {
    filtered = filtered.filter((r) => !r.overdue);
  }

  const compareName = (a: MemberListRow, b: MemberListRow) =>
    a.profile.display_name.localeCompare(b.profile.display_name, undefined, {
      sensitivity: "base",
    });

  if (filters.sort === "name") {
    filtered.sort(compareName);
  } else if (filters.sort === "newest") {
    filtered.sort(
      (a, b) =>
        new Date(b.profile.created_at).getTime() -
        new Date(a.profile.created_at).getTime(),
    );
  } else {
    filtered.sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a.openBalanceCents !== b.openBalanceCents) {
        return b.openBalanceCents - a.openBalanceCents;
      }
      return compareName(a, b);
    });
  }

  return filtered;
}

export type MemberListStats = {
  activeMembers: number;
  byMembership: Record<string, number>;
  overdueCount: number;
  noActiveProgram: number;
  needsTrainerAssignment: number;
};

export function computeMemberListStats(rows: MemberListRow[]): MemberListStats {
  const needsTrainerSlug = new Set(["semi_private", "private"]);
  const byMembership: Record<string, number> = {
    open_gym: 0,
    semi_private: 0,
    private: 0,
    none: 0,
  };
  let overdueCount = 0;
  let noActiveProgram = 0;
  let needsTrainerAssignment = 0;

  for (const r of rows) {
    const slug = r.membershipType?.slug;
    if (slug && slug in byMembership) {
      byMembership[slug] += 1;
    } else {
      byMembership.none += 1;
    }
    if (r.overdue) overdueCount += 1;
    if (!r.activeProgram) noActiveProgram += 1;
    if (
      slug &&
      needsTrainerSlug.has(slug) &&
      !r.trainer
    ) {
      needsTrainerAssignment += 1;
    }
  }

  return {
    activeMembers: rows.length,
    byMembership,
    overdueCount,
    noActiveProgram,
    needsTrainerAssignment,
  };
}

export async function fetchClientProfileForManager(
  supabase: SupabaseClient,
  memberId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", memberId)
    .eq("role", "client")
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as ProfileRow | null;
}
