"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseDateTimeLocal, parseTimeToMinutes } from "@/app/(manager)/manager/schedule/_lib/time";
import {
  consumeEntitlementForAppointment,
  reverseEntitlementForCancelledAppointment,
} from "@/lib/entitlements/ledger";
import { getManagerServerContext } from "@/lib/auth/manager-server";
import { ROUTES } from "@/lib/navigation/dashboard-nav";
import type { AppointmentRow, StaffShiftRow, TrainerAvailabilitySlotRow } from "@/types/database.types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function flashRedirect(
  returnTo: string | null,
  kind: "ok" | "error",
  message: string,
): never {
  const base = returnTo && returnTo.startsWith(ROUTES.manager.schedule)
    ? returnTo
    : ROUTES.manager.schedule;
  const url = new URL(base, "http://localhost");
  url.searchParams.set(kind, message);
  redirect(`${url.pathname}?${url.searchParams.toString()}`);
}

function parseShiftTimeOrThrow(value: string, label: string): number {
  const minutes = parseTimeToMinutes(value);
  if (minutes === null) {
    throw new Error(`Invalid ${label} time.`);
  }
  return minutes;
}

function toIsoOrThrow(value: string, label: string): Date {
  const d = parseDateTimeLocal(value);
  if (!d) throw new Error(`Invalid ${label}.`);
  if (d.getMinutes() % 30 !== 0 || d.getSeconds() !== 0) {
    throw new Error(`${label} must use 30-minute increments.`);
  }
  return d;
}

async function requireManagerContext(returnTo: string | null) {
  const ctx = await getManagerServerContext();
  if (!ctx) {
    flashRedirect(returnTo, "error", "Manager session required.");
  }
  return ctx;
}

async function ensureNoShiftOverlap(
  shifts: StaffShiftRow[],
  shiftDate: string,
  startTime: string,
  endTime: string,
  ignoreShiftId?: string,
) {
  const newStart = parseShiftTimeOrThrow(startTime, "shift start");
  const newEnd = parseShiftTimeOrThrow(endTime, "shift end");
  if (newEnd <= newStart) {
    throw new Error("Shift end must be after start.");
  }
  const overlap = shifts.some((s) => {
    if (ignoreShiftId && s.id === ignoreShiftId) return false;
    if (s.shift_date !== shiftDate) return false;
    const existingStart = parseShiftTimeOrThrow(s.start_time, "existing shift start");
    const existingEnd = parseShiftTimeOrThrow(s.end_time, "existing shift end");
    return newStart < existingEnd && newEnd > existingStart;
  });
  if (overlap) {
    throw new Error("Shift overlaps an existing shift for this staff member.");
  }
}

async function findShiftCoverage(
  shifts: StaffShiftRow[],
  startsAt: Date,
  endsAt: Date,
  trainerId: string,
  locationId: string,
) {
  const dateKey = `${startsAt.getFullYear()}-${String(startsAt.getMonth() + 1).padStart(2, "0")}-${String(startsAt.getDate()).padStart(2, "0")}`;
  const startMinutes = startsAt.getHours() * 60 + startsAt.getMinutes();
  const endMinutes = endsAt.getHours() * 60 + endsAt.getMinutes();

  return shifts.some((s) => {
    if (s.staff_id !== trainerId) return false;
    if (s.location_id !== locationId) return false;
    if (s.shift_date !== dateKey) return false;
    const shiftStart = parseShiftTimeOrThrow(s.start_time, "shift start");
    const shiftEnd = parseShiftTimeOrThrow(s.end_time, "shift end");
    return shiftStart <= startMinutes && shiftEnd >= endMinutes;
  });
}

