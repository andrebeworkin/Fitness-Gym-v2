"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getClientServerContext } from "@/lib/auth/client-server";
import {
  consumeEntitlementForAppointment,
  getEntitlementBalance,
  reverseEntitlementForCancelledAppointment,
  syncEntitlementAwardsForClients,
} from "@/lib/entitlements/ledger";
import { ROUTES } from "@/lib/navigation/dashboard-nav";
import type {
  ClientProgramRow,
  MembershipTypeRow,
  WorkoutSessionExerciseRow,
} from "@/types/database.types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function asText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function asNullableText(formData: FormData, key: string): string | null {
  const v = asText(formData, key);
  return v.length > 0 ? v : null;
}

function asNumberOrNull(value: string): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function flashRedirect(
  returnTo: string | null,
  kind: "ok" | "error",
  message: string,
): never {
  const base =
    returnTo && returnTo.startsWith(ROUTES.client.root)
      ? returnTo
      : ROUTES.client.dashboard;
  const url = new URL(base, "http://localhost");
  url.searchParams.set(kind, message);
  redirect(`${url.pathname}?${url.searchParams.toString()}`);
}

async function requireClientContext(returnTo: string | null) {
  const ctx = await getClientServerContext();
  if (!ctx) {
    flashRedirect(returnTo, "error", "Client session required.");
  }
  return ctx;
}

async function loadActiveProgram(clientId: string): Promise<ClientProgramRow | null> {
  const ctx = await getClientServerContext();
  if (!ctx) return null;
  const { data, error } = await ctx.supabase
    .from("client_programs")
    .select("*")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as ClientProgramRow | null;
}

async function checkBookingEligibility(
  clientId: string,
): Promise<{ allowed: boolean; reason: string | null }> {
  const ctx = await getClientServerContext();
  if (!ctx) return { allowed: false, reason: "Client session required." };

  const [periodRes, typesRes] = await Promise.all([
    ctx.supabase
      .from("client_membership_periods")
      .select("*")
      .eq("client_id", clientId)
      .eq("status", "active")
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle(),
    ctx.supabase.from("membership_types").select("*"),
  ]);
  if (periodRes.error) throw new Error(periodRes.error.message);
  if (typesRes.error) throw new Error(typesRes.error.message);
  const period = periodRes.data;
  if (!period) return { allowed: false, reason: "No active membership found." };
  const type = ((typesRes.data ?? []) as MembershipTypeRow[]).find(
    (t) => t.id === period.membership_type_id,
  );
  const slug = type?.slug;
  if (slug === "private") return { allowed: true, reason: null };
  if (slug === "open_gym") {
    return {
      allowed: false,
      reason: "Open Gym membership does not include trainer booking.",
    };
  }
  if (slug === "semi_private") {
    await syncEntitlementAwardsForClients({
      supabase: ctx.supabase,
      actorId: ctx.clientId,
      clientIds: [clientId],
    });
    const balance = await getEntitlementBalance(ctx.supabase, clientId);
    if (balance.total > 0) return { allowed: true, reason: null };
    return {
      allowed: false,
      reason: "No available Semi-Private credits or add-ons were found.",
    };
  }
  return { allowed: false, reason: "Booking is unavailable for this membership." };
}

