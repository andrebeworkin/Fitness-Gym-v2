-- Membership types, historical periods, change log, credits, invoices, payments, financial documents

create table public.membership_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_types_locked_names check (
    slug in ('open_gym', 'semi_private', 'private')
  )
);

-- Historical membership windows — NEVER overwrite rows; close periods instead.
create table public.client_membership_periods (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  membership_type_id uuid not null references public.membership_types (id) on delete restrict,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  status public.membership_period_status not null default 'active',
  billing_month date,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_membership_periods_effective_chk check (
    effective_to is null
    or effective_to > effective_from
  )
);

create index client_membership_periods_client_idx on public.client_membership_periods (client_id);
create index client_membership_periods_active_idx on public.client_membership_periods (client_id)
where status = 'active';

-- At most one active period per client
create unique index client_membership_one_active
  on public.client_membership_periods (client_id)
  where status = 'active';

-- Append-only style audit (optional dual-write from app; can also derive from periods)
create table public.membership_change_history (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  from_membership_type_id uuid references public.membership_types (id),
  to_membership_type_id uuid not null references public.membership_types (id) on delete restrict,
  changed_at timestamptz not null default now(),
  changed_by uuid references public.profiles (id),
  reason text,
  related_period_id uuid references public.client_membership_periods (id)
);

create index membership_change_history_client_idx on public.membership_change_history (client_id, changed_at desc);

-- Semi-Private: complimentary 30-min + purchased add-on sessions (quantities / ledger)
create table public.client_training_credits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  membership_period_id uuid references public.client_membership_periods (id) on delete set null,
  kind public.training_credit_kind not null,
  quantity int not null check (quantity >= 0),
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  label text,
  created_at timestamptz not null default now()
);

create index client_training_credits_client_idx on public.client_training_credits (client_id);

-- Purchased add-on sessions (explicit line items for reporting)
create table public.trainer_session_add_ons (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  membership_period_id uuid references public.client_membership_periods (id) on delete set null,
  sessions_purchased int not null check (sessions_purchased > 0),
  unit_amount_cents int not null check (unit_amount_cents >= 0),
  currency char(3) not null default 'USD',
  purchased_at timestamptz not null default now(),
  invoice_id uuid,
  notes text,
  created_by uuid references public.profiles (id)
);

create index trainer_session_add_ons_client_idx on public.trainer_session_add_ons (client_id);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  location_id uuid references public.gym_locations (id),
  status public.invoice_status not null default 'draft',
  amount_cents int not null check (amount_cents >= 0),
  amount_paid_cents int not null default 0 check (amount_paid_cents >= 0),
  currency char(3) not null default 'USD',
  issued_at timestamptz,
  due_at timestamptz,
  voided_at timestamptz,
  title text,
  memo text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index invoices_client_idx on public.invoices (client_id, created_at desc);
create index invoices_status_due_idx on public.invoices (status, due_at);

-- Link add-ons to invoices after invoices table exists
alter table public.trainer_session_add_ons
  add constraint trainer_session_add_ons_invoice_fk
  foreign key (invoice_id) references public.invoices (id) on delete set null;

-- Payment ledger (no live card processor in v1 — manual/offline recording)
create table public.payment_records (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  amount_cents int not null check (amount_cents > 0),
  currency char(3) not null default 'USD',
  method text not null,
  reference text,
  received_at timestamptz not null default now(),
  recorded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index payment_records_invoice_idx on public.payment_records (invoice_id);

-- Receipt documents (file in Storage + metadata)
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices (id) on delete set null,
  payment_record_id uuid references public.payment_records (id) on delete set null,
  amount_cents int,
  issued_at timestamptz not null default now(),
  storage_bucket text not null,
  storage_path text not null,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index receipts_invoice_idx on public.receipts (invoice_id);

-- Invoice PDFs / attachments
create table public.financial_documents (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices (id) on delete cascade,
  kind public.financial_document_kind not null,
  storage_bucket text not null,
  storage_path text not null,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index financial_documents_invoice_idx on public.financial_documents (invoice_id);

-- Derived helper column updates could be done in app; optional generated column skipped for portability