async function ensureAppointmentConstraints(params: {
  existingAppointments: AppointmentRow[];
  existingSlots: TrainerAvailabilitySlotRow[];
  trainerShifts: StaffShiftRow[];
  startsAt: Date;
  endsAt: Date;
  trainerId: string;
  clientId: string;
  locationId: string;
  appointmentIdToIgnore?: string;
}) {
  const {
    existingAppointments,
    existingSlots,
    trainerShifts,
    startsAt,
    endsAt,
    trainerId,
    clientId,
    locationId,
    appointmentIdToIgnore,
  } = params;

  const overlap = existingAppointments.some((a) => {
    if (appointmentIdToIgnore && a.id === appointmentIdToIgnore) return false;
    if (a.status === "cancelled") return false;
    const sameTrainer =
      a.primary_trainer_id === trainerId || a.substitute_trainer_id === trainerId;
    const sameClient = a.client_id === clientId;
    if (!sameTrainer && !sameClient) return false;
    const start = new Date(a.starts_at);
    const end = new Date(a.ends_at);
    return startsAt < end && endsAt > start;
  });
  if (overlap) {
    throw new Error(
      "Trainer or client already has an overlapping appointment in this window.",
    );
  }

  const hasShiftCoverage = await findShiftCoverage(
    trainerShifts,
    startsAt,
    endsAt,
    trainerId,
    locationId,
  );
  if (!hasShiftCoverage) {
    throw new Error("Appointment is outside the trainer shift window.");
  }

  const matchingSlot = existingSlots.find(
    (s) =>
      s.trainer_id === trainerId &&
      s.location_id === locationId &&
      s.starts_at === startsAt.toISOString() &&
      s.ends_at === endsAt.toISOString(),
  );
  if (!matchingSlot) {
    throw new Error("No matching trainer availability slot for this time.");
  }

  return matchingSlot;
}

function scheduleReturnPath(formData: FormData): string | null {
  const returnTo = String(formData.get("return_to") ?? "").trim();
  return returnTo || null;
}

