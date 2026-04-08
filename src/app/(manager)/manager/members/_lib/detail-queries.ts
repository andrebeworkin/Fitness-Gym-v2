import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  invoiceIsOverdue,
  invoiceOpenBalanceCents,
} from "@/app/(manager)/manager/members/_lib/payment-helpers";
import {
  fetchEntitlementLedgerForClient,
  getEntitlementBalance,
  syncEntitlementAwardsForClients,
} from "@/lib/entitlements/ledger";
import type {
  AppointmentRow,
  ClientAssessmentRow,
  ClientGoalRow,
  ClientMembershipPeriodRow,
  ClientProgramRow,
  ClientTrainingPreferencesRow,
  EmergencyContactRow,
  FinancialDocumentRow,
  GymLocationRow,
  InvoiceRow,
  MembershipTypeRow,
  PaymentRecordRow,
  ProfileRow,
  ProgressPhotoRow,
  ReceiptRow,
  StaffNoteRow,
  TrainerClientAssignmentRow,
} from "@/types/database.types";

export type MembershipPeriodWithType = ClientMembershipPeriodRow & {
  membership_type: MembershipTypeRow | null;
};

export type TrainerAssignmentWithName = TrainerClientAssignmentRow & {
  trainer: Pick<ProfileRow, "id" | "display_name"> | null;
};

export type InvoiceWithExtras = InvoiceRow & {
  payment_records: PaymentRecordRow[];
  receipts: Pick<ReceiptRow, "id" | "invoice_id">[];
  financial_documents: Pick<FinancialDocumentRow, "id" | "kind">[];
};

export type MemberDetailBundle = {
  profile: ProfileRow;
  location: GymLocationRow | null;
  emergencyContacts: EmergencyContactRow[];
  preferences: ClientTrainingPreferencesRow | null;
  activePeriod: MembershipPeriodWithType | null;
  membershipHistory: MembershipPeriodWithType[];
  membershipChanges: {
    id: string;
    changed_at: string;
    reason: string | null;
    from_slug: string | null;
    to_slug: string | null;
  }[];
  trainerAssignments: TrainerAssignmentWithName[];
  activeTrainer: Pick<ProfileRow, "id" | "display_name"> | null;
  goals: ClientGoalRow[];
  latestAssessment: ClientAssessmentRow | null;
  progressPhotoMeta: { count: number; latestTakenOn: string | null };
  appointments: AppointmentRow[];
  appointmentTrainerNames: Record<string, string>;
  recentSessions: {
    id: string;
    started_at: string;
    status: string;
    completed_at: string | null;
  }[];
  activeProgram: ClientProgramRow | null;
  programWeekCount: number;
  latestProgramSessionAt: string | null;
  programAuthor: Pick<ProfileRow, "id" | "display_name"> | null;
  invoices: InvoiceWithExtras[];
  paymentSummary: {
    overdue: boolean;
    openBalanceCents: number;
    openInvoiceCount: number;
  };
  staffNotes: (StaffNoteRow & {
    author: Pick<ProfileRow, "display_name"> | null;
  })[];
  entitlementSummary: {
    includedBalance: number;
    addOnBalance: number;
    total: number;
  };
  entitlementHistory: {
    id: string;
    created_at: string;
    source_kind: string;
    event_kind: string;
    delta: number;
    appointment_id: string | null;
    workout_session_id: string | null;
    note: string | null;
  }[];
};

