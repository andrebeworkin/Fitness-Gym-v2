"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { findProgramDayForDate } from "@/app/(trainer)/trainer/_lib/queries";
import { getTrainerServerContext } from "@/lib/auth/trainer-server";
import { ROUTES } from "@/lib/navigation/dashboard-nav";
import type { ClientProgramRow, WorkoutSessionExerciseRow } from "@/types/database.types";

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
    returnTo && returnTo.startsWith(ROUTES.trainer.root)
      ? returnTo
      : ROUTES.trainer.dashboard;
  const url = new URL(base, "http://localhost");
  url.searchParams.set(kind, message);
  redirect(`${url.pathname}?${url.searchParams.toString()}`);
}

async function requireTrainerContext(returnTo: string | null) {
  const ctx = await getTrainerServerContext();
  if (!ctx) {
    flashRedirect(returnTo, "error", "Trainer session required.");
  }
  return ctx;
}

async function findExistingInProgressSession(params: {
  trainerId: string;
  appointmentId?: string | null;
  clientId?: string | null;
}) {
  const ctx = await getTrainerServerContext();
  if (!ctx) return null;
  let qb = ctx.supabase
    .from("workout_sessions")
    .select("*")
    .eq("trainer_id", params.trainerId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1);
  if (params.appointmentId) qb = qb.eq("appointment_id", params.appointmentId);
  if (params.clientId) qb = qb.eq("client_id", params.clientId);
  const { data, error } = await qb.maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function loadActiveProgramForClient(clientId: string) {
  const ctx = await getTrainerServerContext();
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

export async function startSessionFromAppointmentAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const appointmentId = asText(formData, "appointmentId");
  try {
    const ctx = await requireTrainerContext(returnTo);
    if (!isUuid(appointmentId)) throw new Error("Invalid appointment.");

    const { data: appointment, error: apptErr } = await ctx.supabase
      .from("appointments")
      .select("*")
      .eq("id", appointmentId)
      .maybeSingle();
    if (apptErr) throw new Error(apptErr.message);
    if (!appointment) throw new Error("Appointment not found.");
    if (
      appointment.primary_trainer_id !== ctx.trainerId &&
      appointment.substitute_trainer_id !== ctx.trainerId
    ) {
      throw new Error("You can only start sessions for your appointments.");
    }

    const existing = await findExistingInProgressSession({
      trainerId: ctx.trainerId,
      appointmentId,
    });
    if (existing) {
      redirect(ROUTES.trainer.session(String(existing.id)));
    }

    const activeProgram = await loadActiveProgramForClient(appointment.client_id);
    const programDayId = activeProgram
      ? await findProgramDayForDate({
          supabase: ctx.supabase,
          programId: activeProgram.id,
          date: new Date(appointment.starts_at),
        })
      : null;

    const { data: session, error: sessionErr } = await ctx.supabase
      .from("workout_sessions")
      .insert({
        client_id: appointment.client_id,
        client_program_id: activeProgram?.id ?? null,
        client_program_day_id: programDayId,
        location_id: appointment.location_id,
        trainer_id: ctx.trainerId,
        appointment_id: appointmentId,
        started_at: new Date().toISOString(),
        status: "in_progress",
      })
      .select("*")
      .single();
    if (sessionErr) throw new Error(sessionErr.message);

    revalidatePath(ROUTES.trainer.dashboard);
    revalidatePath(ROUTES.trainer.schedule);
    revalidatePath(ROUTES.trainer.clients);
    redirect(ROUTES.trainer.session(String(session.id)));
  } catch (e) {
    flashRedirect(
      returnTo,
      "error",
      e instanceof Error ? e.message : "Failed to start session.",
    );
  }
}

export async function startSessionForClientAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const clientId = asText(formData, "clientId");
  try {
    const ctx = await requireTrainerContext(returnTo);
    if (!isUuid(clientId)) throw new Error("Invalid client.");

    const { data: profile, error: pErr } = await ctx.supabase
      .from("profiles")
      .select("id")
      .eq("id", clientId)
      .eq("role", "client")
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile) throw new Error("Client not found or access denied.");

    const existing = await findExistingInProgressSession({
      trainerId: ctx.trainerId,
      clientId,
    });
    if (existing) {
      redirect(ROUTES.trainer.session(String(existing.id)));
    }

    const now = new Date();
    const soon = new Date(now);
    soon.setHours(23, 59, 59, 999);
    const { data: appt } = await ctx.supabase
      .from("appointments")
      .select("*")
      .eq("client_id", clientId)
      .or(`primary_trainer_id.eq.${ctx.trainerId},substitute_trainer_id.eq.${ctx.trainerId}`)
      .gte("starts_at", now.toISOString())
      .lte("starts_at", soon.toISOString())
      .order("starts_at")
      .limit(1)
      .maybeSingle();

    const activeProgram = await loadActiveProgramForClient(clientId);
    const programDayId = activeProgram
      ? await findProgramDayForDate({
          supabase: ctx.supabase,
          programId: activeProgram.id,
          date: now,
        })
      : null;

    const { data: session, error: sessionErr } = await ctx.supabase
      .from("workout_sessions")
      .insert({
        client_id: clientId,
        client_program_id: activeProgram?.id ?? null,
        client_program_day_id: programDayId,
        location_id: appt?.location_id ?? null,
        trainer_id: ctx.trainerId,
        appointment_id: appt?.id ?? null,
        started_at: now.toISOString(),
        status: "in_progress",
      })
      .select("*")
      .single();
    if (sessionErr) throw new Error(sessionErr.message);

    revalidatePath(ROUTES.trainer.dashboard);
    revalidatePath(ROUTES.trainer.clients);
    revalidatePath(ROUTES.trainer.client(clientId));
    redirect(ROUTES.trainer.session(String(session.id)));
  } catch (e) {
    flashRedirect(
      returnTo,
      "error",
      e instanceof Error ? e.message : "Failed to start client session.",
    );
  }
}