export async function startClientSessionAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  try {
    const ctx = await requireClientContext(returnTo);
    const existingInProgress = await ctx.supabase
      .from("workout_sessions")
      .select("*")
      .eq("client_id", ctx.clientId)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingInProgress.error) throw new Error(existingInProgress.error.message);
    if (existingInProgress.data) {
      redirect(ROUTES.client.session(existingInProgress.data.id));
    }

    const activeProgram = await loadActiveProgram(ctx.clientId);
    const dayIdRaw = asNullableText(formData, "clientProgramDayId");
    if (dayIdRaw && !isUuid(dayIdRaw)) throw new Error("Invalid program day.");
    const dayId = dayIdRaw;

    const now = new Date();
    const { data: appointment } = await ctx.supabase
      .from("appointments")
      .select("*")
      .eq("client_id", ctx.clientId)
      .gte("starts_at", now.toISOString())
      .neq("status", "cancelled")
      .order("starts_at")
      .limit(1)
      .maybeSingle();

    const { data: session, error } = await ctx.supabase
      .from("workout_sessions")
      .insert({
        client_id: ctx.clientId,
        client_program_id: activeProgram?.id ?? null,
        client_program_day_id: dayId,
        location_id: appointment?.location_id ?? null,
        trainer_id: null,
        appointment_id: appointment?.id ?? null,
        started_at: now.toISOString(),
        status: "in_progress",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    revalidatePath(ROUTES.client.dashboard);
    revalidatePath(ROUTES.client.log);
    redirect(ROUTES.client.session(session.id));
  } catch (e) {
    flashRedirect(
      returnTo,
      "error",
      e instanceof Error ? e.message : "Failed to start workout.",
    );
  }
}

export async function addClientSessionExerciseAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const sessionId = asText(formData, "sessionId");
  try {
    const ctx = await requireClientContext(returnTo);
    if (!isUuid(sessionId)) throw new Error("Invalid session.");
    const { data: session, error: sErr } = await ctx.supabase
      .from("workout_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("client_id", ctx.clientId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!session) throw new Error("Session not found.");

    const performedExerciseId = asText(formData, "performedExerciseId");
    const prescribedLineId = asNullableText(formData, "prescribedLineId");
    if (!isUuid(performedExerciseId)) throw new Error("Select a valid exercise.");
    if (prescribedLineId && !isUuid(prescribedLineId)) {
      throw new Error("Invalid prescribed line.");
    }

    const { data: existing, error: existingErr } = await ctx.supabase
      .from("workout_session_exercises")
      .select("sequence")
      .eq("session_id", sessionId)
      .order("sequence", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingErr) throw new Error(existingErr.message);
    const nextSequence = Number(existing?.sequence ?? 0) + 1;

    const { error } = await ctx.supabase.from("workout_session_exercises").insert({
      session_id: sessionId,
      sequence: nextSequence,
      prescribed_line_id: prescribedLineId,
      performed_exercise_id: performedExerciseId,
      substituted: formData.has("substituted"),
      substitution_note: asNullableText(formData, "substitutionNote"),
      similar_muscle_group_asserted: formData.has("substituted")
        ? formData.has("similarMuscle")
        : null,
    });
    if (error) throw new Error(error.message);

    revalidatePath(ROUTES.client.session(sessionId));
    flashRedirect(returnTo, "ok", "Exercise line added.");
  } catch (e) {
    flashRedirect(
      returnTo,
      "error",
      e instanceof Error ? e.message : "Failed to add exercise.",
    );
  }
}

export async function addClientSetSkeletonAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const sessionExerciseId = asText(formData, "sessionExerciseId");
  try {
    const ctx = await requireClientContext(returnTo);
    if (!isUuid(sessionExerciseId)) throw new Error("Invalid line.");
    const { data: line, error: lineErr } = await ctx.supabase
      .from("workout_session_exercises")
      .select("*")
      .eq("id", sessionExerciseId)
      .maybeSingle();
    if (lineErr) throw new Error(lineErr.message);
    if (!line) throw new Error("Session exercise not found.");
    const lineRow = line as WorkoutSessionExerciseRow;

    const { data: session, error: sErr } = await ctx.supabase
      .from("workout_sessions")
      .select("id, client_id")
      .eq("id", lineRow.session_id)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!session || session.client_id !== ctx.clientId) throw new Error("Access denied.");

    const { data: maxSet, error: maxErr } = await ctx.supabase
      .from("workout_set_logs")
      .select("set_number")
      .eq("session_exercise_id", sessionExerciseId)
      .order("set_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxErr) throw new Error(maxErr.message);
    const nextSet = Number(maxSet?.set_number ?? 0) + 1;

    const { error } = await ctx.supabase.from("workout_set_logs").insert({
      session_exercise_id: sessionExerciseId,
      set_number: nextSet,
    });
    if (error) throw new Error(error.message);

    revalidatePath(returnTo ?? ROUTES.client.log);
    flashRedirect(returnTo, "ok", `Added set ${nextSet}.`);
  } catch (e) {
    flashRedirect(returnTo, "error", e instanceof Error ? e.message : "Failed to add set.");
  }
}