export async function fetchMemberDetailBundle(
  supabase: SupabaseClient,
  clientId: string,
): Promise<MemberDetailBundle | null> {
  const { data: profile, error: pe } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", clientId)
    .eq("role", "client")
    .is("deleted_at", null)
    .maybeSingle();
  if (pe) throw new Error(pe.message);
  if (!profile) return null;

  const p = profile as ProfileRow;

  const [
    locRes,
    ecRes,
    prefRes,
    periodsRes,
    typesRes,
    histRes,
    assignRes,
    goalsRes,
    assessRes,
    photosRes,
    apptRes,
    sessRes,
    progRes,
    invRes,
    notesRes,
  ] = await Promise.all([
    p.primary_location_id
      ? supabase
          .from("gym_locations")
          .select("*")
          .eq("id", p.primary_location_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("emergency_contacts")
      .select("*")
      .eq("client_id", clientId)
      .order("is_primary", { ascending: false }),
    supabase
      .from("client_training_preferences")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle(),
    supabase
      .from("client_membership_periods")
      .select("*")
      .eq("client_id", clientId)
      .order("effective_from", { ascending: false }),
    supabase.from("membership_types").select("*"),
    supabase
      .from("membership_change_history")
      .select("*")
      .eq("client_id", clientId)
      .order("changed_at", { ascending: false })
      .limit(50),
    supabase
      .from("trainer_client_assignments")
      .select("*")
      .eq("client_id", clientId)
      .order("effective_from", { ascending: false }),
    supabase
      .from("client_goals")
      .select("*")
      .eq("client_id", clientId)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("client_assessments")
      .select("*")
      .eq("client_id", clientId)
      .order("assessed_at", { ascending: false })
      .limit(1),
    supabase
      .from("progress_photos")
      .select("id, taken_on")
      .eq("client_id", clientId)
      .order("taken_on", { ascending: false }),
    supabase
      .from("appointments")
      .select("*")
      .eq("client_id", clientId)
      .order("starts_at", { ascending: false })
      .limit(12),
    supabase
      .from("workout_sessions")
      .select("id, started_at, status, completed_at")
      .eq("client_id", clientId)
      .order("started_at", { ascending: false })
      .limit(12),
    supabase
      .from("client_programs")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("staff_notes")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  if (locRes.error) throw new Error(locRes.error.message);
  if (ecRes.error) throw new Error(ecRes.error.message);
  if (prefRes.error) throw new Error(prefRes.error.message);
  if (periodsRes.error) throw new Error(periodsRes.error.message);
  if (typesRes.error) throw new Error(typesRes.error.message);
  if (histRes.error) throw new Error(histRes.error.message);
  if (assignRes.error) throw new Error(assignRes.error.message);
  if (goalsRes.error) throw new Error(goalsRes.error.message);
  if (assessRes.error) throw new Error(assessRes.error.message);
  if (photosRes.error) throw new Error(photosRes.error.message);
  if (apptRes.error) throw new Error(apptRes.error.message);
  if (sessRes.error) throw new Error(sessRes.error.message);
  if (progRes.error) throw new Error(progRes.error.message);
  if (invRes.error) throw new Error(invRes.error.message);
  if (notesRes.error) throw new Error(notesRes.error.message);

  const types = (typesRes.data ?? []) as MembershipTypeRow[];
  const typeById = new Map(types.map((t) => [t.id, t]));

  const periods = (periodsRes.data ?? []) as ClientMembershipPeriodRow[];
  const membershipHistory: MembershipPeriodWithType[] = periods.map((row) => ({
    ...row,
    membership_type: typeById.get(row.membership_type_id) ?? null,
  }));
  const activePeriod =
    membershipHistory.find((m) => m.status === "active") ?? null;

  const trainerIds = [
    ...new Set(
      (assignRes.data as TrainerClientAssignmentRow[]).map((a) => a.trainer_id),
    ),
  ];
  let trainerMap = new Map<string, Pick<ProfileRow, "id" | "display_name">>();
  if (trainerIds.length > 0) {
    const { data: tr, error: te } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", trainerIds);
    if (te) throw new Error(te.message);
    trainerMap = new Map(
      (tr ?? []).map((t) => [t.id, t as Pick<ProfileRow, "id" | "display_name">]),
    );
  }

  const trainerAssignments: TrainerAssignmentWithName[] = (
    assignRes.data as TrainerClientAssignmentRow[]
  ).map((a) => ({
    ...a,
    trainer: trainerMap.get(a.trainer_id) ?? null,
  }));

  const openAssign = trainerAssignments.find((a) => a.effective_to === null);
  const activeTrainer = openAssign?.trainer ?? null;

  const rawHist = histRes.data as {
    id: string;
    changed_at: string;
    reason: string | null;
    from_membership_type_id: string | null;
    to_membership_type_id: string;
  }[];

  const membershipChanges = rawHist.map((h) => ({
    id: h.id,
    changed_at: h.changed_at,
    reason: h.reason,
    from_slug: h.from_membership_type_id
      ? typeById.get(h.from_membership_type_id)?.slug ?? null
      : null,
    to_slug: typeById.get(h.to_membership_type_id)?.slug ?? null,
  }));

  const programs = (progRes.data ?? []) as ClientProgramRow[];
  const activeProgram = programs.find((cp) => cp.status === "active") ?? null;

  let programWeekCount = 0;
  let latestProgramSessionAt: string | null = null;
  let programAuthor: Pick<ProfileRow, "id" | "display_name"> | null = null;

  if (activeProgram) {
    const { count, error: wcErr } = await supabase
      .from("client_program_weeks")
      .select("id", { count: "exact", head: true })
      .eq("program_id", activeProgram.id);
    if (wcErr) throw new Error(wcErr.message);
    programWeekCount = count ?? 0;

    const { data: sessOnProg, error: spErr } = await supabase
      .from("workout_sessions")
      .select("started_at")
      .eq("client_id", clientId)
      .eq("client_program_id", activeProgram.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (spErr) throw new Error(spErr.message);
    latestProgramSessionAt = sessOnProg?.started_at ?? null;

    const authorId =
      activeProgram.author_kind === "manager"
        ? activeProgram.manager_author_id
        : activeProgram.primary_trainer_id;
    if (authorId) {
      const { data: au, error: ae } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("id", authorId)
        .maybeSingle();
      if (ae) throw new Error(ae.message);
      programAuthor = au as Pick<ProfileRow, "id" | "display_name"> | null;
    }
  }

  const invoicesRaw = (invRes.data ?? []) as InvoiceRow[];
  const invoiceIds = invoicesRaw.map((i) => i.id);

  const paymentsByInvoice = new Map<string, PaymentRecordRow[]>();
  const receiptsByInvoice = new Map<
    string,
    Pick<ReceiptRow, "id" | "invoice_id">[]
  >();
  const docsByInvoice = new Map<
    string,
    Pick<FinancialDocumentRow, "id" | "kind">[]
  >();

  if (invoiceIds.length > 0) {
    const [prRes, rcRes, fdRes] = await Promise.all([
      supabase
        .from("payment_records")
        .select("*")
        .in("invoice_id", invoiceIds),
      supabase.from("receipts").select("id, invoice_id").in("invoice_id", invoiceIds),
      supabase
        .from("financial_documents")
        .select("id, kind, invoice_id")
        .in("invoice_id", invoiceIds),
    ]);
    if (prRes.error) throw new Error(prRes.error.message);
    if (rcRes.error) throw new Error(rcRes.error.message);
    if (fdRes.error) throw new Error(fdRes.error.message);

    for (const pr of (prRes.data ?? []) as PaymentRecordRow[]) {
      const list = paymentsByInvoice.get(pr.invoice_id) ?? [];
      list.push(pr);
      paymentsByInvoice.set(pr.invoice_id, list);
    }
    for (const r of (rcRes.data ?? []) as Pick<
      ReceiptRow,
      "id" | "invoice_id"
    >[]) {
      if (!r.invoice_id) continue;
      const list = receiptsByInvoice.get(r.invoice_id) ?? [];
      list.push(r);
      receiptsByInvoice.set(r.invoice_id, list);
    }
    for (const d of (fdRes.data ?? []) as (Pick<
      FinancialDocumentRow,
      "id" | "kind" | "invoice_id"
    >)[]) {
      if (!d.invoice_id) continue;
      const list = docsByInvoice.get(d.invoice_id) ?? [];
      list.push({ id: d.id, kind: d.kind });
      docsByInvoice.set(d.invoice_id, list);
    }
  }

  const invoices: InvoiceWithExtras[] = invoicesRaw.map((inv) => ({
    ...inv,
    payment_records: paymentsByInvoice.get(inv.id) ?? [],
    receipts: receiptsByInvoice.get(inv.id) ?? [],
    financial_documents: docsByInvoice.get(inv.id) ?? [],
  }));

  const now = new Date();
  let overdue = false;
  let openBalanceCents = 0;
  let openInvoiceCount = 0;
  for (const inv of invoicesRaw) {
    if (inv.status === "paid" || inv.status === "voided") continue;
    openInvoiceCount += 1;
    if (invoiceIsOverdue(inv, now)) overdue = true;
    openBalanceCents += invoiceOpenBalanceCents(inv);
  }

  const noteRows = (notesRes.data ?? []) as StaffNoteRow[];
  const authorIds = [...new Set(noteRows.map((n) => n.author_id))];
  let authorMap = new Map<string, Pick<ProfileRow, "display_name">>();
  if (authorIds.length > 0) {
    const { data: na, error: ne } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", authorIds);
    if (ne) throw new Error(ne.message);
    authorMap = new Map(
      (na ?? []).map((a) => [a.id, a as Pick<ProfileRow, "display_name">]),
    );
  }

  const staffNotes = noteRows.map((n) => ({
    ...n,
    author: authorMap.get(n.author_id) ?? null,
  }));

  const photos = (photosRes.data ?? []) as Pick<
    ProgressPhotoRow,
    "id" | "taken_on"
  >[];

  const appts = (apptRes.data ?? []) as AppointmentRow[];
  const apptTrainerIds = [
    ...new Set(appts.map((a) => a.primary_trainer_id)),
  ];
  let appointmentTrainerNames: Record<string, string> = {};
  if (apptTrainerIds.length > 0) {
    const { data: aptTr, error: aptTe } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", apptTrainerIds);
    if (aptTe) throw new Error(aptTe.message);
    appointmentTrainerNames = Object.fromEntries(
      (aptTr ?? []).map((t) => [t.id, t.display_name]),
    );
  }

  await syncEntitlementAwardsForClients({
    supabase,
    actorId: null,
    clientIds: [clientId],
  });
  const [entitlementSummary, entitlementRows] = await Promise.all([
    getEntitlementBalance(supabase, clientId),
    fetchEntitlementLedgerForClient({ supabase, clientId, limit: 40 }),
  ]);

  return {
    profile: p,
    location: locRes.data as GymLocationRow | null,
    emergencyContacts: (ecRes.data ?? []) as EmergencyContactRow[],
    preferences: (prefRes.data ?? null) as ClientTrainingPreferencesRow | null,
    activePeriod,
    membershipHistory,
    membershipChanges,
    trainerAssignments,
    activeTrainer,
    goals: (goalsRes.data ?? []) as ClientGoalRow[],
    latestAssessment:
      ((assessRes.data ?? []) as ClientAssessmentRow[])[0] ?? null,
    progressPhotoMeta: {
      count: photos.length,
      latestTakenOn: photos[0]?.taken_on ?? null,
    },
    appointments: appts,
    appointmentTrainerNames,
    recentSessions: (sessRes.data ?? []) as MemberDetailBundle["recentSessions"],
    activeProgram,
    programWeekCount,
    latestProgramSessionAt,
    programAuthor,
    invoices,
    paymentSummary: {
      overdue,
      openBalanceCents,
      openInvoiceCount,
    },
    staffNotes,
    entitlementSummary: {
      includedBalance: entitlementSummary.includedMembership,
      addOnBalance: entitlementSummary.purchasedAddOn,
      total: entitlementSummary.total,
    },
    entitlementHistory: entitlementRows.map((row) => ({
      id: row.id,
      created_at: row.created_at,
      source_kind: row.source_kind,
      event_kind: row.event_kind,
      delta: row.delta,
      appointment_id: row.appointment_id,
      workout_session_id: row.workout_session_id,
      note: row.note,
    })),
  };
}
