-- Reliable self-register for mix-ins (bypasses nested RLS quirks on upsert)
create or replace function public.register_interest_in_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select s.group_id into v_group_id
  from public.sessions s
  where s.id = p_session_id;

  if v_group_id is null then
    raise exception 'Session not found';
  end if;

  if not public.is_group_member(v_group_id) then
    raise exception 'Not a group member';
  end if;

  if not exists (select 1 from public.profiles p where p.id = v_uid) then
    insert into public.profiles (id, display_name)
    values (v_uid, 'Player')
    on conflict (id) do nothing;
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
grant execute on function public.register_interest_in_session(uuid) to authenticated;