export async function upsertClientSetLogAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const sessionExerciseId = asText(formData, "sessionExerciseId");
  const setNumber = Number.parseInt(asText(formData, "setNumber"), 10);
  try {
    const ctx = await requireClientContext(returnTo);
    if (!isUuid(sessionExerciseId)) throw new Error("Invalid session exercise.");
    if (!Number.isFinite(setNumber) || setNumber < 1) throw new Error("Invalid set number.");

    const { data: line, error: lineErr } = await ctx.supabase
      .from("workout_session_exercises")
      .select("*")
      .eq("id", sessionExerciseId)
      .maybeSingle();
    if (lineErr) throw new Error(lineErr.message);
    if (!line) throw new Error("Session exercise not found.");

    const { data: session, error: sErr } = await ctx.supabase
      .from("workout_sessions")
      .select("id, client_id")
      .eq("id", line.session_id)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!session || session.client_id !== ctx.clientId) throw new Error("Access denied.");

    const { error } = await ctx.supabase.from("workout_set_logs").upsert(
      {
        session_exercise_id: sessionExerciseId,
        set_number: setNumber,
        performed_reps: asNumberOrNull(asText(formData, "performedReps")),
        performed_weight_kg: asNumberOrNull(asText(formData, "performedWeightKg")),
        performed_rpe: asNumberOrNull(asText(formData, "performedRpe")),
        performed_rest_seconds: asNumberOrNull(asText(formData, "performedRestSeconds")),
        skipped: formData.has("skipped"),
        skip_reason: formData.has("skipped")
          ? asNullableText(formData, "skipReason")
          : null,
      },
      { onConflict: "session_exercise_id,set_number" },
    );
    if (error) throw new Error(error.message);

    revalidatePath(returnTo ?? ROUTES.client.log);
    flashRedirect(returnTo, "ok", `Set ${setNumber} saved.`);
  } catch (e) {
    flashRedirect(
      returnTo,
      "error",
      e instanceof Error ? e.message : "Failed to save set.",
    );
  }
}

export async function updateClientSessionStatusAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const sessionId = asText(formData, "sessionId");
  try {
    const ctx = await requireClientContext(returnTo);
    if (!isUuid(sessionId)) throw new Error("Invalid session.");
    const statusRaw = asText(formData, "status");
    const status: "in_progress" | "completed" | "abandoned" =
      statusRaw === "completed" || statusRaw === "abandoned"
        ? statusRaw
        : "in_progress";

    const { data: session, error: sErr } = await ctx.supabase
      .from("workout_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("client_id", ctx.clientId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!session) throw new Error("Session not found.");

    const { error } = await ctx.supabase
      .from("workout_sessions")
      .update({
        status,
        completed_at: status === "in_progress" ? null : new Date().toISOString(),
      })
      .eq("id", sessionId);
    if (error) throw new Error(error.message);

    if (session.appointment_id && status === "completed") {
      await ctx.supabase
        .from("appointments")
        .update({
          status: "completed",
          attendance_marked_at: new Date().toISOString(),
          attendance_marked_by: ctx.clientId,
          no_show: false,
        })
        .eq("id", session.appointment_id);
    }

    revalidatePath(ROUTES.client.dashboard);
    revalidatePath(ROUTES.client.log);
    revalidatePath(ROUTES.client.progress);
    revalidatePath(ROUTES.client.session(sessionId));
    flashRedirect(returnTo, "ok", "Session updated.");
  } catch (e) {
    flashRedirect(returnTo, "error", e instanceof Error ? e.message : "Failed to update session.");
  }
}