export async function addSessionExerciseAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const sessionId = asText(formData, "sessionId");
  try {
    const ctx = await requireTrainerContext(returnTo);
    if (!isUuid(sessionId)) throw new Error("Invalid session.");

    const { data: session, error: sErr } = await ctx.supabase
      .from("workout_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("trainer_id", ctx.trainerId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!session) throw new Error("Session not found.");

    const performedExerciseId = asText(formData, "performedExerciseId");
    const prescribedLineId = asNullableText(formData, "prescribedLineId");
    const substituted = formData.has("substituted");
    if (!isUuid(performedExerciseId)) throw new Error("Select a valid exercise.");
    if (prescribedLineId && !isUuid(prescribedLineId)) {
      throw new Error("Invalid prescribed line.");
    }

    const { data: existing, error: eErr } = await ctx.supabase
      .from("workout_session_exercises")
      .select("sequence")
      .eq("session_id", sessionId)
      .order("sequence", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (eErr) throw new Error(eErr.message);
    const nextSequence = Number(existing?.sequence ?? 0) + 1;

    const { error } = await ctx.supabase.from("workout_session_exercises").insert({
      session_id: sessionId,
      sequence: nextSequence,
      prescribed_line_id: prescribedLineId,
      performed_exercise_id: performedExerciseId,
      substituted,
      substitution_note: asNullableText(formData, "substitutionNote"),
      similar_muscle_group_asserted: substituted ? formData.has("similarMuscle") : null,
    });
    if (error) throw new Error(error.message);

    revalidatePath(ROUTES.trainer.session(sessionId));
    flashRedirect(returnTo, "ok", "Exercise logged.");
  } catch (e) {
    flashRedirect(
      returnTo,
      "error",
      e instanceof Error ? e.message : "Failed to log exercise.",
    );
  }
}

export async function upsertSetLogAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const sessionExerciseId = asText(formData, "sessionExerciseId");
  try {
    const ctx = await requireTrainerContext(returnTo);
    if (!isUuid(sessionExerciseId)) throw new Error("Invalid session exercise.");

    const { data: sessionExercise, error: seErr } = await ctx.supabase
      .from("workout_session_exercises")
      .select("*")
      .eq("id", sessionExerciseId)
      .maybeSingle();
    if (seErr) throw new Error(seErr.message);
    if (!sessionExercise) throw new Error("Session exercise not found.");

    const { data: session, error: sErr } = await ctx.supabase
      .from("workout_sessions")
      .select("id, trainer_id")
      .eq("id", sessionExercise.session_id)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!session || session.trainer_id !== ctx.trainerId) {
      throw new Error("Access denied.");
    }

    const setNumber = Number.parseInt(asText(formData, "setNumber"), 10);
    if (!Number.isFinite(setNumber) || setNumber < 1) {
      throw new Error("Set number must be at least 1.");
    }

    const reps = asNumberOrNull(asText(formData, "performedReps"));
    const weight = asNumberOrNull(asText(formData, "performedWeightKg"));
    const rpe = asNumberOrNull(asText(formData, "performedRpe"));
    const rest = asNumberOrNull(asText(formData, "performedRestSeconds"));
    const skipped = formData.has("skipped");

    const { error } = await ctx.supabase.from("workout_set_logs").upsert(
      {
        session_exercise_id: sessionExerciseId,
        set_number: setNumber,
        performed_reps: reps,
        performed_weight_kg: weight,
        performed_rpe: rpe,
        performed_rest_seconds: rest,
        skipped,
        skip_reason: skipped ? asNullableText(formData, "skipReason") : null,
      },
      { onConflict: "session_exercise_id,set_number" },
    );
    if (error) throw new Error(error.message);

    revalidatePath(returnTo ?? ROUTES.trainer.dashboard);
    flashRedirect(returnTo, "ok", `Set ${setNumber} saved.`);
  } catch (e) {
    flashRedirect(returnTo, "error", e instanceof Error ? e.message : "Failed to save set.");
  }
}

