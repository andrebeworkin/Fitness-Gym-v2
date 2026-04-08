"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getManagerServerContext } from "@/lib/auth/manager-server";
import { ROUTES } from "@/lib/navigation/dashboard-nav";
import type {
  ClientProgramDayRow,
  ClientProgramWeekRow,
  ClientProgramRow,
  ProgramTemplateDayRow,
  ProgramTemplateWeekRow,
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

function asInt(value: string, fallback: number): number {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function flashRedirect(
  returnTo: string | null,
  kind: "ok" | "error",
  message: string,
): never {
  const base =
    returnTo && returnTo.startsWith(ROUTES.manager.programs)
      ? returnTo
      : ROUTES.manager.programs;
  const url = new URL(base, "http://localhost");
  url.searchParams.set(kind, message);
  redirect(`${url.pathname}?${url.searchParams.toString()}`);
}

async function requireManagerContext(returnTo: string | null) {
  const ctx = await getManagerServerContext();
  if (!ctx) {
    flashRedirect(returnTo, "error", "Manager session required.");
  }
  return ctx;
}

async function ensureProgramCanBeActive(
  clientId: string,
  currentProgramId?: string,
): Promise<void> {
  const ctx = await getManagerServerContext();
  if (!ctx) return;
  const { data, error } = await ctx.supabase
    .from("client_programs")
    .select("id")
    .eq("client_id", clientId)
    .eq("status", "active");
  if (error) throw new Error(error.message);
  const conflict = (data ?? []).some((row) => row.id !== currentProgramId);
  if (conflict) {
    throw new Error(
      "Client already has an active program. End or complete it before assigning a new active one.",
    );
  }
}

async function createWeekDaySkeletonForTemplate(params: {
  templateId: string;
  durationWeeks: number;
  daysPerWeek: number;
}) {
  const { templateId, durationWeeks, daysPerWeek } = params;
  const ctx = await getManagerServerContext();
  if (!ctx) return;
  for (let week = 1; week <= durationWeeks; week += 1) {
    const { data: weekRow, error: weekErr } = await ctx.supabase
      .from("program_template_weeks")
      .insert({
        template_id: templateId,
        week_number: week,
        label: `Week ${week}`,
      })
      .select("*")
      .single();
    if (weekErr) throw new Error(weekErr.message);
    for (let day = 1; day <= daysPerWeek; day += 1) {
      const { error: dayErr } = await ctx.supabase
        .from("program_template_days")
        .insert({
          week_id: weekRow.id,
          day_number: day,
          label: `Day ${day}`,
        });
      if (dayErr) throw new Error(dayErr.message);
    }
  }
}

async function ensureTemplateWeekAndDay(params: {
  templateId: string;
  weekNumber: number;
  dayNumber: number;
}): Promise<{ week: ProgramTemplateWeekRow; day: ProgramTemplateDayRow }> {
  const ctx = await getManagerServerContext();
  if (!ctx) throw new Error("Manager session required.");

  const { templateId, weekNumber, dayNumber } = params;
  const { data: existingWeek, error: weekLoadErr } = await ctx.supabase
    .from("program_template_weeks")
    .select("*")
    .eq("template_id", templateId)
    .eq("week_number", weekNumber)
    .maybeSingle();
  if (weekLoadErr) throw new Error(weekLoadErr.message);
  let week = existingWeek as ProgramTemplateWeekRow | null;
  if (!week) {
    const { data: createdWeek, error: weekCreateErr } = await ctx.supabase
      .from("program_template_weeks")
      .insert({
        template_id: templateId,
        week_number: weekNumber,
        label: `Week ${weekNumber}`,
      })
      .select("*")
      .single();
    if (weekCreateErr) throw new Error(weekCreateErr.message);
    week = createdWeek as ProgramTemplateWeekRow;
  }

  const { data: existingDay, error: dayLoadErr } = await ctx.supabase
    .from("program_template_days")
    .select("*")
    .eq("week_id", week.id)
    .eq("day_number", dayNumber)
    .maybeSingle();
  if (dayLoadErr) throw new Error(dayLoadErr.message);
  let day = existingDay as ProgramTemplateDayRow | null;
  if (!day) {
    const { data: createdDay, error: dayCreateErr } = await ctx.supabase
      .from("program_template_days")
      .insert({
        week_id: week.id,
        day_number: dayNumber,
        label: `Day ${dayNumber}`,
      })
      .select("*")
      .single();
    if (dayCreateErr) throw new Error(dayCreateErr.message);
    day = createdDay as ProgramTemplateDayRow;
  }

  return { week, day };
}

async function ensureClientProgramWeekAndDay(params: {
  programId: string;
  weekNumber: number;
  dayNumber: number;
}): Promise<{ week: ClientProgramWeekRow; day: ClientProgramDayRow }> {
  const ctx = await getManagerServerContext();
  if (!ctx) throw new Error("Manager session required.");
  const { programId, weekNumber, dayNumber } = params;

  const { data: existingWeek, error: weekLoadErr } = await ctx.supabase
    .from("client_program_weeks")
    .select("*")
    .eq("program_id", programId)
    .eq("week_number", weekNumber)
    .maybeSingle();
  if (weekLoadErr) throw new Error(weekLoadErr.message);
  let week = existingWeek as ClientProgramWeekRow | null;
  if (!week) {
    const { data: createdWeek, error: weekCreateErr } = await ctx.supabase
      .from("client_program_weeks")
      .insert({
        program_id: programId,
        week_number: weekNumber,
        label: `Week ${weekNumber}`,
      })
      .select("*")
      .single();
    if (weekCreateErr) throw new Error(weekCreateErr.message);
    week = createdWeek as ClientProgramWeekRow;
  }

  const { data: existingDay, error: dayLoadErr } = await ctx.supabase
    .from("client_program_days")
    .select("*")
    .eq("week_id", week.id)
    .eq("day_number", dayNumber)
    .maybeSingle();
  if (dayLoadErr) throw new Error(dayLoadErr.message);
  let day = existingDay as ClientProgramDayRow | null;
  if (!day) {
    const { data: createdDay, error: dayCreateErr } = await ctx.supabase
      .from("client_program_days")
      .insert({
        week_id: week.id,
        day_number: dayNumber,
        label: `Day ${dayNumber}`,
      })
      .select("*")
      .single();
    if (dayCreateErr) throw new Error(dayCreateErr.message);
    day = createdDay as ClientProgramDayRow;
  }
  return { week, day };
}

async function copyTemplateToClientProgram(
  templateId: string,
  programId: string,
): Promise<void> {
  const ctx = await getManagerServerContext();
  if (!ctx) throw new Error("Manager session required.");

  const { data: tplWeeks, error: weekErr } = await ctx.supabase
    .from("program_template_weeks")
    .select("*")
    .eq("template_id", templateId)
    .order("week_number");
  if (weekErr) throw new Error(weekErr.message);
  const templateWeeks = (tplWeeks ?? []) as ProgramTemplateWeekRow[];
  if (templateWeeks.length === 0) {
    await ensureClientProgramWeekAndDay({ programId, weekNumber: 1, dayNumber: 1 });
    return;
  }

  const weekMap = new Map<string, ClientProgramWeekRow>();
  for (const week of templateWeeks) {
    const { data: created, error: createErr } = await ctx.supabase
      .from("client_program_weeks")
      .insert({
        program_id: programId,
        week_number: week.week_number,
        label: week.label,
      })
      .select("*")
      .single();
    if (createErr) throw new Error(createErr.message);
    weekMap.set(week.id, created as ClientProgramWeekRow);
  }

  const templateWeekIds = templateWeeks.map((w) => w.id);
  const { data: tplDays, error: dayErr } = await ctx.supabase
    .from("program_template_days")
    .select("*")
    .in("week_id", templateWeekIds)
    .order("day_number");
  if (dayErr) throw new Error(dayErr.message);
  const templateDays = (tplDays ?? []) as ProgramTemplateDayRow[];

  const dayMap = new Map<string, ClientProgramDayRow>();
  for (const day of templateDays) {
    const parentWeek = weekMap.get(day.week_id);
    if (!parentWeek) continue;
    const { data: createdDay, error: dayCreateErr } = await ctx.supabase
      .from("client_program_days")
      .insert({
        week_id: parentWeek.id,
        day_number: day.day_number,
        label: day.label,
      })
      .select("*")
      .single();
    if (dayCreateErr) throw new Error(dayCreateErr.message);
    dayMap.set(day.id, createdDay as ClientProgramDayRow);
  }

  const templateDayIds = templateDays.map((d) => d.id);
  if (templateDayIds.length === 0) return;

  const { data: tplLines, error: lineErr } = await ctx.supabase
    .from("program_template_day_exercises")
    .select("*")
    .in("day_id", templateDayIds)
    .order("sequence");
  if (lineErr) throw new Error(lineErr.message);

  for (const line of tplLines ?? []) {
    const parentDay = dayMap.get(String(line.day_id));
    if (!parentDay) continue;
    const { error: insertErr } = await ctx.supabase
      .from("client_program_day_exercises")
      .insert({
        day_id: parentDay.id,
        sequence: line.sequence,
        exercise_id: line.exercise_id,
        superset_group: line.superset_group,
        prescribed_sets: line.prescribed_sets,
        prescribed_reps: line.prescribed_reps,
        rest_seconds: line.rest_seconds,
        tempo: line.tempo,
        target_rpe: line.target_rpe,
        notes: line.notes,
      });
    if (insertErr) throw new Error(insertErr.message);
  }
}

export async function createTemplateAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  try {
    const ctx = await requireManagerContext(returnTo);
    const name = asText(formData, "name");
    const description = asNullableText(formData, "description");
    const durationWeeks = Math.max(1, Math.min(52, asInt(asText(formData, "durationWeeks"), 4)));
    const daysPerWeek = Math.max(1, Math.min(7, asInt(asText(formData, "daysPerWeek"), 3)));
    if (!name) {
      throw new Error("Template name is required.");
    }

    const { data: template, error } = await ctx.supabase
      .from("program_templates")
      .insert({
        name,
        description,
        duration_weeks: durationWeeks,
        created_by: ctx.managerId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await createWeekDaySkeletonForTemplate({
      templateId: String(template.id),
      durationWeeks,
      daysPerWeek,
    });
    revalidatePath(ROUTES.manager.programs);
    revalidatePath(ROUTES.manager.programTemplate(String(template.id)));
    flashRedirect(
      ROUTES.manager.programTemplate(String(template.id)),
      "ok",
      "Template created.",
    );
  } catch (e) {
    flashRedirect(returnTo, "error", e instanceof Error ? e.message : "Failed to create template.");
  }
}

export async function updateTemplateMetaAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const templateId = asText(formData, "templateId");
  try {
    const ctx = await requireManagerContext(returnTo);
    if (!isUuid(templateId)) throw new Error("Invalid template id.");
    const name = asText(formData, "name");
    const description = asNullableText(formData, "description");
    const durationWeeks = Math.max(1, Math.min(52, asInt(asText(formData, "durationWeeks"), 4)));
    if (!name) throw new Error("Template name is required.");

    const { data: existingWeeks, error: existingWeeksErr } = await ctx.supabase
      .from("program_template_weeks")
      .select("*")
      .eq("template_id", templateId)
      .order("week_number");
    if (existingWeeksErr) throw new Error(existingWeeksErr.message);
    const weekRows = (existingWeeks ?? []) as ProgramTemplateWeekRow[];
    const maxWeek = weekRows.reduce((mx, row) => Math.max(mx, row.week_number), 0);

    const { error } = await ctx.supabase
      .from("program_templates")
      .update({
        name,
        description,
        duration_weeks: durationWeeks,
      })
      .eq("id", templateId);
    if (error) throw new Error(error.message);

    if (durationWeeks > maxWeek) {
      const weekIds = weekRows.map((w) => w.id);
      const { data: existingDays, error: daysErr } = weekIds.length
        ? await ctx.supabase
            .from("program_template_days")
            .select("*")
            .in("week_id", weekIds)
        : { data: [], error: null };
      if (daysErr) throw new Error(daysErr.message);
      let daysPerWeek = 3;
      if ((existingDays ?? []).length > 0) {
        const firstWeek = weekRows[0];
        daysPerWeek = (existingDays ?? []).filter((d) => d.week_id === firstWeek.id).length || 3;
      }
      for (let week = maxWeek + 1; week <= durationWeeks; week += 1) {
        const { data: createdWeek, error: weekErr } = await ctx.supabase
          .from("program_template_weeks")
          .insert({
            template_id: templateId,
            week_number: week,
            label: `Week ${week}`,
          })
          .select("*")
          .single();
        if (weekErr) throw new Error(weekErr.message);
        for (let day = 1; day <= daysPerWeek; day += 1) {
          const { error: dayErr } = await ctx.supabase
            .from("program_template_days")
            .insert({
              week_id: createdWeek.id,
              day_number: day,
              label: `Day ${day}`,
            });
          if (dayErr) throw new Error(dayErr.message);
        }
      }
    }

    revalidatePath(ROUTES.manager.programs);
    revalidatePath(ROUTES.manager.programTemplate(templateId));
    flashRedirect(returnTo, "ok", "Template updated.");
  } catch (e) {
    flashRedirect(returnTo, "error", e instanceof Error ? e.message : "Failed to update template.");
  }
}

export async function archiveTemplateAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const templateId = asText(formData, "templateId");
  try {
    const ctx = await requireManagerContext(returnTo);
    if (!isUuid(templateId)) throw new Error("Invalid template id.");
    const { data, error: loadErr } = await ctx.supabase
      .from("program_templates")
      .select("id, name")
      .eq("id", templateId)
      .maybeSingle();
    if (loadErr) throw new Error(loadErr.message);
    if (!data) throw new Error("Template not found.");

    const archived = String(data.name).startsWith("[ARCHIVED]");
    const nextName = archived
      ? String(data.name).replace(/^\[ARCHIVED\]\s*/, "")
      : `[ARCHIVED] ${data.name}`;

    const { error } = await ctx.supabase
      .from("program_templates")
      .update({ name: nextName })
      .eq("id", templateId);
    if (error) throw new Error(error.message);

    revalidatePath(ROUTES.manager.programs);
    revalidatePath(ROUTES.manager.programTemplate(templateId));
    flashRedirect(returnTo, "ok", archived ? "Template restored." : "Template archived.");
  } catch (e) {
    flashRedirect(returnTo, "error", e instanceof Error ? e.message : "Failed to archive template.");
  }
}

export async function addTemplateExerciseAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const templateId = asText(formData, "templateId");
  try {
    const ctx = await requireManagerContext(returnTo);
    if (!isUuid(templateId)) throw new Error("Invalid template id.");

    const weekNumber = Math.max(1, asInt(asText(formData, "weekNumber"), 1));
    const dayNumber = Math.max(1, asInt(asText(formData, "dayNumber"), 1));
    const exerciseId = asText(formData, "exerciseId");
    if (!isUuid(exerciseId)) throw new Error("Select a valid exercise.");

    const { day } = await ensureTemplateWeekAndDay({
      templateId,
      weekNumber,
      dayNumber,
    });

    const { data: existing, error: existingErr } = await ctx.supabase
      .from("program_template_day_exercises")
      .select("sequence")
      .eq("day_id", day.id)
      .order("sequence", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingErr) throw new Error(existingErr.message);
    const nextSeq = Number(existing?.sequence ?? 0) + 1;

    const setsRaw = asText(formData, "sets");
    const restRaw = asText(formData, "restSeconds");
    const rpeRaw = asText(formData, "targetRpe");

    const { error } = await ctx.supabase.from("program_template_day_exercises").insert({
      day_id: day.id,
      sequence: nextSeq,
      exercise_id: exerciseId,
      prescribed_sets: setsRaw ? asInt(setsRaw, 0) : null,
      prescribed_reps: asNullableText(formData, "reps"),
      rest_seconds: restRaw ? asInt(restRaw, 0) : null,
      tempo: asNullableText(formData, "tempo"),
      target_rpe: rpeRaw ? Number(rpeRaw) : null,
      superset_group: asNullableText(formData, "supersetGroup"),
      notes: asNullableText(formData, "notes"),
    });
    if (error) throw new Error(error.message);

    revalidatePath(ROUTES.manager.programTemplate(templateId));
    flashRedirect(returnTo, "ok", "Exercise added to template day.");
  } catch (e) {
    flashRedirect(
      returnTo,
      "error",
      e instanceof Error ? e.message : "Failed to add template exercise.",
    );
  }
}