export async function addClientSessionNoteAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const sessionId = asText(formData, "sessionId");
  try {
    const ctx = await requireClientContext(returnTo);
    if (!isUuid(sessionId)) throw new Error("Invalid session.");

    const { data: session, error: sErr } = await ctx.supabase
      .from("workout_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("client_id", ctx.clientId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!session) throw new Error("Session not found.");

    const { error } = await ctx.supabase.from("client_session_notes").insert({
      session_id: sessionId,
      client_id: ctx.clientId,
      author_id: ctx.clientId,
      body: asNullableText(formData, "body"),
      pain_reported: formData.has("painReported"),
      discomfort_reported: formData.has("discomfortReported"),
      skipped_exercises_note: asNullableText(formData, "skippedExercisesNote"),
    });
    if (error) throw new Error(error.message);

    revalidatePath(ROUTES.client.session(sessionId));
    revalidatePath(ROUTES.client.progress);
    flashRedirect(returnTo, "ok", "Session note saved.");
  } catch (e) {
    flashRedirect(returnTo, "error", e instanceof Error ? e.message : "Failed to save note.");
  }
}

export async function bookClientAppointmentAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const slotId = asText(formData, "slotId");
  try {
    const ctx = await requireClientContext(returnTo);
    if (!isUuid(slotId)) throw new Error("Invalid slot.");

    const eligibility = await checkBookingEligibility(ctx.clientId);
    if (!eligibility.allowed) throw new Error(eligibility.reason ?? "Booking not allowed.");

    const { data: slot, error: slotErr } = await ctx.supabase
      .from("trainer_availability_slots")
      .select("*")
      .eq("id", slotId)
      .eq("is_open", true)
      .maybeSingle();
    if (slotErr) throw new Error(slotErr.message);
    if (!slot) throw new Error("Slot is no longer available.");

    const startsAt = new Date(slot.starts_at);
    const endsAt = new Date(slot.ends_at);
    if (startsAt >= endsAt) throw new Error("Invalid slot duration.");
    if (startsAt.getMinutes() % 30 !== 0 || endsAt.getMinutes() % 30 !== 0) {
      throw new Error("Slot must use 30-minute increments.");
    }

    const { data: conflict, error: conflictErr } = await ctx.supabase
      .from("appointments")
      .select("*")
      .eq("client_id", ctx.clientId)
      .neq("status", "cancelled");
    if (conflictErr) throw new Error(conflictErr.message);
    const overlaps = (conflict ?? []).some((a) => {
      const aStart = new Date(a.starts_at);
      const aEnd = new Date(a.ends_at);
      return startsAt < aEnd && endsAt > aStart;
    });
    if (overlaps) throw new Error("You already have an overlapping appointment.");

    const appointmentId = crypto.randomUUID();
    const { error } = await ctx.supabase.from("appointments").insert({
      id: appointmentId,
      location_id: slot.location_id,
      client_id: ctx.clientId,
      primary_trainer_id: slot.trainer_id,
      substitute_trainer_id: null,
      availability_slot_id: slot.id,
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
      status: "scheduled",
      no_show: false,
      created_by: ctx.clientId,
    });
    if (error) throw new Error(error.message);

    try {
      await consumeEntitlementForAppointment({
        context: { supabase: ctx.supabase, actorId: ctx.clientId },
        appointment: {
          id: appointmentId,
          client_id: ctx.clientId,
          starts_at: slot.starts_at,
        },
        note: "Consumed by client booking",
      });
    } catch (consumeErr) {
      await ctx.supabase.from("appointments").delete().eq("id", appointmentId);
      throw consumeErr;
    }

    await ctx.supabase
      .from("trainer_availability_slots")
      .update({ is_open: false })
      .eq("id", slot.id);

    revalidatePath(ROUTES.client.appointments);
    revalidatePath(ROUTES.client.dashboard);
    flashRedirect(returnTo, "ok", "Appointment booked.");
  } catch (e) {
    flashRedirect(returnTo, "error", e instanceof Error ? e.message : "Failed to book appointment.");
  }
}

