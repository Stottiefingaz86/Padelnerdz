-- Organiser/creator can always self-register to play their mix-in.
create or replace function public.register_interest_in_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_created_by uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select s.group_id, s.created_by into v_group_id, v_created_by
  from public.sessions s
  where s.id = p_session_id;

  if v_group_id is null then
    raise exception 'Session not found';
  end if;

  -- Ensure profile exists (FK on session_registrations.user_id)
  insert into public.profiles (id, display_name)
  values (v_uid, 'Player')
  on conflict (id) do nothing;

  -- Creator / organiser: ensure membership so they can play their own mix-in
  if not public.is_group_member(v_group_id) then
    if v_created_by = v_uid or public.is_group_organiser(v_group_id) then
      insert into public.group_memberships (group_id, user_id, role)
      values (v_group_id, v_uid, 'organiser')
      on conflict (group_id, user_id) do nothing;
    else
      raise exception 'Not a group member';
    end if;
  end if;

  if not public.is_group_member(v_group_id) then
    raise exception 'Not a group member';
  end if;

  insert into public.session_registrations (session_id, user_id, status)
  values (p_session_id, v_uid, 'registered')
  on conflict (session_id, user_id) do update
    set status = case
      when public.session_registrations.status = 'cancelled' then 'registered'::public.registration_status
      else public.session_registrations.status
    end;
end;
$$;

revoke all on function public.register_interest_in_session(uuid) from public;
revoke all on function public.register_interest_in_session(uuid) from anon;
grant execute on function public.register_interest_in_session(uuid) to authenticated;