export async function assignProgramAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  try {
    const ctx = await requireManagerContext(returnTo);
    const clientId = asText(formData, "clientId");
    const templateId = asNullableText(formData, "templateId");
    const trainerId = asNullableText(formData, "trainerId");
    const name = asText(formData, "name");
    const startDate = asText(formData, "startDate");
    const endDate = asNullableText(formData, "endDate");
    const status = asText(formData, "status");
    if (!isUuid(clientId)) throw new Error("Choose a valid client.");
    if (!name) throw new Error("Program name is required.");
    if (!startDate) throw new Error("Start date is required.");
    if (templateId && !isUuid(templateId)) throw new Error("Invalid template id.");
    if (trainerId && !isUuid(trainerId)) throw new Error("Invalid trainer.");

    const nextStatus: ClientProgramRow["status"] =
      status === "completed" || status === "cancelled" ? status : "active";

    if (nextStatus === "active") {
      await ensureProgramCanBeActive(clientId);
    }

    const { data: program, error } = await ctx.supabase
      .from("client_programs")
      .insert({
        client_id: clientId,
        template_id: templateId,
        name,
        start_date: startDate,
        end_date: endDate,
        status: nextStatus,
        author_kind: "manager",
        manager_author_id: ctx.managerId,
        primary_trainer_id: trainerId,
        ended_at: nextStatus === "active" ? null : new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const programId = String(program.id);

    if (templateId) {
      await copyTemplateToClientProgram(templateId, programId);
    } else {
      const { day } = await ensureClientProgramWeekAndDay({
        programId,
        weekNumber: Math.max(1, asInt(asText(formData, "weekNumber"), 1)),
        dayNumber: Math.max(1, asInt(asText(formData, "dayNumber"), 1)),
      });
      const exerciseId = asNullableText(formData, "exerciseId");
      if (exerciseId) {
        if (!isUuid(exerciseId)) throw new Error("Invalid exercise.");
        const { error: lineErr } = await ctx.supabase
          .from("client_program_day_exercises")
          .insert({
            day_id: day.id,
            sequence: 1,
            exercise_id: exerciseId,
            prescribed_sets: asText(formData, "sets")
              ? asInt(asText(formData, "sets"), 0)
              : null,
            prescribed_reps: asNullableText(formData, "reps"),
            rest_seconds: asText(formData, "restSeconds")
              ? asInt(asText(formData, "restSeconds"), 0)
              : null,
            tempo: asNullableText(formData, "tempo"),
            target_rpe: asText(formData, "targetRpe")
              ? Number(asText(formData, "targetRpe"))
              : null,
            notes: asNullableText(formData, "notes"),
          });
        if (lineErr) throw new Error(lineErr.message);
      }
    }

    revalidatePath(ROUTES.manager.programs);
    revalidatePath(ROUTES.manager.programClient(programId));
    flashRedirect(ROUTES.manager.programClient(programId), "ok", "Program assigned.");
  } catch (e) {
    flashRedirect(returnTo, "error", e instanceof Error ? e.message : "Failed to assign program.");
  }
}

export async function updateClientProgramStatusAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const programId = asText(formData, "programId");
  try {
    const ctx = await requireManagerContext(returnTo);
    if (!isUuid(programId)) throw new Error("Invalid program id.");

    const { data: existing, error: existingErr } = await ctx.supabase
      .from("client_programs")
      .select("*")
      .eq("id", programId)
      .maybeSingle();
    if (existingErr) throw new Error(existingErr.message);
    if (!existing) throw new Error("Program not found.");

    const statusRaw = asText(formData, "status");
    const status: ClientProgramRow["status"] =
      statusRaw === "completed" || statusRaw === "cancelled" ? statusRaw : "active";

    if (status === "active") {
      await ensureProgramCanBeActive(existing.client_id, programId);
    }

    const updates: Partial<ClientProgramRow> = {
      status,
      start_date: asText(formData, "startDate") || existing.start_date,
      end_date: asNullableText(formData, "endDate"),
      primary_trainer_id: asNullableText(formData, "trainerId"),
      ended_at: status === "active" ? null : new Date().toISOString(),
    };
    const { error } = await ctx.supabase
      .from("client_programs")
      .update(updates)
      .eq("id", programId);
    if (error) throw new Error(error.message);

    revalidatePath(ROUTES.manager.programs);
    revalidatePath(ROUTES.manager.programClient(programId));
    flashRedirect(returnTo, "ok", "Program updated.");
  } catch (e) {
    flashRedirect(returnTo, "error", e instanceof Error ? e.message : "Failed to update program.");
  }
}