export async function createShiftAction(formData: FormData) {
  const returnTo = scheduleReturnPath(formData);
  try {
    const ctx = await requireManagerContext(returnTo);
    const staffId = String(formData.get("staff_id") ?? "").trim();
    const locationId = String(formData.get("location_id") ?? "").trim();
    const shiftDate = String(formData.get("shift_date") ?? "").trim();
    const startTime = String(formData.get("start_time") ?? "").trim();
    const endTime = String(formData.get("end_time") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim() || null;

    if (!isUuid(staffId) || !isUuid(locationId) || !shiftDate || !startTime || !endTime) {
      throw new Error("Shift form is incomplete.");
    }

    const { data: sameDayShifts, error: shiftsErr } = await ctx.supabase
      .from("staff_shifts")
      .select("*")
      .eq("staff_id", staffId)
      .eq("shift_date", shiftDate);
    if (shiftsErr) throw new Error(shiftsErr.message);

    await ensureNoShiftOverlap(
      (sameDayShifts ?? []) as StaffShiftRow[],
      shiftDate,
      startTime,
      endTime,
    );

    const { error: assignErr } = await ctx.supabase
      .from("staff_location_assignments")
      .upsert(
        {
          staff_id: staffId,
          location_id: locationId,
          work_date: shiftDate,
          created_by: ctx.managerId,
        },
        { onConflict: "staff_id,work_date" },
      );
    if (assignErr) throw new Error(assignErr.message);

    const { error } = await ctx.supabase.from("staff_shifts").insert({
      staff_id: staffId,
      location_id: locationId,
      shift_date: shiftDate,
      start_time: startTime,
      end_time: endTime,
      notes,
      created_by: ctx.managerId,
    });
    if (error) throw new Error(error.message);

    revalidatePath(ROUTES.manager.schedule);
    flashRedirect(returnTo, "ok", "Shift created.");
  } catch (err) {
    flashRedirect(returnTo, "error", err instanceof Error ? err.message : "Could not create shift.");
  }
}

export async function updateShiftAction(formData: FormData) {
  const returnTo = scheduleReturnPath(formData);
  try {
    const ctx = await requireManagerContext(returnTo);
    const shiftId = String(formData.get("shift_id") ?? "").trim();
    const staffId = String(formData.get("staff_id") ?? "").trim();
    const locationId = String(formData.get("location_id") ?? "").trim();
    const shiftDate = String(formData.get("shift_date") ?? "").trim();
    const startTime = String(formData.get("start_time") ?? "").trim();
    const endTime = String(formData.get("end_time") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim() || null;

    if (!isUuid(shiftId) || !isUuid(staffId) || !isUuid(locationId)) {
      throw new Error("Invalid shift update payload.");
    }

    const { data: sameDayShifts, error: shiftsErr } = await ctx.supabase
      .from("staff_shifts")
      .select("*")
      .eq("staff_id", staffId)
      .eq("shift_date", shiftDate);
    if (shiftsErr) throw new Error(shiftsErr.message);
    await ensureNoShiftOverlap(
      (sameDayShifts ?? []) as StaffShiftRow[],
      shiftDate,
      startTime,
      endTime,
      shiftId,
    );

    const { error: assignErr } = await ctx.supabase
      .from("staff_location_assignments")
      .upsert(
        {
          staff_id: staffId,
          location_id: locationId,
          work_date: shiftDate,
          created_by: ctx.managerId,
        },
        { onConflict: "staff_id,work_date" },
      );
    if (assignErr) throw new Error(assignErr.message);

    const { error } = await ctx.supabase
      .from("staff_shifts")
      .update({
        staff_id: staffId,
        location_id: locationId,
        shift_date: shiftDate,
        start_time: startTime,
        end_time: endTime,
        notes,
      })
      .eq("id", shiftId);
    if (error) throw new Error(error.message);

    revalidatePath(ROUTES.manager.schedule);
    flashRedirect(returnTo, "ok", "Shift updated.");
  } catch (err) {
    flashRedirect(returnTo, "error", err instanceof Error ? err.message : "Could not update shift.");
  }
}

export async function deleteShiftAction(formData: FormData) {
  const returnTo = scheduleReturnPath(formData);
  try {
    const ctx = await requireManagerContext(returnTo);
    const shiftId = String(formData.get("shift_id") ?? "").trim();
    if (!isUuid(shiftId)) throw new Error("Invalid shift.");

    const { data: shift, error: shiftErr } = await ctx.supabase
      .from("staff_shifts")
      .select("*")
      .eq("id", shiftId)
      .maybeSingle();
    if (shiftErr) throw new Error(shiftErr.message);
    if (!shift) throw new Error("Shift not found.");

    const startIso = new Date(`${shift.shift_date}T${shift.start_time}`).toISOString();
    const endIso = new Date(`${shift.shift_date}T${shift.end_time}`).toISOString();

    const { data: blockingAppointments, error: blockErr } = await ctx.supabase
      .from("appointments")
      .select("id")
      .eq("primary_trainer_id", shift.staff_id)
      .eq("location_id", shift.location_id)
      .neq("status", "cancelled")
      .lt("starts_at", endIso)
      .gt("ends_at", startIso)
      .limit(1);
    if (blockErr) throw new Error(blockErr.message);
    if ((blockingAppointments ?? []).length > 0) {
      throw new Error("Shift has live appointments in its window. Reassign/reschedule first.");
    }

    const { error } = await ctx.supabase.from("staff_shifts").delete().eq("id", shiftId);
    if (error) throw new Error(error.message);
    revalidatePath(ROUTES.manager.schedule);
    flashRedirect(returnTo, "ok", "Shift removed.");
  } catch (err) {
    flashRedirect(returnTo, "error", err instanceof Error ? err.message : "Could not remove shift.");
  }
}

export async function createAvailabilityAction(formData: FormData) {
  const returnTo = scheduleReturnPath(formData);
  try {
    const ctx = await requireManagerContext(returnTo);
    const trainerId = String(formData.get("trainer_id") ?? "").trim();
    const locationId = String(formData.get("location_id") ?? "").trim();
    const startsAtInput = String(formData.get("starts_at") ?? "").trim();

    if (!isUuid(trainerId) || !isUuid(locationId) || !startsAtInput) {
      throw new Error("Availability form is incomplete.");
    }

    const startsAt = toIsoOrThrow(startsAtInput, "Availability start");
    const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);

    const shiftDate = `${startsAt.getFullYear()}-${String(startsAt.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(startsAt.getDate()).padStart(2, "0")}`;
    const { data: shifts, error: shiftsErr } = await ctx.supabase
      .from("staff_shifts")
      .select("*")
      .eq("staff_id", trainerId)
      .eq("location_id", locationId)
      .eq("shift_date", shiftDate);
    if (shiftsErr) throw new Error(shiftsErr.message);
    const covered = await findShiftCoverage(
      (shifts ?? []) as StaffShiftRow[],
      startsAt,
      endsAt,
      trainerId,
      locationId,
    );
    if (!covered) {
      throw new Error("Availability must be inside a trainer shift at the same location.");
    }

    const { data: existing, error: existingErr } = await ctx.supabase
      .from("trainer_availability_slots")
      .select("id")
      .eq("trainer_id", trainerId)
      .lt("starts_at", endsAt.toISOString())
      .gt("ends_at", startsAt.toISOString())
      .limit(1);
    if (existingErr) throw new Error(existingErr.message);
    if ((existing ?? []).length > 0) {
      throw new Error("Availability overlaps an existing slot.");
    }

    const { error } = await ctx.supabase.from("trainer_availability_slots").insert({
      trainer_id: trainerId,
      location_id: locationId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      is_open: true,
      created_by: ctx.managerId,
    });
    if (error) throw new Error(error.message);
    revalidatePath(ROUTES.manager.schedule);
    flashRedirect(returnTo, "ok", "Availability slot created.");
  } catch (err) {
    flashRedirect(returnTo, "error", err instanceof Error ? err.message : "Could not create availability.");
  }
}

export async function updateAvailabilityAction(formData: FormData) {
  const returnTo = scheduleReturnPath(formData);
  try {
    const ctx = await requireManagerContext(returnTo);
    const slotId = String(formData.get("slot_id") ?? "").trim();
    const trainerId = String(formData.get("trainer_id") ?? "").trim();
    const locationId = String(formData.get("location_id") ?? "").trim();
    const startsAtInput = String(formData.get("starts_at") ?? "").trim();
    const markClosed = formData.has("mark_closed");

    if (!isUuid(slotId) || !isUuid(trainerId) || !isUuid(locationId) || !startsAtInput) {
      throw new Error("Invalid availability update payload.");
    }

    const startsAt = toIsoOrThrow(startsAtInput, "Availability start");
    const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);

    const { data: booked, error: bookedErr } = await ctx.supabase
      .from("appointments")
      .select("id, status")
      .eq("availability_slot_id", slotId)
      .neq("status", "cancelled");
    if (bookedErr) throw new Error(bookedErr.message);
    if ((booked ?? []).length > 0) {
      throw new Error("Slot is booked by an appointment and cannot be moved.");
    }

    const { data: existing, error: existingErr } = await ctx.supabase
      .from("trainer_availability_slots")
      .select("id")
      .eq("trainer_id", trainerId)
      .neq("id", slotId)
      .lt("starts_at", endsAt.toISOString())
      .gt("ends_at", startsAt.toISOString())
      .limit(1);
    if (existingErr) throw new Error(existingErr.message);
    if ((existing ?? []).length > 0) {
      throw new Error("Availability overlaps an existing slot.");
    }

    const { error } = await ctx.supabase
      .from("trainer_availability_slots")
      .update({
        trainer_id: trainerId,
        location_id: locationId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        is_open: !markClosed,
      })
      .eq("id", slotId);
    if (error) throw new Error(error.message);

    revalidatePath(ROUTES.manager.schedule);
    flashRedirect(returnTo, "ok", "Availability slot updated.");
  } catch (err) {
    flashRedirect(returnTo, "error", err instanceof Error ? err.message : "Could not update availability.");
  }
}

