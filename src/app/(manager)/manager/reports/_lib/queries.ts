import type { SupabaseClient } from "@supabase/supabase-js";

import type { ReportsFilters } from "@/app/(manager)/manager/reports/_lib/parse-filters";
import { invoiceIsOverdue } from "@/app/(manager)/manager/members/_lib/payment-helpers";
import { syncEntitlementAwardsForClients } from "@/lib/entitlements/ledger";
import type {
  AppointmentRow,
  ClientMembershipPeriodRow,
  ClientProgramRow,
  EntitlementLedgerEntryRow,
  GymLocationRow,
  InvoiceRow,
  MembershipTypeRow,
  ProfileRow,
  TrainerAvailabilitySlotRow,
  TrainerClientAssignmentRow,
  WorkoutSessionRow,
} from "@/types/database.types";

export type ReportsOptions = {
  locations: Pick<GymLocationRow, "id" | "name">[];
  trainers: Pick<ProfileRow, "id" | "display_name">[];
};

export type ReportsData = {
  summary: {
    activeMembers: number;
    overduePayments: number;
    trainerUtilizationPct: number;
    totalAppointments: number;
    completedSessions: number;
    noShows: number;
    clientsNoActiveProgram: number;
    clientsNoTrainerAssigned: number;
    lowAdherenceCount: number;
  };
  membersByMembershipType: { label: string; count: number }[];
  rosterHealth: {
    clientId: string;
    name: string;
    membershipType: string;
    hasTrainer: boolean;
    hasActiveProgram: boolean;
    overduePayment: boolean;
  }[];
  paymentSummary: { status: string; count: number; openBalanceCents: number }[];
  trainerWorkload: {
    trainerId: string;
    trainerName: string;
    scheduled: number;
    completed: number;
    noShow: number;
    availabilitySlots: number;
    utilizationPct: number;
  }[];
  appointmentOutcomes: { status: string; count: number }[];
  programCoverage: {
    clientId: string;
    name: string;
    hasActiveProgram: boolean;
    programEndsOn: string | null;
  }[];
  sessionAdherence: {
    clientId: string;
    name: string;
    sessionsLast14Days: number;
    sessionsLast30Days: number;
  }[];
  entitlementBalances: {
    clientId: string;
    name: string;
    includedBalance: number;
    addOnBalance: number;
    totalBalance: number;
    latestEventAt: string | null;
  }[];
  upcomingProgramEndDates: {
    clientId: string;
    name: string;
    programName: string;
    endDate: string;
  }[];
};

function toIsoBounds(filters: ReportsFilters): { fromIso: string; toIsoExclusive: string } {
  const from = new Date(`${filters.from}T00:00:00.000Z`);
  const to = new Date(`${filters.to}T00:00:00.000Z`);
  to.setUTCDate(to.getUTCDate() + 1);
  return { fromIso: from.toISOString(), toIsoExclusive: to.toISOString() };
}

function ymdPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function fetchReportsOptions(
  supabase: SupabaseClient,
): Promise<ReportsOptions> {
  const [locRes, trRes] = await Promise.all([
    supabase.from("gym_locations").select("id, name").order("name"),
    supabase
      .from("profiles")
      .select("id, display_name")
      .eq("role", "trainer")
      .order("display_name"),
  ]);
  if (locRes.error) throw new Error(locRes.error.message);
  if (trRes.error) throw new Error(trRes.error.message);
  return {
    locations: (locRes.data ?? []) as ReportsOptions["locations"],
    trainers: (trRes.data ?? []) as ReportsOptions["trainers"],
  };
}

