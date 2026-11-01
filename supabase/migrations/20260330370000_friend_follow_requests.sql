-- Follow / friend requests: request → approve → friendship → messaging

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (from_user_id <> to_user_id),
  unique (from_user_id, to_user_id)
);

create index if not exists friend_requests_to_pending_idx
  on public.friend_requests (to_user_id)
  where status = 'pending';

create index if not exists friend_requests_from_pending_idx
  on public.friend_requests (from_user_id)
  where status = 'pending';

alter table public.friend_requests enable row level security;

drop policy if exists friend_requests_select_own on public.friend_requests;
create policy friend_requests_select_own
  on public.friend_requests for select
  to authenticated
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

drop policy if exists friend_requests_insert_own on public.friend_requests;
create policy friend_requests_insert_own
  on public.friend_requests for insert
  to authenticated
  with check (auth.uid() = from_user_id and status = 'pending');

drop policy if exists friend_requests_update_recipient on public.friend_requests;
create policy friend_requests_update_recipient
  on public.friend_requests for update
  to authenticated
  using (auth.uid() = to_user_id)
  with check (auth.uid() = to_user_id);

drop policy if exists friend_requests_delete_own on public.friend_requests;
create policy friend_requests_delete_own
  on public.friend_requests for delete
  to authenticated
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create or replace function public.are_friends(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.user_id = p_a and f.friend_id = p_b
  ) and exists (
    select 1 from public.friendships f
    where f.user_id = p_b and f.friend_id = p_a
  );
$$;

revoke all on function public.are_friends(uuid, uuid) from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

create or replace function public.request_friendship(p_peer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  existing_id uuid;
  reverse_id uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_peer_id is null or p_peer_id = me then raise exception 'invalid peer'; end if;
  if not exists (select 1 from public.profiles p where p.id = p_peer_id) then
    raise exception 'player not found';
  end if;
  if public.are_friends(me, p_peer_id) then
    raise exception 'already friends';
  end if;

  -- If they already requested you, auto-accept both ways
  select id into reverse_id
  from public.friend_requests
  where from_user_id = p_peer_id and to_user_id = me and status = 'pending'
  limit 1;

  if reverse_id is not null then
    update public.friend_requests
      set status = 'accepted', responded_at = now()
      where id = reverse_id;
    insert into public.friendships (user_id, friend_id) values (me, p_peer_id)
      on conflict do nothing;
    insert into public.friendships (user_id, friend_id) values (p_peer_id, me)
      on conflict do nothing;
    return reverse_id;
  end if;

  select id into existing_id
  from public.friend_requests
  where from_user_id = me and to_user_id = p_peer_id
  limit 1;

  if existing_id is not null then
    update public.friend_requests
      set status = 'pending', responded_at = null, created_at = now()
      where id = existing_id and status <> 'pending';
    return existing_id;
  end if;

  insert into public.friend_requests (from_user_id, to_user_id, status)
  values (me, p_peer_id, 'pending')
  returning id into existing_id;

  return existing_id;
end;
$$;

revoke all on function public.request_friendship(uuid) from public, anon;
grant execute on function public.request_friendship(uuid) to authenticated;

create or replace function public.respond_friend_request(p_request_id uuid, p_accept boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  req public.friend_requests%rowtype;
begin
  if me is null then raise exception 'not authenticated'; end if;

  select * into req from public.friend_requests where id = p_request_id;
  if not found then raise exception 'request not found'; end if;
  if req.to_user_id <> me then raise exception 'not your request'; end if;
  if req.status <> 'pending' then raise exception 'request already handled'; end if;

  if p_accept then
    update public.friend_requests
      set status = 'accepted', responded_at = now()
      where id = p_request_id;
    insert into public.friendships (user_id, friend_id)
      values (req.from_user_id, req.to_user_id) on conflict do nothing;
    insert into public.friendships (user_id, friend_id)
      values (req.to_user_id, req.from_user_id) on conflict do nothing;
  else
    update public.friend_requests
      set status = 'declined', responded_at = now()
      where id = p_request_id;
  end if;

  return p_accept;
end;
$$;

revoke all on function public.respond_friend_request(uuid, boolean) from public, anon;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;

-- Messaging only after mutual friendship (group context optional).
create or replace function public.open_dm_thread(p_peer_id uuid, p_group_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  tid uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_peer_id is null or p_peer_id = me then raise exception 'invalid peer'; end if;

  if not public.are_friends(me, p_peer_id) then
    raise exception 'Follow request must be accepted before messaging';
  end if;

  if p_group_id is not null then
    if not public.is_group_member(p_group_id) then
      raise exception 'you must be in this group';
    end if;
    if not exists (
      select 1 from public.group_memberships m
      where m.group_id = p_group_id and m.user_id = p_peer_id
    ) then
      raise exception 'player is not in this group';
    end if;
  end if;

  if me < p_peer_id then
    a := me; b := p_peer_id;
  else
    a := p_peer_id; b := me;
  end if;

  insert into public.dm_threads (user_a, user_b, context_group_id, created_by)
  values (a, b, p_group_id, me)
  on conflict (user_a, user_b) do update
    set context_group_id = coalesce(public.dm_threads.context_group_id, excluded.context_group_id),
        last_message_at = greatest(public.dm_threads.last_message_at, now())
  returning id into tid;

  return tid;
end;
$$;

revoke all on function public.open_dm_thread(uuid, uuid) from public, anon;
grant execute on function public.open_dm_thread(uuid, uuid) to authenticated;
