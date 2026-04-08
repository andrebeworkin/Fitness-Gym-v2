-- Formula 4 Fitness — extensions and enum types
-- Safe to re-run only via fresh migration chain; do not duplicate enums in prod.

create extension if not exists "pgcrypto";

-- App roles aligned with route groups / PRD
create type public.app_role as enum ('manager', 'trainer', 'client');

-- Membership lifecycle (period rows)
create type public.membership_period_status as enum ('active', 'superseded', 'ended');

-- Invoice / billing
create type public.invoice_status as enum (
  'draft',
  'sent',
  'partial',
  'paid',
  'overdue',
  'voided'
);

-- Training credits (Semi-Private complimentary + purchased add-ons)
create type public.training_credit_kind as enum ('complimentary_30', 'purchased_30');

-- Appointment lifecycle (30-minute increments)
create type public.appointment_status as enum (
  'scheduled',
  'completed',
  'cancelled',
  'no_show'
);

-- Program assignment / prescription instance
create type public.client_program_status as enum ('active', 'completed', 'cancelled');

-- Who authored the canonical prescription tree
create type public.program_author_kind as enum ('manager', 'trainer');

-- Change requests against manager-authored programs
create type public.program_change_request_status as enum ('pending', 'approved', 'rejected', 'withdrawn');

-- Workout session
create type public.workout_session_status as enum ('in_progress', 'completed', 'abandoned');

-- Incident / flag taxonomy (operational safety)
create type public.incident_kind as enum (
  'pain',
  'dizziness',
  'form_issue',
  'missed_appointment',
  'other'
);

-- Staff note audience (strict separation)
create type public.staff_note_audience as enum ('staff_internal', 'manager_only');

-- Financial attachment classification
create type public.financial_document_kind as enum ('invoice_pdf', 'receipt_pdf', 'other');