export async function deleteAvailabilityAction(formData: FormData) {
  const returnTo = scheduleReturnPath(formData);
  try {
    const ctx = await requireManagerContext(returnTo);
    const slotId = String(formData.get("slot_id") ?? "").trim();
    if (!isUuid(slotId)) throw new Error("Invalid slot.");

    const { data: booked, error: bookedErr } = await ctx.supabase
      .from("appointments")
      .select("id")
      .eq("availability_slot_id", slotId)
      .neq("status", "cancelled")
      .limit(1);
    if (bookedErr) throw new Error(bookedErr.message);
    if ((booked ?? []).length > 0) {
      throw new Error("Slot is attached to an appointment. Mark it closed instead.");
    }

    const { error } = await ctx.supabase
      .from("trainer_availability_slots")
      .delete()
      .eq("id", slotId);
    if (error) throw new Error(error.message);

    revalidatePath(ROUTES.manager.schedule);
    flashRedirect(returnTo, "ok", "Availability slot removed.");
  } catch (err) {
    flashRedirect(returnTo, "error", err instanceof Error ? err.message : "Could not remove availability.");
  }
}

async function resolveClientLocationConflict(
  ctx: Awaited<ReturnType<typeof requireManagerContext>>,
  clientId: string,
  locationId: string,
) {
  const { data: client, error } = await ctx.supabase
    .from("profiles")
    .select("primary_location_id")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const primaryLocationId = client?.primary_location_id as string | null | undefined;
  if (primaryLocationId && primaryLocationId !== locationId) {
    throw new Error("Client home location does not match selected appointment location.");
  }
}

