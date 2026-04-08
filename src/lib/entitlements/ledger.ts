import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AppointmentRow,
  ClientMembershipPeriodRow,
  EntitlementLedgerEntryRow,
  MembershipTypeRow,
} from "@/types/database.types";

type ActorContext = {
  actorId: string | null;
  supabase: SupabaseClient;
};

type EntitlementSourceKind = EntitlementLedgerEntryRow["source_kind"];

export type EntitlementBalance = {
  includedMembership: number;
  purchasedAddOn: number;
  total: number;
};

async function getActiveMembership(
  supabase: SupabaseClient,
  clientId: string,
): Promise<{
  period: ClientMembershipPeriodRow | null;
  type: MembershipTypeRow | null;
}> {
  const [periodRes, typesRes] = await Promise.all([
    supabase
      .from("client_membership_periods")
      .select("*")
      .eq("client_id", clientId)
      .eq("status", "active")
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("membership_types").select("*"),
  ]);
  if (periodRes.error) throw new Error(periodRes.error.message);
  if (typesRes.error) throw new Error(typesRes.error.message);
  const period = (periodRes.data ?? null) as ClientMembershipPeriodRow | null;
  const type = period
    ? ((typesRes.data ?? []) as MembershipTypeRow[]).find(
        (t) => t.id === period.membership_type_id,
      ) ?? null
    : null;
  return { period, type };
}

function monthKeyFromDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function insertLedgerEntry(params: {
  supabase: SupabaseClient;
  entry: Omit<EntitlementLedgerEntryRow, "id" | "created_at">;
}): Promise<void> {
  const { supabase, entry } = params;
  const { error } = await supabase.from("entitlement_ledger_entries").insert(entry);
  if (error) {
    if (error.message.toLowerCase().includes("duplicate key")) return;
    throw new Error(error.message);
  }
}

async function syncCreditsAndAddOnsAwards(params: {
  supabase: SupabaseClient;
  clientId: string;
  actorId: string | null;
}) {
  const { supabase, clientId, actorId } = params;
  const [creditsRes, addOnsRes] = await Promise.all([
    supabase
      .from("client_training_credits")
      .select("*")
      .eq("client_id", clientId),
    supabase
      .from("trainer_session_add_ons")
      .select("*")
      .eq("client_id", clientId),
  ]);
  if (creditsRes.error) throw new Error(creditsRes.error.message);
  if (addOnsRes.error) throw new Error(addOnsRes.error.message);

  for (const row of creditsRes.data ?? []) {
    const source: EntitlementSourceKind =
      row.kind === "complimentary_30"
        ? "included_membership"
        : "purchased_add_on";
    await insertLedgerEntry({
      supabase,
      entry: {
        client_id: clientId,
        membership_period_id: row.membership_period_id ?? null,
        source_kind: source,
        event_kind: "award",
        delta: row.quantity,
        appointment_id: null,
        workout_session_id: null,
        credit_row_id: row.id,
        add_on_row_id: null,
        related_entry_id: null,
        note: "Seed award from client_training_credits",
        idempotency_key: `credit-award:${row.id}`,
        created_by: actorId,
      },
    });
  }

  for (const row of addOnsRes.data ?? []) {
    await insertLedgerEntry({
      supabase,
      entry: {
        client_id: clientId,
        membership_period_id: row.membership_period_id ?? null,
        source_kind: "purchased_add_on",
        event_kind: "award",
        delta: row.sessions_purchased,
        appointment_id: null,
        workout_session_id: null,
        credit_row_id: null,
        add_on_row_id: row.id,
        related_entry_id: null,
        note: "Seed award from trainer_session_add_ons",
        idempotency_key: `addon-award:${row.id}`,
        created_by: actorId,
      },
    });
  }
}

async function ensureMonthlySemiPrivateIncludedAward(params: {
  supabase: SupabaseClient;
  clientId: string;
  actorId: string | null;
  effectiveDate: Date;
}) {
  const { supabase, clientId, actorId, effectiveDate } = params;
  const { period, type } = await getActiveMembership(supabase, clientId);
  if (!period || type?.slug !== "semi_private") return;

  const m = monthKeyFromDate(effectiveDate);
  await insertLedgerEntry({
    supabase,
    entry: {
      client_id: clientId,
      membership_period_id: period.id,
      source_kind: "included_membership",
      event_kind: "award",
      delta: 1,
      appointment_id: null,
      workout_session_id: null,
      credit_row_id: null,
      add_on_row_id: null,
      related_entry_id: null,
      note: "Monthly included Semi-Private entitlement",
      idempotency_key: `semi-private-monthly-award:${period.id}:${m}`,
      created_by: actorId,
    },
  });
}