export async function addClientProgramExerciseAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const programId = asText(formData, "programId");
  try {
    const ctx = await requireManagerContext(returnTo);
    if (!isUuid(programId)) throw new Error("Invalid program id.");

    const weekNumber = Math.max(1, asInt(asText(formData, "weekNumber"), 1));
    const dayNumber = Math.max(1, asInt(asText(formData, "dayNumber"), 1));
    const exerciseId = asText(formData, "exerciseId");
    if (!isUuid(exerciseId)) throw new Error("Select a valid exercise.");

    const { day } = await ensureClientProgramWeekAndDay({
      programId,
      weekNumber,
      dayNumber,
    });

    const { data: existing, error: existingErr } = await ctx.supabase
      .from("client_program_day_exercises")
      .select("sequence")
      .eq("day_id", day.id)
      .order("sequence", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingErr) throw new Error(existingErr.message);
    const nextSequence = Number(existing?.sequence ?? 0) + 1;

    const { error } = await ctx.supabase.from("client_program_day_exercises").insert({
      day_id: day.id,
      sequence: nextSequence,
      exercise_id: exerciseId,
      prescribed_sets: asText(formData, "sets") ? asInt(asText(formData, "sets"), 0) : null,
      prescribed_reps: asNullableText(formData, "reps"),
      rest_seconds: asText(formData, "restSeconds")
        ? asInt(asText(formData, "restSeconds"), 0)
        : null,
      tempo: asNullableText(formData, "tempo"),
      target_rpe: asText(formData, "targetRpe")
        ? Number(asText(formData, "targetRpe"))
        : null,
      superset_group: asNullableText(formData, "supersetGroup"),
      notes: asNullableText(formData, "notes"),
    });
    if (error) throw new Error(error.message);

    revalidatePath(ROUTES.manager.programClient(programId));
    flashRedirect(returnTo, "ok", "Exercise added. Existing session logs remain unchanged.");
  } catch (e) {
    flashRedirect(
      returnTo,
      "error",
      e instanceof Error ? e.message : "Failed to add exercise line.",
    );
  }
}

export async function resolveProgramChangeRequestAction(formData: FormData) {
  const returnTo = asNullableText(formData, "returnTo");
  const requestId = asText(formData, "requestId");
  try {
    const ctx = await requireManagerContext(returnTo);
    if (!isUuid(requestId)) throw new Error("Invalid request id.");
    const decision = asText(formData, "decision");
    if (decision !== "approved" && decision !== "rejected") {
      throw new Error("Decision must be approved or rejected.");
    }
    const note = asNullableText(formData, "managerDecisionNote");

    const { error } = await ctx.supabase
      .from("program_change_requests")
      .update({
        status: decision,
        manager_decision_note: note,
        reviewed_by: ctx.managerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);

    revalidatePath(ROUTES.manager.programs);
    if (returnTo) revalidatePath(returnTo);
    flashRedirect(returnTo, "ok", `Request ${decision}.`);
  } catch (e) {
    flashRedirect(
      returnTo,
      "error",
      e instanceof Error ? e.message : "Failed to resolve change request.",
    );
  }
}