async function enforceSubstituteRule(
  ctx: Awaited<ReturnType<typeof requireManagerContext>>,
  clientId: string,
  substituteTrainerId: string | null,
) {
  if (!substituteTrainerId) return;
  const { data: activePeriod, error: periodErr } = await ctx.supabase
    .from("client_membership_periods")
    .select("membership_type_id")
    .eq("client_id", clientId)
    .eq("status", "active")
    .maybeSingle();
  if (periodErr) throw new Error(periodErr.message);
  if (!activePeriod) {
    throw new Error("Client has no active membership; cannot assign substitute trainer.");
  }

  const { data: mt, error: mtErr } = await ctx.supabase
    .from("membership_types")
    .select("slug")
    .eq("id", activePeriod.membership_type_id as string)
    .maybeSingle();
  if (mtErr) throw new Error(mtErr.message);
  if (mt?.slug !== "private") {
    throw new Error("Substitute trainer is only supported for Private members.");
  }
}

export async function createAppointmentAction(formData: FormData) {
  const returnTo = scheduleReturnPath(formData);
  try {
    const ctx = await requireManagerContext(returnTo);
    const locationId = String(formData.get("location_id") ?? "").trim();
    const clientId = String(formData.get("client_id") ?? "").trim();
    const trainerId = String(formData.get("primary_trainer_id") ?? "").trim();
    const substituteRaw = String(formData.get("substitute_trainer_id") ?? "").trim();
    const startsAtInput = String(formData.get("starts_at") ?? "").trim();

    if (!isUuid(locationId) || !isUuid(clientId) || !isUuid(trainerId) || !startsAtInput) {
      throw new Error("Appointment form is incomplete.");
    }

    const substituteTrainerId = substituteRaw && isUuid(substituteRaw) ? substituteRaw : null;
    const startsAt = toIsoOrThrow(startsAtInput, "Appointment start");
    const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);

    await resolveClientLocationConflict(ctx, clientId, locationId);
    await enforceSubstituteRule(ctx, clientId, substituteTrainerId);

    const shiftDate = `${startsAt.getFullYear()}-${String(startsAt.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(startsAt.getDate()).padStart(2, "0")}`;
    const [appointmentsRes, slotsRes, shiftsRes] = await Promise.all([
      ctx.supabase
        .from("appointments")
        .select("*")
        .lt("starts_at", endsAt.toISOString())
        .gt("ends_at", startsAt.toISOString()),
      ctx.supabase
        .from("trainer_availability_slots")
        .select("*")
        .eq("trainer_id", trainerId)
        .eq("location_id", locationId)
        .eq("starts_at", startsAt.toISOString())
        .eq("ends_at", endsAt.toISOString()),
      ctx.supabase
        .from("staff_shifts")
        .select("*")
        .eq("staff_id", trainerId)
        .eq("location_id", locationId)
        .eq("shift_date", shiftDate),
    ]);
    if (appointmentsRes.error) throw new Error(appointmentsRes.error.message);
    if (slotsRes.error) throw new Error(slotsRes.error.message);
    if (shiftsRes.error) throw new Error(shiftsRes.error.message);

    const matchingSlot = await ensureAppointmentConstraints({
      existingAppointments: (appointmentsRes.data ?? []) as AppointmentRow[],
      existingSlots: (slotsRes.data ?? []) as TrainerAvailabilitySlotRow[],
      trainerShifts: (shiftsRes.data ?? []) as StaffShiftRow[],
      startsAt,
      endsAt,
      trainerId,
      clientId,
      locationId,
    });

    if (!matchingSlot.is_open) {
      throw new Error("Availability slot is not open.");
    }

    const appointmentId = crypto.randomUUID();
    const { error: insertErr } = await ctx.supabase.from("appointments").insert({
      id: appointmentId,
      location_id: locationId,
      client_id: clientId,
      primary_trainer_id: trainerId,
      substitute_trainer_id: substituteTrainerId,
      availability_slot_id: matchingSlot.id,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "scheduled",
      no_show: false,
      created_by: ctx.managerId,
    });
    if (insertErr) throw new Error(insertErr.message);

    try {
      await consumeEntitlementForAppointment({
        context: { supabase: ctx.supabase, actorId: ctx.managerId },
        appointment: {
          id: appointmentId,
          client_id: clientId,
          starts_at: startsAt.toISOString(),
        },
        note: "Consumed by manager appointment creation",
      });
    } catch (consumeErr) {
      await ctx.supabase.from("appointments").delete().eq("id", appointmentId);
      await ctx.supabase
        .from("trainer_availability_slots")
        .update({ is_open: true })
        .eq("id", matchingSlot.id);
      throw consumeErr;
    }

    const { error: closeSlotErr } = await ctx.supabase
      .from("trainer_availability_slots")
      .update({ is_open: false })
      .eq("id", matchingSlot.id);
    if (closeSlotErr) throw new Error(closeSlotErr.message);

    revalidatePath(ROUTES.manager.schedule);
    flashRedirect(returnTo, "ok", "Appointment created.");
  } catch (err) {
    flashRedirect(returnTo, "error", err instanceof Error ? err.message : "Could not create appointment.");
  }
}

