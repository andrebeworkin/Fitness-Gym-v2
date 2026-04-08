"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/navigation/dashboard-nav";
import { getManagerServerContext } from "@/lib/auth/manager-server";
import { createSupabaseAdminClient } from "@/services/supabase/admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

const SEX_VALUES = new Set([
  "female",
  "male",
  "non_binary",
  "prefer_not",
  "other",
]);

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createMemberAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getManagerServerContext();
  if (!ctx) {
    return { ok: false, error: "You must be signed in as a manager." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const dateOfBirth = String(formData.get("date_of_birth") ?? "").trim() || null;
  const sexRaw = String(formData.get("sex") ?? "").trim();
  const sex = SEX_VALUES.has(sexRaw) ? sexRaw : null;
  const primaryLocationId =
    String(formData.get("primary_location_id") ?? "").trim() || null;
  const membershipTypeId = String(
    formData.get("membership_type_id") ?? "",
  ).trim();
  const trainerId = String(formData.get("trainer_id") ?? "").trim() || null;
  const goalTitle = String(formData.get("goal_title") ?? "").trim();
  const goalDetail = String(formData.get("goal_detail") ?? "").trim() || null;
  const internalNote = String(formData.get("internal_note") ?? "").trim();

  if (!email || !displayName) {
    return { ok: false, error: "Email and full name are required." };
  }

  if (!membershipTypeId || !isUuid(membershipTypeId)) {
    return { ok: false, error: "Choose a membership type." };
  }

  if (primaryLocationId && !isUuid(primaryLocationId)) {
    return { ok: false, error: "Invalid location." };
  }

  if (trainerId && !isUuid(trainerId)) {
    return { ok: false, error: "Invalid trainer." };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return {
      ok: false,
      error:
        "SUPABASE_SERVICE_ROLE_KEY is not set on the server. Add it to .env.local to create Auth users from the app, or create the user in the Supabase Dashboard first and use a profile-only flow later. See docs/MANAGER_MEMBERS_VERTICAL.md.",
    };
  }

  if (password.length < 8) {
    return {
      ok: false,
      error: "Password must be at least 8 characters for new Auth users.",
    };
  }

  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (authErr || !created.user) {
    return {
      ok: false,
      error: authErr?.message ?? "Could not create Auth user.",
    };
  }

  const userId = created.user.id;

  const { error: profErr } = await ctx.supabase
    .from("profiles")
    .update({
      display_name: displayName,
      email,
      phone,
      date_of_birth: dateOfBirth,
      sex,
      primary_location_id: primaryLocationId,
      role: "client",
    })
    .eq("id", userId);

  if (profErr) {
    return { ok: false, error: profErr.message };
  }

  const { error: memErr } = await ctx.supabase.rpc(
    "manager_supersede_membership_period",
    {
      p_client_id: userId,
      p_new_membership_type_id: membershipTypeId,
      p_notes: "Initial membership (manager onboarding)",
    },
  );

  if (memErr) {
    return { ok: false, error: memErr.message };
  }

  if (trainerId) {
    const { error: taErr } = await ctx.supabase
      .from("trainer_client_assignments")
      .insert({
        client_id: userId,
        trainer_id: trainerId,
        is_primary: true,
        effective_from: new Date().toISOString().slice(0, 10),
      });
    if (taErr) {
      return { ok: false, error: taErr.message };
    }
  }

  if (goalTitle) {
    const { error: gErr } = await ctx.supabase.from("client_goals").insert({
      client_id: userId,
      title: goalTitle,
      detail: goalDetail,
      is_active: true,
      created_by: ctx.managerId,
    });
    if (gErr) {
      return { ok: false, error: gErr.message };
    }
  }

  if (internalNote) {
    const { error: nErr } = await ctx.supabase.from("staff_notes").insert({
      client_id: userId,
      audience: "manager_only",
      author_id: ctx.managerId,
      body: internalNote,
    });
    if (nErr) {
      return { ok: false, error: nErr.message };
    }
  }

  revalidatePath(ROUTES.manager.members);
  redirect(`${ROUTES.manager.member(userId)}?created=1`);
}

export async function updateMemberProfileAction(
  memberId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getManagerServerContext();
  if (!ctx) {
    return { ok: false, error: "You must be signed in as a manager." };
  }
  if (!isUuid(memberId)) {
    return { ok: false, error: "Invalid member." };
  }

  const displayName = String(formData.get("display_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const dateOfBirth = String(formData.get("date_of_birth") ?? "").trim() || null;
  const sexRaw = String(formData.get("sex") ?? "").trim();
  const sex = SEX_VALUES.has(sexRaw) ? sexRaw : null;
  const primaryLocationId =
    String(formData.get("primary_location_id") ?? "").trim() || null;

  if (!displayName) {
    return { ok: false, error: "Full name is required." };
  }

  if (primaryLocationId && !isUuid(primaryLocationId)) {
    return { ok: false, error: "Invalid location." };
  }

  const { error: uErr } = await ctx.supabase
    .from("profiles")
    .update({
      display_name: displayName,
      phone,
      date_of_birth: dateOfBirth,
      sex,
      primary_location_id: primaryLocationId,
    })
    .eq("id", memberId)
    .eq("role", "client");

  if (uErr) {
    return { ok: false, error: uErr.message };
  }

  const showPlanHistory = formData.has("show_plan_history");
  const allowSelfLog = formData.has("allow_self_log");

  const { error: pErr } = await ctx.supabase
    .from("client_training_preferences")
    .upsert(
      {
        client_id: memberId,
        show_plan_history: showPlanHistory,
        allow_self_log: allowSelfLog,
      },
      { onConflict: "client_id" },
    );

  if (pErr) {
    return { ok: false, error: pErr.message };
  }

  revalidatePath(ROUTES.manager.members);
  revalidatePath(`${ROUTES.manager.members}/${memberId}`);
  revalidatePath(`${ROUTES.manager.members}/${memberId}/edit`);
  return { ok: true };
}

export async function reassignTrainerAction(
  memberId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getManagerServerContext();
  if (!ctx) {
    return { ok: false, error: "You must be signed in as a manager." };
  }
  if (!isUuid(memberId)) {
    return { ok: false, error: "Invalid member." };
  }

  const trainerId = String(formData.get("trainer_id") ?? "").trim();
  const clear = formData.get("clear_trainer") === "on";

  if (!clear && (!trainerId || !isUuid(trainerId))) {
    return { ok: false, error: "Select a trainer or choose “No assigned trainer”." };
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: openRows, error: oErr } = await ctx.supabase
    .from("trainer_client_assignments")
    .select("id")
    .eq("client_id", memberId)
    .is("effective_to", null);

  if (oErr) {
    return { ok: false, error: oErr.message };
  }

  for (const row of openRows ?? []) {
    const { error: cErr } = await ctx.supabase
      .from("trainer_client_assignments")
      .update({ effective_to: today })
      .eq("id", row.id);
    if (cErr) {
      return { ok: false, error: cErr.message };
    }
  }

  if (!clear && trainerId) {
    const { error: iErr } = await ctx.supabase
      .from("trainer_client_assignments")
      .insert({
        client_id: memberId,
        trainer_id: trainerId,
        is_primary: true,
        effective_from: today,
      });
    if (iErr) {
      return { ok: false, error: iErr.message };
    }
  }

  revalidatePath(ROUTES.manager.members);
  revalidatePath(`${ROUTES.manager.members}/${memberId}`);
  revalidatePath(`${ROUTES.manager.members}/${memberId}/edit`);
  return { ok: true };
}

export async function changeMembershipAction(
  memberId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getManagerServerContext();
  if (!ctx) {
    return { ok: false, error: "You must be signed in as a manager." };
  }
  if (!isUuid(memberId)) {
    return { ok: false, error: "Invalid member." };
  }

  const newTypeId = String(formData.get("membership_type_id") ?? "").trim();
  const notes = String(formData.get("change_notes") ?? "").trim() || null;

  if (!newTypeId || !isUuid(newTypeId)) {
    return { ok: false, error: "Select a new membership type." };
  }

  const { error: rpcErr } = await ctx.supabase.rpc(
    "manager_supersede_membership_period",
    {
      p_client_id: memberId,
      p_new_membership_type_id: newTypeId,
      p_notes: notes,
    },
  );

  if (rpcErr) {
    return { ok: false, error: rpcErr.message };
  }

  revalidatePath(ROUTES.manager.members);
  revalidatePath(`${ROUTES.manager.members}/${memberId}`);
  revalidatePath(`${ROUTES.manager.members}/${memberId}/edit`);
  return { ok: true };
}

export async function addManagerStaffNoteAction(
  memberId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await getManagerServerContext();
  if (!ctx) {
    return { ok: false, error: "You must be signed in as a manager." };
  }
  if (!isUuid(memberId)) {
    return { ok: false, error: "Invalid member." };
  }

  const body = String(formData.get("note_body") ?? "").trim();
  const audienceRaw = String(formData.get("audience") ?? "manager_only");
  const audience =
    audienceRaw === "staff_internal" ? "staff_internal" : "manager_only";

  if (!body) {
    return { ok: false, error: "Note cannot be empty." };
  }

  const { error } = await ctx.supabase.from("staff_notes").insert({
    client_id: memberId,
    audience,
    author_id: ctx.managerId,
    body,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`${ROUTES.manager.members}/${memberId}`);
  return { ok: true };
}