export async function updateSessionStatusAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const sessionId = asText(formData, "sessionId");
  try {
    const ctx = await requireTrainerContext(returnTo);
    if (!isUuid(sessionId)) throw new Error("Invalid session.");
    const statusRaw = asText(formData, "status");
    const status: "in_progress" | "completed" | "abandoned" =
      statusRaw === "completed" || statusRaw === "abandoned"
        ? statusRaw
        : "in_progress";

    const { data: session, error: sessionErr } = await ctx.supabase
      .from("workout_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("trainer_id", ctx.trainerId)
      .maybeSingle();
    if (sessionErr) throw new Error(sessionErr.message);
    if (!session) throw new Error("Session not found.");

    const { error } = await ctx.supabase
      .from("workout_sessions")
      .update({
        status,
        completed_at: status === "in_progress" ? null : new Date().toISOString(),
      })
      .eq("id", sessionId);
    if (error) throw new Error(error.message);

    if (session.appointment_id) {
      if (status === "completed") {
        const { error: apptErr } = await ctx.supabase
          .from("appointments")
          .update({
            status: "completed",
            attendance_marked_at: new Date().toISOString(),
            attendance_marked_by: ctx.trainerId,
            no_show: false,
          })
          .eq("id", session.appointment_id);
        if (apptErr) throw new Error(apptErr.message);
      }
      if (status === "abandoned") {
        const { error: apptErr } = await ctx.supabase
          .from("appointments")
          .update({
            status: "no_show",
            attendance_marked_at: new Date().toISOString(),
            attendance_marked_by: ctx.trainerId,
            no_show: true,
          })
          .eq("id", session.appointment_id);
        if (apptErr) throw new Error(apptErr.message);
      }
    }

    revalidatePath(ROUTES.trainer.dashboard);
    revalidatePath(ROUTES.trainer.schedule);
    revalidatePath(ROUTES.trainer.session(sessionId));
    flashRedirect(returnTo, "ok", "Session status updated.");
  } catch (e) {
    flashRedirect(
      returnTo,
      "error",
      e instanceof Error ? e.message : "Failed to update session status.",
    );
  }
}

export async function addClientSessionNoteAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const sessionId = asText(formData, "sessionId");
  try {
    const ctx = await requireTrainerContext(returnTo);
    if (!isUuid(sessionId)) throw new Error("Invalid session.");

    const { data: session, error: sErr } = await ctx.supabase
      .from("workout_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("trainer_id", ctx.trainerId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!session) throw new Error("Session not found.");

    const body = asNullableText(formData, "body");
    const { error } = await ctx.supabase.from("client_session_notes").insert({
      session_id: sessionId,
      client_id: session.client_id,
      author_id: ctx.trainerId,
      body,
      pain_reported: formData.has("painReported"),
      discomfort_reported: formData.has("discomfortReported"),
      skipped_exercises_note: asNullableText(formData, "skippedExercisesNote"),
    });
    if (error) throw new Error(error.message);

    revalidatePath(ROUTES.trainer.session(sessionId));
    flashRedirect(returnTo, "ok", "Client-visible session note added.");
  } catch (e) {
    flashRedirect(returnTo, "error", e instanceof Error ? e.message : "Failed to add note.");
  }
}

export async function addStaffSessionNoteAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const sessionId = asText(formData, "sessionId");
  try {
    const ctx = await requireTrainerContext(returnTo);
    if (!isUuid(sessionId)) throw new Error("Invalid session.");
    const body = asText(formData, "body");
    if (!body) throw new Error("Note body is required.");

    const { data: session, error: sErr } = await ctx.supabase
      .from("workout_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("trainer_id", ctx.trainerId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!session) throw new Error("Session not found.");

    const { error } = await ctx.supabase.from("staff_notes").insert({
      client_id: session.client_id,
      session_id: sessionId,
      audience: "staff_internal",
      author_id: ctx.trainerId,
      body,
    });
    if (error) throw new Error(error.message);

    revalidatePath(ROUTES.trainer.session(sessionId));
    flashRedirect(returnTo, "ok", "Internal staff note added.");
  } catch (e) {
    flashRedirect(
      returnTo,
      "error",
      e instanceof Error ? e.message : "Failed to add internal note.",
    );
  }
}