export async function updateAppointmentAction(formData: FormData) {
  const returnTo = scheduleReturnPath(formData);
  try {
    const ctx = await requireManagerContext(returnTo);
    const appointmentId = String(formData.get("appointment_id") ?? "").trim();
    const locationId = String(formData.get("location_id") ?? "").trim();
    const clientId = String(formData.get("client_id") ?? "").trim();
    const trainerId = String(formData.get("primary_trainer_id") ?? "").trim();
    const substituteRaw = String(formData.get("substitute_trainer_id") ?? "").trim();
    const startsAtInput = String(formData.get("starts_at") ?? "").trim();

    if (
      !isUuid(appointmentId) ||
      !isUuid(locationId) ||
      !isUuid(clientId) ||
      !isUuid(trainerId) ||
      !startsAtInput
    ) {
      throw new Error("Invalid appointment update payload.");
    }

    const substituteTrainerId = substituteRaw && isUuid(substituteRaw) ? substituteRaw : null;
    const startsAt = toIsoOrThrow(startsAtInput, "Appointment start");
    const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);

    await resolveClientLocationConflict(ctx, clientId, locationId);
    await enforceSubstituteRule(ctx, clientId, substituteTrainerId);

    const { data: existingAppt, error: apptErr } = await ctx.supabase
      .from("appointments")
      .select("*")
      .eq("id", appointmentId)
      .maybeSingle();
    if (apptErr) throw new Error(apptErr.message);
    if (!existingAppt) throw new Error("Appointment not found.");
    if (existingAppt.client_id !== clientId) {
      throw new Error(
        "Changing appointment client is disabled for audit safety. Cancel and create a new appointment instead.",
      );
    }

    const shiftDate = `${startsAt.getFullYear()}-${String(startsAt.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(startsAt.getDate()).padStart(2, "0")}`;
    const [appointmentsRes, slotsRes, shiftsRes] = await Promise.all([
      ctx.supabase
        .from("appointments")
        .select("*")
        .lt("starts_at", endsAt.toISOString())
        .gt("ends_at", startsAt.toISOString()),
      ctx.supabase
        .from("trainer_availability_slots")
        .select("*")
        .eq("trainer_id", trainerId)
        .eq("location_id", locationId)
        .eq("starts_at", startsAt.toISOString())
        .eq("ends_at", endsAt.toISOString()),
      ctx.supabase
        .from("staff_shifts")
        .select("*")
        .eq("staff_id", trainerId)
        .eq("location_id", locationId)
        .eq("shift_date", shiftDate),
    ]);
    if (appointmentsRes.error) throw new Error(appointmentsRes.error.message);
    if (slotsRes.error) throw new Error(slotsRes.error.message);
    if (shiftsRes.error) throw new Error(shiftsRes.error.message);

    const matchingSlot = await ensureAppointmentConstraints({
      existingAppointments: (appointmentsRes.data ?? []) as AppointmentRow[],
      existingSlots: (slotsRes.data ?? []) as TrainerAvailabilitySlotRow[],
      trainerShifts: (shiftsRes.data ?? []) as StaffShiftRow[],
      startsAt,
      endsAt,
      trainerId,
      clientId,
      locationId,
      appointmentIdToIgnore: appointmentId,
    });

    if (!matchingSlot.is_open && matchingSlot.id !== existingAppt.availability_slot_id) {
      throw new Error("Target availability slot is already booked.");
    }

    if (existingAppt.status === "cancelled") {
      await consumeEntitlementForAppointment({
        context: { supabase: ctx.supabase, actorId: ctx.managerId },
        appointment: {
          id: appointmentId,
          client_id: clientId,
          starts_at: startsAt.toISOString(),
        },
        note: "Consumed by manager appointment reactivation",
      });
    }

    const { error: updateErr } = await ctx.supabase
      .from("appointments")
      .update({
        location_id: locationId,
        client_id: clientId,
        primary_trainer_id: trainerId,
        substitute_trainer_id: substituteTrainerId,
        availability_slot_id: matchingSlot.id,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: "scheduled",
        no_show: false,
      })
      .eq("id", appointmentId);
    if (updateErr) throw new Error(updateErr.message);

    if (existingAppt.availability_slot_id && existingAppt.availability_slot_id !== matchingSlot.id) {
      await ctx.supabase
        .from("trainer_availability_slots")
        .update({ is_open: true })
        .eq("id", existingAppt.availability_slot_id);
    }
    await ctx.supabase
      .from("trainer_availability_slots")
      .update({ is_open: false })
      .eq("id", matchingSlot.id);

    revalidatePath(ROUTES.manager.schedule);
    flashRedirect(returnTo, "ok", "Appointment updated.");
  } catch (err) {
    flashRedirect(returnTo, "error", err instanceof Error ? err.message : "Could not update appointment.");
  }
}

