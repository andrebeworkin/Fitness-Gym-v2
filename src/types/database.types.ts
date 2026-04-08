/**
 * Hand-maintained types aligned with `supabase/migrations/*.sql`.
 * Regenerate from Supabase CLI later: `supabase gen types typescript --local > src/types/database.gen.ts`
 * and merge or replace this file.
 */

import type { AppRole } from "@/types/roles";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProfileRow = {
  id: string;
  role: AppRole;
  display_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  sex: string | null;
  primary_location_id: string | null;
  avatar_url: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GymLocationRow = {
  id: string;
  name: string;
  code: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ClientMembershipPeriodRow = {
  id: string;
  client_id: string;
  membership_type_id: string;
  effective_from: string;
  effective_to: string | null;
  status: "active" | "superseded" | "ended";
  billing_month: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MembershipTypeRow = {
  id: string;
  name: string;
  slug: "open_gym" | "semi_private" | "private";
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ClientProgramRow = {
  id: string;
  client_id: string;
  template_id: string | null;
  name: string;
  start_date: string;
  end_date: string | null;
  ended_at: string | null;
  status: "active" | "completed" | "cancelled";
  author_kind: "manager" | "trainer";
  manager_author_id: string | null;
  primary_trainer_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ProgramTemplateRow = {
  id: string;
  name: string;
  description: string | null;
  duration_weeks: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProgramTemplateWeekRow = {
  id: string;
  template_id: string;
  week_number: number;
  label: string | null;
};

export type ProgramTemplateDayRow = {
  id: string;
  week_id: string;
  day_number: number;
  label: string | null;
};

export type ProgramTemplateDayExerciseRow = {
  id: string;
  day_id: string;
  sequence: number;
  exercise_id: string;
  superset_group: string | null;
  prescribed_sets: number | null;
  prescribed_reps: string | null;
  rest_seconds: number | null;
  tempo: string | null;
  target_rpe: number | null;
  notes: string | null;
};

export type ClientProgramWeekRow = {
  id: string;
  program_id: string;
  week_number: number;
  label: string | null;
};

export type ClientProgramDayRow = {
  id: string;
  week_id: string;
  day_number: number;
  label: string | null;
};

export type ClientProgramDayExerciseRow = {
  id: string;
  day_id: string;
  sequence: number;
  exercise_id: string;
  superset_group: string | null;
  prescribed_sets: number | null;
  prescribed_reps: string | null;
  rest_seconds: number | null;
  tempo: string | null;
  target_rpe: number | null;
  notes: string | null;
};

export type ProgramChangeRequestRow = {
  id: string;
  client_program_id: string;
  requested_by: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  request_summary: string | null;
  payload: Json;
  manager_decision_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ExerciseRow = {
  id: string;
  name: string;
  short_description: string | null;
  machine: string | null;
  bar_type: string | null;
  grip: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ExerciseAlternativeRow = {
  exercise_id: string;
  alternative_exercise_id: string;
  note: string | null;
};

export type ExerciseProgressionRow = {
  exercise_id: string;
  progression_exercise_id: string;
  note: string | null;
};

export type ExerciseRegressionRow = {
  exercise_id: string;
  regression_exercise_id: string;
  note: string | null;
};

export type AppointmentRow = {
  id: string;
  location_id: string;
  client_id: string;
  primary_trainer_id: string;
  substitute_trainer_id: string | null;
  availability_slot_id: string | null;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  attendance_marked_at: string | null;
  attendance_marked_by: string | null;
  no_show: boolean;
  cancel_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffShiftRow = {
  id: string;
  staff_id: string;
  location_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TrainerAvailabilitySlotRow = {
  id: string;
  trainer_id: string;
  location_id: string;
  starts_at: string;
  ends_at: string;
  is_open: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AppointmentChangeRequestRow = {
  id: string;
  appointment_id: string;
  requested_by: string | null;
  request_type: string;
  payload: Json;
  status: string;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
};

export type WorkoutSessionRow = {
  id: string;
  client_id: string;
  client_program_id: string | null;
  client_program_day_id: string | null;
  location_id: string | null;
  trainer_id: string | null;
  appointment_id: string | null;
  started_at: string;
  completed_at: string | null;
  status: "in_progress" | "completed" | "abandoned";
  created_at: string;
  updated_at: string;
};

export type WorkoutSessionExerciseRow = {
  id: string;
  session_id: string;
  sequence: number;
  prescribed_line_id: string | null;
  performed_exercise_id: string;
  substituted: boolean;
  substitution_note: string | null;
  similar_muscle_group_asserted: boolean | null;
  created_at: string;
};

export type WorkoutSetLogRow = {
  id: string;
  session_exercise_id: string;
  set_number: number;
  performed_reps: number | null;
  performed_weight_kg: number | null;
  performed_rpe: number | null;
  performed_rest_seconds: number | null;
  skipped: boolean;
  skip_reason: string | null;
  created_at: string;
};

export type ClientSessionNoteRow = {
  id: string;
  session_id: string;
  client_id: string;
  author_id: string | null;
  body: string | null;
  pain_reported: boolean;
  discomfort_reported: boolean;
  skipped_exercises_note: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientIncidentRow = {
  id: string;
  client_id: string;
  session_id: string | null;
  appointment_id: string | null;
  reported_by: string | null;
  kind: "pain" | "dizziness" | "form_issue" | "missed_appointment" | "other";
  description: string | null;
  created_at: string;
};

export type InvoiceRow = {
  id: string;
  client_id: string;
  location_id: string | null;
  status:
    | "draft"
    | "sent"
    | "partial"
    | "paid"
    | "overdue"
    | "voided";
  amount_cents: number;
  amount_paid_cents: number;
  currency: string;
  issued_at: string | null;
  due_at: string | null;
  voided_at: string | null;
  title: string | null;
  memo: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EmergencyContactRow = {
  id: string;
  client_id: string;
  full_name: string;
  relationship: string | null;
  phone: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

export type ClientTrainingPreferencesRow = {
  client_id: string;
  show_plan_history: boolean;
  allow_self_log: boolean;
  created_at: string;
  updated_at: string;
};

export type TrainerClientAssignmentRow = {
  id: string;
  client_id: string;
  trainer_id: string;
  is_primary: boolean;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
};

export type MembershipChangeHistoryRow = {
  id: string;
  client_id: string;
  from_membership_type_id: string | null;
  to_membership_type_id: string;
  changed_at: string;
  changed_by: string | null;
  reason: string | null;
  related_period_id: string | null;
};

export type ClientGoalRow = {
  id: string;
  client_id: string;
  title: string;
  detail: string | null;
  target_date: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientAssessmentRow = {
  id: string;
  client_id: string;
  assessed_at: string;
  assessor_id: string | null;
  location_id: string | null;
  summary: string | null;
  body: string | null;
  metrics: Json | null;
  supersedes_assessment_id: string | null;
  created_at: string;
};

export type ProgressPhotoRow = {
  id: string;
  client_id: string;
  taken_on: string;
  caption: string | null;
  visibility_client: boolean;
  storage_bucket: string;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
};

export type StaffNoteRow = {
  id: string;
  client_id: string;
  session_id: string | null;
  audience: "staff_internal" | "manager_only";
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type PaymentRecordRow = {
  id: string;
  invoice_id: string;
  amount_cents: number;
  currency: string;
  method: string;
  reference: string | null;
  received_at: string;
  recorded_by: string | null;
  created_at: string;
};

export type ReceiptRow = {
  id: string;
  invoice_id: string | null;
  payment_record_id: string | null;
  amount_cents: number | null;
  issued_at: string;
  storage_bucket: string;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
};

export type FinancialDocumentRow = {
  id: string;
  invoice_id: string | null;
  kind: "invoice_pdf" | "receipt_pdf" | "other";
  storage_bucket: string;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
};

export type EntitlementLedgerEntryRow = {
  id: string;
  client_id: string;
  membership_period_id: string | null;
  source_kind: "included_membership" | "purchased_add_on" | "manual_adjustment";
  event_kind:
    | "award"
    | "booking_consume"
    | "booking_reversal"
    | "manual_adjustment"
    | "session_completed"
    | "session_no_show";
  delta: number;
  appointment_id: string | null;
  workout_session_id: string | null;
  credit_row_id: string | null;
  add_on_row_id: string | null;
  related_entry_id: string | null;
  note: string | null;
  idempotency_key: string | null;
  created_by: string | null;
  created_at: string;
};

/** Narrow helper for Supabase `.from("profiles")` style queries until full codegen. */
export type TableName =
  | "profiles"
  | "gym_locations"
  | "membership_types"
  | "client_membership_periods"
  | "client_programs"
  | "appointments"
  | "workout_sessions"
  | "invoices";