export async function getEntitlementBalance(
  supabase: SupabaseClient,
  clientId: string,
): Promise<EntitlementBalance> {
  const { data, error } = await supabase
    .from("entitlement_ledger_entries")
    .select("source_kind, delta")
    .eq("client_id", clientId);
  if (error) throw new Error(error.message);

  let included = 0;
  let addOn = 0;
  for (const row of (data ?? []) as Pick<
    EntitlementLedgerEntryRow,
    "source_kind" | "delta"
  >[]) {
    if (row.source_kind === "included_membership") included += row.delta;
    if (row.source_kind === "purchased_add_on") addOn += row.delta;
  }
  return {
    includedMembership: included,
    purchasedAddOn: addOn,
    total: included + addOn,
  };
}

async function ensureSemiPrivateEntitlementsReady(params: {
  supabase: SupabaseClient;
  clientId: string;
  actorId: string | null;
  effectiveDate: Date;
}) {
  const { supabase, clientId, actorId, effectiveDate } = params;
  await syncCreditsAndAddOnsAwards({ supabase, clientId, actorId });
  await ensureMonthlySemiPrivateIncludedAward({
    supabase,
    clientId,
    actorId,
    effectiveDate,
  });
}

export async function consumeEntitlementForAppointment(params: {
  context: ActorContext;
  appointment: Pick<AppointmentRow, "id" | "client_id" | "starts_at">;
  note?: string;
}): Promise<void> {
  const { context, appointment, note } = params;
  const { supabase, actorId } = context;
  const { period, type } = await getActiveMembership(supabase, appointment.client_id);
  if (!period) return;
  if (type?.slug !== "semi_private") return;

  await ensureSemiPrivateEntitlementsReady({
    supabase,
    clientId: appointment.client_id,
    actorId,
    effectiveDate: new Date(appointment.starts_at),
  });

  const consumeKey = `appointment-consume:${appointment.id}`;
  const { data: existingConsume, error: consumeErr } = await supabase
    .from("entitlement_ledger_entries")
    .select("id")
    .eq("idempotency_key", consumeKey)
    .maybeSingle();
  if (consumeErr) throw new Error(consumeErr.message);
  if (existingConsume) return;

  const balance = await getEntitlementBalance(supabase, appointment.client_id);
  let source: EntitlementSourceKind | null = null;
  if (balance.includedMembership > 0) {
    source = "included_membership";
  } else if (balance.purchasedAddOn > 0) {
    source = "purchased_add_on";
  }
  if (!source) {
    throw new Error(
      "No available Semi-Private entitlement balance. Add credits/session add-ons before booking.",
    );
  }

  await insertLedgerEntry({
    supabase,
    entry: {
      client_id: appointment.client_id,
      membership_period_id: period.id,
      source_kind: source,
      event_kind: "booking_consume",
      delta: -1,
      appointment_id: appointment.id,
      workout_session_id: null,
      credit_row_id: null,
      add_on_row_id: null,
      related_entry_id: null,
      note: note ?? "Consumed on appointment booking",
      idempotency_key: consumeKey,
      created_by: actorId,
    },
  });
}

export async function reverseEntitlementForCancelledAppointment(params: {
  context: ActorContext;
  appointment: Pick<AppointmentRow, "id" | "client_id">;
  note?: string;
}): Promise<void> {
  const { context, appointment, note } = params;
  const { supabase, actorId } = context;

  const reverseKey = `appointment-reversal:${appointment.id}`;
  const { data: existingReverse, error: revErr } = await supabase
    .from("entitlement_ledger_entries")
    .select("id")
    .eq("idempotency_key", reverseKey)
    .maybeSingle();
  if (revErr) throw new Error(revErr.message);
  if (existingReverse) return;

  const { data: consume, error: consumeErr } = await supabase
    .from("entitlement_ledger_entries")
    .select("*")
    .eq("appointment_id", appointment.id)
    .eq("event_kind", "booking_consume")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (consumeErr) throw new Error(consumeErr.message);
  if (!consume) return;

  const consumeRow = consume as EntitlementLedgerEntryRow;
  await insertLedgerEntry({
    supabase,
    entry: {
      client_id: appointment.client_id,
      membership_period_id: consumeRow.membership_period_id,
      source_kind: consumeRow.source_kind,
      event_kind: "booking_reversal",
      delta: 1,
      appointment_id: appointment.id,
      workout_session_id: null,
      credit_row_id: null,
      add_on_row_id: null,
      related_entry_id: consumeRow.id,
      note: note ?? "Reversal on appointment cancellation",
      idempotency_key: reverseKey,
      created_by: actorId,
    },
  });
}

export async function syncEntitlementAwardsForClients(params: {
  supabase: SupabaseClient;
  actorId: string | null;
  clientIds: string[];
}) {
  const { supabase, actorId, clientIds } = params;
  for (const clientId of clientIds) {
    await syncCreditsAndAddOnsAwards({
      supabase,
      clientId,
      actorId,
    });
  }
}

export async function fetchEntitlementLedgerForClient(params: {
  supabase: SupabaseClient;
  clientId: string;
  limit?: number;
}): Promise<EntitlementLedgerEntryRow[]> {
  const { supabase, clientId, limit = 40 } = params;
  const { data, error } = await supabase
    .from("entitlement_ledger_entries")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as EntitlementLedgerEntryRow[];
}