export async function cancelClientAppointmentAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const appointmentId = asText(formData, "appointmentId");
  try {
    const ctx = await requireClientContext(returnTo);
    if (!isUuid(appointmentId)) throw new Error("Invalid appointment.");
    const { data: appt, error: apErr } = await ctx.supabase
      .from("appointments")
      .select("*")
      .eq("id", appointmentId)
      .eq("client_id", ctx.clientId)
      .maybeSingle();
    if (apErr) throw new Error(apErr.message);
    if (!appt) throw new Error("Appointment not found.");

    const starts = new Date(appt.starts_at);
    const now = new Date();
    const hoursUntil = (starts.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntil < 12) {
      const { error } = await ctx.supabase.from("appointment_change_requests").insert({
        appointment_id: appt.id,
        requested_by: ctx.clientId,
        request_type: "cancel",
        payload: {
          reason: asNullableText(formData, "reason"),
          requested_at: now.toISOString(),
          source: "client_appointment_cancellation_request",
        },
        status: "pending",
      });
      if (error) throw new Error(error.message);
      revalidatePath(ROUTES.client.appointments);
      flashRedirect(
        returnTo,
        "ok",
        "Cancellation request submitted for manager review.",
      );
    }

    const { error } = await ctx.supabase
      .from("appointments")
      .update({
        status: "cancelled",
        cancel_reason: asNullableText(formData, "reason"),
      })
      .eq("id", appt.id);
    if (error) throw new Error(error.message);

    if (appt.availability_slot_id) {
      await ctx.supabase
        .from("trainer_availability_slots")
        .update({ is_open: true })
        .eq("id", appt.availability_slot_id);
    }

    await reverseEntitlementForCancelledAppointment({
      context: { supabase: ctx.supabase, actorId: ctx.clientId },
      appointment: { id: appt.id, client_id: ctx.clientId },
      note: "Reversed by client cancellation",
    });

    revalidatePath(ROUTES.client.appointments);
    revalidatePath(ROUTES.client.dashboard);
    flashRedirect(returnTo, "ok", "Appointment cancelled.");
  } catch (e) {
    flashRedirect(returnTo, "error", e instanceof Error ? e.message : "Failed to cancel.");
  }
}

export async function requestRescheduleClientAppointmentAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const appointmentId = asText(formData, "appointmentId");
  try {
    const ctx = await requireClientContext(returnTo);
    if (!isUuid(appointmentId)) throw new Error("Invalid appointment.");
    const { data: appt, error: apErr } = await ctx.supabase
      .from("appointments")
      .select("*")
      .eq("id", appointmentId)
      .eq("client_id", ctx.clientId)
      .maybeSingle();
    if (apErr) throw new Error(apErr.message);
    if (!appt) throw new Error("Appointment not found.");

    const requestedStart = asNullableText(formData, "requestedStartsAt");
    const requestedEnd = asNullableText(formData, "requestedEndsAt");
    const note = asNullableText(formData, "note");
    const { error } = await ctx.supabase.from("appointment_change_requests").insert({
      appointment_id: appt.id,
      requested_by: ctx.clientId,
      request_type: "reschedule",
      payload: {
        requested_starts_at: requestedStart,
        requested_ends_at: requestedEnd,
        note,
        source: "client_reschedule_request",
      },
      status: "pending",
    });
    if (error) throw new Error(error.message);

    revalidatePath(ROUTES.client.appointments);
    flashRedirect(returnTo, "ok", "Reschedule request submitted.");
  } catch (e) {
    flashRedirect(
      returnTo,
      "error",
      e instanceof Error ? e.message : "Failed to submit request.",
    );
  }
}