export async function fetchManagerReportsData(params: {
  supabase: SupabaseClient;
  managerId: string;
  filters: ReportsFilters;
}): Promise<ReportsData> {
  const { supabase, managerId, filters } = params;
  const { fromIso, toIsoExclusive } = toIsoBounds(filters);
  const adherence14Start = new Date();
  adherence14Start.setDate(adherence14Start.getDate() - 14);
  const adherence30Start = new Date();
  adherence30Start.setDate(adherence30Start.getDate() - 30);

  const [profilesRes, periodsRes, membershipTypesRes, invoicesRes, activeProgramsRes, assignmentsRes] =
    await Promise.all([
      supabase.from("profiles").select("id, display_name, role, primary_location_id"),
      supabase
        .from("client_membership_periods")
        .select("*")
        .eq("status", "active"),
      supabase.from("membership_types").select("*"),
      supabase
        .from("invoices")
        .select("*")
        .order("issued_at", { ascending: false })
        .limit(1000),
      supabase.from("client_programs").select("*").eq("status", "active"),
      supabase
        .from("trainer_client_assignments")
        .select("*")
        .is("effective_to", null),
    ]);
  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (periodsRes.error) throw new Error(periodsRes.error.message);
  if (membershipTypesRes.error) throw new Error(membershipTypesRes.error.message);
  if (invoicesRes.error) throw new Error(invoicesRes.error.message);
  if (activeProgramsRes.error) throw new Error(activeProgramsRes.error.message);
  if (assignmentsRes.error) throw new Error(assignmentsRes.error.message);

  let appointmentsQ = supabase
    .from("appointments")
    .select("*")
    .gte("starts_at", fromIso)
    .lt("starts_at", toIsoExclusive);
  let availabilityQ = supabase
    .from("trainer_availability_slots")
    .select("*")
    .gte("starts_at", fromIso)
    .lt("starts_at", toIsoExclusive);
  let sessionsQ = supabase
    .from("workout_sessions")
    .select("*")
    .gte("started_at", fromIso)
    .lt("started_at", toIsoExclusive);

  if (filters.locationId) {
    appointmentsQ = appointmentsQ.eq("location_id", filters.locationId);
    availabilityQ = availabilityQ.eq("location_id", filters.locationId);
  }
  if (filters.trainerId) {
    appointmentsQ = appointmentsQ.eq("primary_trainer_id", filters.trainerId);
    availabilityQ = availabilityQ.eq("trainer_id", filters.trainerId);
    sessionsQ = sessionsQ.eq("trainer_id", filters.trainerId);
  }

  const [appointmentsRes, availabilityRes, sessionsRes, sessions14Res, sessions30Res] =
    await Promise.all([
      appointmentsQ,
      availabilityQ,
      sessionsQ,
      supabase
        .from("workout_sessions")
        .select("id, client_id")
        .gte("started_at", adherence14Start.toISOString()),
      supabase
        .from("workout_sessions")
        .select("id, client_id")
        .gte("started_at", adherence30Start.toISOString()),
    ]);
  if (appointmentsRes.error) throw new Error(appointmentsRes.error.message);
  if (availabilityRes.error) throw new Error(availabilityRes.error.message);
  if (sessionsRes.error) throw new Error(sessionsRes.error.message);
  if (sessions14Res.error) throw new Error(sessions14Res.error.message);
  if (sessions30Res.error) throw new Error(sessions30Res.error.message);

  const allProfiles = (profilesRes.data ?? []) as Pick<
    ProfileRow,
    "id" | "display_name" | "role" | "primary_location_id"
  >[];
  const clients = allProfiles.filter((p) => p.role === "client");
  const trainerById = new Map(
    allProfiles.filter((p) => p.role === "trainer").map((p) => [p.id, p.display_name]),
  );
  const clientById = new Map(clients.map((p) => [p.id, p]));
  const typeById = new Map(
    ((membershipTypesRes.data ?? []) as MembershipTypeRow[]).map((m) => [m.id, m]),
  );
  const activePeriods = (periodsRes.data ?? []) as ClientMembershipPeriodRow[];
  const activePrograms = (activeProgramsRes.data ?? []) as ClientProgramRow[];
  const activeAssignments = (assignmentsRes.data ?? []) as TrainerClientAssignmentRow[];
  const appointments = (appointmentsRes.data ?? []) as AppointmentRow[];
  const availability = (availabilityRes.data ?? []) as TrainerAvailabilitySlotRow[];
  const sessions = (sessionsRes.data ?? []) as WorkoutSessionRow[];
  const invoices = (invoicesRes.data ?? []) as InvoiceRow[];

  const membershipTypeCounts = new Map<string, number>();
  const activeMemberClientIds = new Set<string>();
  for (const p of activePeriods) {
    const client = clientById.get(p.client_id);
    if (!client) continue;
    if (filters.locationId && client.primary_location_id !== filters.locationId) continue;
    const type = typeById.get(p.membership_type_id)?.name ?? "Unknown";
    membershipTypeCounts.set(type, (membershipTypeCounts.get(type) ?? 0) + 1);
    activeMemberClientIds.add(p.client_id);
  }
  const membersByMembershipType = [...membershipTypeCounts.entries()].map(
    ([label, count]) => ({ label, count }),
  );

  const now = new Date();
  const overdueClientIds = new Set<string>();
  const paymentSummaryMap = new Map<string, { count: number; openBalanceCents: number }>();
  for (const inv of invoices) {
    const status = inv.status;
    const current = paymentSummaryMap.get(status) ?? { count: 0, openBalanceCents: 0 };
    current.count += 1;
    current.openBalanceCents += Math.max(inv.amount_cents - inv.amount_paid_cents, 0);
    paymentSummaryMap.set(status, current);
    if (invoiceIsOverdue(inv, now)) overdueClientIds.add(inv.client_id);
  }

  const activeProgramByClient = new Map(activePrograms.map((p) => [p.client_id, p]));
  const assignedClientIds = new Set(activeAssignments.map((a) => a.client_id));

  const appointmentOutcomeMap = new Map<string, number>();
  const trainerWorkloadMap = new Map<
    string,
    { scheduled: number; completed: number; noShow: number; availabilitySlots: number }
  >();
  for (const slot of availability) {
    const cur = trainerWorkloadMap.get(slot.trainer_id) ?? {
      scheduled: 0,
      completed: 0,
      noShow: 0,
      availabilitySlots: 0,
    };
    cur.availabilitySlots += 1;
    trainerWorkloadMap.set(slot.trainer_id, cur);
  }
  for (const appt of appointments) {
    appointmentOutcomeMap.set(
      appt.status,
      (appointmentOutcomeMap.get(appt.status) ?? 0) + 1,
    );
    const cur = trainerWorkloadMap.get(appt.primary_trainer_id) ?? {
      scheduled: 0,
      completed: 0,
      noShow: 0,
      availabilitySlots: 0,
    };
    if (appt.status === "completed") cur.completed += 1;
    else if (appt.status === "no_show") cur.noShow += 1;
    else cur.scheduled += 1;
    trainerWorkloadMap.set(appt.primary_trainer_id, cur);
  }
  const trainerWorkload = [...trainerWorkloadMap.entries()]
    .map(([trainerId, row]) => {
      const utilizationPct =
        row.availabilitySlots > 0
          ? Math.round((row.completed / row.availabilitySlots) * 100)
          : 0;
      return {
        trainerId,
        trainerName: trainerById.get(trainerId) ?? "Trainer",
        scheduled: row.scheduled,
        completed: row.completed,
        noShow: row.noShow,
        availabilitySlots: row.availabilitySlots,
        utilizationPct,
      };
    })
    .sort((a, b) => b.completed - a.completed);

  const sessions14 = sessions14Res.data ?? [];
  const sessions30 = sessions30Res.data ?? [];
  const sessions14ByClient = new Map<string, number>();
  const sessions30ByClient = new Map<string, number>();
  for (const s of sessions14) {
    sessions14ByClient.set(s.client_id, (sessions14ByClient.get(s.client_id) ?? 0) + 1);
  }
  for (const s of sessions30) {
    sessions30ByClient.set(s.client_id, (sessions30ByClient.get(s.client_id) ?? 0) + 1);
  }

  const rosterHealth = [...activeMemberClientIds]
    .map((clientId) => {
      const client = clientById.get(clientId);
      if (!client) return null;
      const period = activePeriods.find((p) => p.client_id === clientId) ?? null;
      return {
        clientId,
        name: client.display_name,
        membershipType: period ? typeById.get(period.membership_type_id)?.name ?? "Unknown" : "—",
        hasTrainer: assignedClientIds.has(clientId),
        hasActiveProgram: activeProgramByClient.has(clientId),
        overduePayment: overdueClientIds.has(clientId),
      };
    })
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .sort((a, b) => a.name.localeCompare(b.name));

  const programCoverage = [...activeMemberClientIds]
    .map((clientId) => {
      const c = clientById.get(clientId);
      if (!c) return null;
      const p = activeProgramByClient.get(clientId);
      return {
        clientId,
        name: c.display_name,
        hasActiveProgram: Boolean(p),
        programEndsOn: p?.end_date ?? null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .sort((a, b) => Number(a.hasActiveProgram) - Number(b.hasActiveProgram));

  const sessionAdherence = [...activeMemberClientIds]
    .map((clientId) => ({
      clientId,
      name: clientById.get(clientId)?.display_name ?? "Client",
      sessionsLast14Days: sessions14ByClient.get(clientId) ?? 0,
      sessionsLast30Days: sessions30ByClient.get(clientId) ?? 0,
    }))
    .sort((a, b) => a.sessionsLast14Days - b.sessionsLast14Days);

  const semiPrivateClientIds = activePeriods
    .filter((p) => typeById.get(p.membership_type_id)?.slug === "semi_private")
    .map((p) => p.client_id);
  await syncEntitlementAwardsForClients({
    supabase,
    actorId: managerId,
    clientIds: [...new Set(semiPrivateClientIds)],
  });
  let ledgerRows: EntitlementLedgerEntryRow[] = [];
  if (semiPrivateClientIds.length > 0) {
    const { data: ledgerRes, error: ledgerErr } = await supabase
      .from("entitlement_ledger_entries")
      .select("*")
      .in("client_id", [...new Set(semiPrivateClientIds)])
      .order("created_at", { ascending: false });
    if (ledgerErr) throw new Error(ledgerErr.message);
    ledgerRows = (ledgerRes ?? []) as EntitlementLedgerEntryRow[];
  }
  const entitlementBalances = [...new Set(semiPrivateClientIds)]
    .map((clientId) => {
      const rows = ledgerRows.filter((r) => r.client_id === clientId);
      const included = rows
        .filter((r) => r.source_kind === "included_membership")
        .reduce((sum, r) => sum + r.delta, 0);
      const addOn = rows
        .filter((r) => r.source_kind === "purchased_add_on")
        .reduce((sum, r) => sum + r.delta, 0);
      return {
        clientId,
        name: clientById.get(clientId)?.display_name ?? "Client",
        includedBalance: included,
        addOnBalance: addOn,
        totalBalance: included + addOn,
        latestEventAt: rows[0]?.created_at ?? null,
      };
    })
    .sort((a, b) => a.totalBalance - b.totalBalance);

  const appointmentOutcomes = [...appointmentOutcomeMap.entries()].map(([status, count]) => ({
    status,
    count,
  }));

  const paymentSummary = [...paymentSummaryMap.entries()].map(([status, x]) => ({
    status,
    count: x.count,
    openBalanceCents: x.openBalanceCents,
  }));

  const upcomingProgramEndDates = activePrograms
    .filter((p) => Boolean(p.end_date))
    .filter((p) => (p.end_date ?? "") >= ymdPlusDays(0) && (p.end_date ?? "") <= ymdPlusDays(21))
    .map((p) => ({
      clientId: p.client_id,
      name: clientById.get(p.client_id)?.display_name ?? "Client",
      programName: p.name,
      endDate: p.end_date as string,
    }))
    .sort((a, b) => a.endDate.localeCompare(b.endDate));

  const completedSessions = sessions.filter((s) => s.status === "completed").length;
  const noShows = appointments.filter((a) => a.status === "no_show").length;
  const totalAvailSlots = availability.length;
  const trainerUtilizationPct =
    totalAvailSlots > 0
      ? Math.round(
          (appointments.filter((a) => a.status === "completed").length / totalAvailSlots) * 100,
        )
      : 0;

  const clientsNoActiveProgram = [...activeMemberClientIds].filter(
    (id) => !activeProgramByClient.has(id),
  ).length;

  const applicableWithoutTrainer = activePeriods
    .filter((p) => {
      const slug = typeById.get(p.membership_type_id)?.slug;
      return slug === "private" || slug === "semi_private";
    })
    .filter((p) => !assignedClientIds.has(p.client_id)).length;

  return {
    summary: {
      activeMembers: activeMemberClientIds.size,
      overduePayments: overdueClientIds.size,
      trainerUtilizationPct,
      totalAppointments: appointments.length,
      completedSessions,
      noShows,
      clientsNoActiveProgram,
      clientsNoTrainerAssigned: applicableWithoutTrainer,
      lowAdherenceCount: sessionAdherence.filter((s) => s.sessionsLast14Days < 2).length,
    },
    membersByMembershipType,
    rosterHealth,
    paymentSummary,
    trainerWorkload,
    appointmentOutcomes,
    programCoverage,
    sessionAdherence,
    entitlementBalances,
    upcomingProgramEndDates,
  };
}
