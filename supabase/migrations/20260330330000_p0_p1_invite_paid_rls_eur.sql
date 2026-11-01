-- P0/P1: registration paid lock, invite-code join, EUR default

-- 1) Sessions currency → EUR
alter table public.sessions
  alter column currency set default 'EUR';

update public.sessions
set currency = 'EUR'
where currency is distinct from 'EUR';

-- 2) session_registrations: players/organisers cannot set status = paid
--    (paid only via service_role webhook / server)
drop policy if exists session_registrations_update on public.session_registrations;

drop policy if exists session_registrations_update_player on public.session_registrations;
create policy session_registrations_update_player
  on public.session_registrations for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and status in ('cancelled'::public.registration_status, 'registered'::public.registration_status)
  );

drop policy if exists session_registrations_update_organiser on public.session_registrations;
create policy session_registrations_update_organiser
  on public.session_registrations for update
  to authenticated
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_registrations.session_id
        and public.is_group_organiser(s.group_id)
    )
  )
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = session_registrations.session_id
        and public.is_group_organiser(s.group_id)
    )
    and status in (
      'registered'::public.registration_status,
      'waitlist'::public.registration_status,
      'selected'::public.registration_status,
      'cancelled'::public.registration_status,
      'no_show'::public.registration_status
    )
  );

-- Tighten insert: only interest as registered
drop policy if exists session_registrations_insert on public.session_registrations;
create policy session_registrations_insert
  on public.session_registrations for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'registered'::public.registration_status
    and exists (
      select 1 from public.sessions s
      where s.id = session_registrations.session_id
        and public.is_group_member(s.group_id)
    )
  );

-- 3) Invite code join for public / approval / private
drop function if exists public.join_group_by_invite_code(text);

create function public.join_group_by_invite_code(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_group_id uuid;
  v_code text := upper(trim(coalesce(p_code, '')));
  v_already boolean := false;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if length(v_code) < 4 then
    raise exception 'Enter a valid invite code';
  end if;

  select g.id into v_group_id
  from public.groups g
  where g.invite_code = v_code;

  if v_group_id is null then
    raise exception 'Invite code not found';
  end if;

  select exists (
    select 1 from public.group_memberships m
    where m.group_id = v_group_id and m.user_id = v_uid
  ) into v_already;

  if not v_already then
    insert into public.group_memberships (group_id, user_id, role)
    values (v_group_id, v_uid, 'member'::public.group_role);

    update public.group_join_requests
    set status = 'approved',
        resolved_at = now()
    where group_id = v_group_id
      and user_id = v_uid
      and status = 'pending';
  end if;

  return json_build_object(
    'group_id', v_group_id,
    'joined', not v_already
  );
end;
$$;

revoke all on function public.join_group_by_invite_code(text) from public;
grant execute on function public.join_group_by_invite_code(text) to authenticated;