export async function cancelAppointmentAction(formData: FormData) {
  const returnTo = scheduleReturnPath(formData);
  try {
    const ctx = await requireManagerContext(returnTo);
    const appointmentId = String(formData.get("appointment_id") ?? "").trim();
    const cancelReason = String(formData.get("cancel_reason") ?? "").trim() || "Cancelled by manager";
    if (!isUuid(appointmentId)) throw new Error("Invalid appointment.");

    const { data: existing, error: exErr } = await ctx.supabase
      .from("appointments")
      .select("id, client_id, availability_slot_id")
      .eq("id", appointmentId)
      .maybeSingle();
    if (exErr) throw new Error(exErr.message);
    if (!existing) throw new Error("Appointment not found.");

    const { error } = await ctx.supabase
      .from("appointments")
      .update({
        status: "cancelled",
        no_show: false,
        cancel_reason: cancelReason,
      })
      .eq("id", appointmentId);
    if (error) throw new Error(error.message);

    if (existing.availability_slot_id) {
      await ctx.supabase
        .from("trainer_availability_slots")
        .update({ is_open: true })
        .eq("id", existing.availability_slot_id);
    }

    await reverseEntitlementForCancelledAppointment({
      context: { supabase: ctx.supabase, actorId: ctx.managerId },
      appointment: { id: existing.id, client_id: existing.client_id },
      note: "Reversed by manager cancellation",
    });

    revalidatePath(ROUTES.manager.schedule);
    flashRedirect(returnTo, "ok", "Appointment cancelled.");
  } catch (err) {
    flashRedirect(returnTo, "error", err instanceof Error ? err.message : "Could not cancel appointment.");
  }
}