export async function addSessionIncidentAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const sessionId = asText(formData, "sessionId");
  try {
    const ctx = await requireTrainerContext(returnTo);
    if (!isUuid(sessionId)) throw new Error("Invalid session.");
    const kind = asText(formData, "kind");
    if (
      !["pain", "dizziness", "form_issue", "missed_appointment", "other"].includes(
        kind,
      )
    ) {
      throw new Error("Invalid incident kind.");
    }

    const { data: session, error: sErr } = await ctx.supabase
      .from("workout_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("trainer_id", ctx.trainerId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!session) throw new Error("Session not found.");

    const { error } = await ctx.supabase.from("client_incidents").insert({
      client_id: session.client_id,
      session_id: sessionId,
      appointment_id: session.appointment_id,
      reported_by: ctx.trainerId,
      kind,
      description: asNullableText(formData, "description"),
    });
    if (error) throw new Error(error.message);

    revalidatePath(ROUTES.trainer.session(sessionId));
    flashRedirect(returnTo, "ok", "Incident logged.");
  } catch (e) {
    flashRedirect(
      returnTo,
      "error",
      e instanceof Error ? e.message : "Failed to log incident.",
    );
  }
}

export async function submitProgramChangeRequestAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  try {
    const ctx = await requireTrainerContext(returnTo);
    const clientProgramId = asText(formData, "clientProgramId");
    if (!isUuid(clientProgramId)) throw new Error("Invalid program.");

    const { data: program, error: pErr } = await ctx.supabase
      .from("client_programs")
      .select("*")
      .eq("id", clientProgramId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!program) throw new Error("Program not found.");
    if (program.author_kind !== "manager") {
      throw new Error(
        "Change requests are for manager-authored programs. This program is not manager-authored.",
      );
    }

    const summary = asText(formData, "requestSummary");
    if (!summary) throw new Error("Request reason is required.");
    const suggested = asNullableText(formData, "suggestedChange");
    const affectedDayId = asNullableText(formData, "affectedDayId");
    const affectedExerciseId = asNullableText(formData, "affectedExerciseId");

    let payload: Record<string, unknown> = {
      summary,
      suggested_change: suggested,
      affected_day_id: affectedDayId,
      affected_exercise_id: affectedExerciseId,
      source: "trainer_execution_vertical",
    };
    const payloadRaw = asNullableText(formData, "payloadJson");
    if (payloadRaw) {
      try {
        const parsed = JSON.parse(payloadRaw) as Record<string, unknown>;
        payload = { ...payload, ...parsed };
      } catch {
        payload.raw_payload = payloadRaw;
      }
    }

    const { error } = await ctx.supabase.from("program_change_requests").insert({
      client_program_id: clientProgramId,
      requested_by: ctx.trainerId,
      status: "pending",
      request_summary: summary,
      payload,
    });
    if (error) throw new Error(error.message);

    revalidatePath(ROUTES.trainer.dashboard);
    if (returnTo) revalidatePath(returnTo);
    flashRedirect(returnTo, "ok", "Program change request submitted.");
  } catch (e) {
    flashRedirect(
      returnTo,
      "error",
      e instanceof Error ? e.message : "Failed to submit change request.",
    );
  }
}

export async function startSessionFromClientDetailAction(formData: FormData) {
  return startSessionForClientAction(formData);
}

export async function addSetSkeletonAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const sessionExerciseId = asText(formData, "sessionExerciseId");
  try {
    const ctx = await requireTrainerContext(returnTo);
    if (!isUuid(sessionExerciseId)) throw new Error("Invalid session exercise.");
    const { data: line, error: lineErr } = await ctx.supabase
      .from("workout_session_exercises")
      .select("*")
      .eq("id", sessionExerciseId)
      .maybeSingle();
    if (lineErr) throw new Error(lineErr.message);
    if (!line) throw new Error("Session exercise not found.");

    const sessionExercise = line as WorkoutSessionExerciseRow;
    const { data: session, error: sessionErr } = await ctx.supabase
      .from("workout_sessions")
      .select("id, trainer_id")
      .eq("id", sessionExercise.session_id)
      .maybeSingle();
    if (sessionErr) throw new Error(sessionErr.message);
    if (!session || session.trainer_id !== ctx.trainerId) {
      throw new Error("Access denied.");
    }

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

    revalidatePath(returnTo ?? ROUTES.trainer.dashboard);
    flashRedirect(returnTo, "ok", `Added set ${nextSet}.`);
  } catch (e) {
    flashRedirect(returnTo, "error", e instanceof Error ? e.message : "Failed to add set.");
  }
}
