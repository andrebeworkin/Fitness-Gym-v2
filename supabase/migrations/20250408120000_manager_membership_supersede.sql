-- Atomic membership supersede for managers (preserves history, one active row per client)

create or replace function public.manager_supersede_membership_period(
  p_client_id uuid,
  p_new_membership_type_id uuid,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old record;
  v_new_id uuid;
  v_manager uuid := auth.uid();
begin
  if not public.is_manager() then
    raise exception 'forbidden: manager role required';
  end if;

  select id, membership_type_id
  into v_old
  from public.client_membership_periods
  where client_id = p_client_id
    and status = 'active'
  for update;

  if found then
    update public.client_membership_periods
    set
      status = 'superseded',
      effective_to = now(),
      updated_at = now()
    where id = v_old.id;

    insert into public.client_membership_periods (
      client_id,
      membership_type_id,
      effective_from,
      effective_to,
      status,
      notes,
      created_by
    )
    values (
      p_client_id,
      p_new_membership_type_id,
      now(),
      null,
      'active',
      p_notes,
      v_manager
    )
    returning id into v_new_id;

    insert into public.membership_change_history (
      client_id,
      from_membership_type_id,
      to_membership_type_id,
      changed_by,
      reason,
      related_period_id
    )
    values (
      p_client_id,
      v_old.membership_type_id,
      p_new_membership_type_id,
      v_manager,
      p_notes,
      v_new_id
    );
  else
    -- No active period: create first active row (onboarding / data repair)
    insert into public.client_membership_periods (
      client_id,
      membership_type_id,
      effective_from,
      effective_to,
      status,
      notes,
      created_by
    )
    values (
      p_client_id,
      p_new_membership_type_id,
      now(),
      null,
      'active',
      p_notes,
      v_manager
    )
    returning id into v_new_id;

    insert into public.membership_change_history (
      client_id,
      from_membership_type_id,
      to_membership_type_id,
      changed_by,
      reason,
      related_period_id
    )
    values (
      p_client_id,
      null,
      p_new_membership_type_id,
      v_manager,
      p_notes,
      v_new_id
    );
  end if;

  return v_new_id;
end;
$$;

grant execute on function public.manager_supersede_membership_period(uuid, uuid, text) to authenticated;

comment on function public.manager_supersede_membership_period(uuid, uuid, text) is
  'Manager-only: closes active client_membership_period (if any) and inserts new active row + history. No proration.';