export async function markAppointmentCompletedAction(formData: FormData) {
  const returnTo = scheduleReturnPath(formData);
  try {
    const ctx = await requireManagerContext(returnTo);
    const appointmentId = String(formData.get("appointment_id") ?? "").trim();
    if (!isUuid(appointmentId)) throw new Error("Invalid appointment.");

    const { error } = await ctx.supabase
      .from("appointments")
      .update({
        status: "completed",
        no_show: false,
        attendance_marked_at: new Date().toISOString(),
        attendance_marked_by: ctx.managerId,
      })
      .eq("id", appointmentId);
    if (error) throw new Error(error.message);

    revalidatePath(ROUTES.manager.schedule);
    flashRedirect(returnTo, "ok", "Appointment marked completed.");
  } catch (err) {
    flashRedirect(returnTo, "error", err instanceof Error ? err.message : "Could not mark appointment.");
  }
}

export async function markAppointmentNoShowAction(formData: FormData) {
  const returnTo = scheduleReturnPath(formData);
  try {
    const ctx = await requireManagerContext(returnTo);
    const appointmentId = String(formData.get("appointment_id") ?? "").trim();
    if (!isUuid(appointmentId)) throw new Error("Invalid appointment.");

    const { error } = await ctx.supabase
      .from("appointments")
      .update({
        status: "no_show",
        no_show: true,
        attendance_marked_at: new Date().toISOString(),
        attendance_marked_by: ctx.managerId,
      })
      .eq("id", appointmentId);
    if (error) throw new Error(error.message);

    revalidatePath(ROUTES.manager.schedule);
    flashRedirect(returnTo, "ok", "Appointment marked no-show.");
  } catch (err) {
    flashRedirect(returnTo, "error", err instanceof Error ? err.message : "Could not mark no-show.");
  }
}

export async function resolveChangeRequestAction(formData: FormData) {
  const returnTo = scheduleReturnPath(formData);
  try {
    const ctx = await requireManagerContext(returnTo);
    const requestId = String(formData.get("request_id") ?? "").trim();
    const decision = String(formData.get("decision") ?? "").trim();
    if (!isUuid(requestId)) throw new Error("Invalid request.");
    if (decision !== "approved" && decision !== "rejected") {
      throw new Error("Decision must be approved or rejected.");
    }

    const { error } = await ctx.supabase
      .from("appointment_change_requests")
      .update({
        status: decision,
        resolved_at: new Date().toISOString(),
        resolved_by: ctx.managerId,
      })
      .eq("id", requestId);
    if (error) throw new Error(error.message);

    revalidatePath(ROUTES.manager.schedule);
    flashRedirect(returnTo, "ok", `Change request ${decision}.`);
  } catch (err) {
    flashRedirect(returnTo, "error", err instanceof Error ? err.message : "Could not resolve request.");
  }
}
