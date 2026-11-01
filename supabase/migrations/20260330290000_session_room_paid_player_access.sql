-- Paid players and organisers can see session rooms (not only existing members).
drop policy if exists "session_rooms_select_members" on public.session_rooms;
drop policy if exists "session_rooms_select_access" on public.session_rooms;
create policy "session_rooms_select_access"
  on public.session_rooms for select
  to authenticated
  using (
    public.is_session_room_member(id)
    or exists (
      select 1 from public.sessions s
      where s.id = session_id
        and public.is_group_organiser(s.group_id)
    )
    or exists (
      select 1 from public.session_registrations r
      where r.session_id = session_rooms.session_id
        and r.user_id = auth.uid()
        and r.status = 'paid'
    )
  );

drop policy if exists "session_room_members_select_peers" on public.session_room_members;
drop policy if exists "session_room_members_select_access" on public.session_room_members;
create policy "session_room_members_select_access"
  on public.session_room_members for select
  to authenticated
  using (
    public.is_session_room_member(session_room_id)
    or exists (
      select 1
      from public.session_rooms r
      join public.sessions s on s.id = r.session_id
      where r.id = session_room_id
        and public.is_group_organiser(s.group_id)
    )
  );

drop policy if exists "session_room_members_insert_organisers" on public.session_room_members;
drop policy if exists "session_room_members_insert_access" on public.session_room_members;
create policy "session_room_members_insert_access"
  on public.session_room_members for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.session_rooms r
      join public.sessions s on s.id = r.session_id
      where r.id = session_room_id
        and public.is_group_organiser(s.group_id)
    )
    or (
      user_id = auth.uid()
      and exists (
        select 1
        from public.session_rooms r
        join public.session_registrations reg on reg.session_id = r.session_id
        where r.id = session_room_id
          and reg.user_id = auth.uid()
          and reg.status = 'paid'
      )
    )
  );

drop policy if exists "session_room_messages_select" on public.session_room_messages;
create policy "session_room_messages_select"
  on public.session_room_messages for select
  to authenticated
  using (
    public.is_session_room_member(session_room_id)
    or exists (
      select 1
      from public.session_rooms r
      join public.sessions s on s.id = r.session_id
      where r.id = session_room_id
        and public.is_group_organiser(s.group_id)
    )
  );

drop policy if exists "session_room_messages_insert" on public.session_room_messages;
create policy "session_room_messages_insert"
  on public.session_room_messages for insert
  to authenticated
  with check (
    (
      public.is_session_room_member(session_room_id)
      or exists (
        select 1
        from public.session_rooms r
        join public.sessions s on s.id = r.session_id
        where r.id = session_room_id
          and public.is_group_organiser(s.group_id)
      )
    )
    and (sender_id is null or sender_id = auth.uid())
  );

-- Backfill: every paid registration gets room membership when a room exists.
insert into public.session_room_members (session_room_id, user_id)
select sr.id, r.user_id
from public.session_registrations r
join public.session_rooms sr on sr.session_id = r.session_id
where r.status = 'paid'
on conflict do nothing;
