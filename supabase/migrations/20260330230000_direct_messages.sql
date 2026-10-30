-- 1:1 DMs — organisers can open a thread with a group member (e.g. level trial).

create table if not exists public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  context_group_id uuid references public.groups (id) on delete set null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint dm_threads_ordered check (user_a < user_b),
  constraint dm_threads_pair unique (user_a, user_b)
);

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists dm_messages_thread_created_idx
  on public.dm_messages (thread_id, created_at);

create index if not exists dm_threads_last_msg_idx
  on public.dm_threads (last_message_at desc);

create or replace function public.is_dm_participant(p_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dm_threads t
    where t.id = p_thread_id
      and (t.user_a = auth.uid() or t.user_b = auth.uid())
  );
$$;

revoke all on function public.is_dm_participant(uuid) from public, anon;
grant execute on function public.is_dm_participant(uuid) to authenticated;

create or replace function public.open_dm_thread(p_peer_id uuid, p_group_id uuid)
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
  if me is null then
    raise exception 'not authenticated';
  end if;
  if p_peer_id is null or p_peer_id = me then
    raise exception 'invalid peer';
  end if;
  if p_group_id is null then
    raise exception 'group required';
  end if;
  if not public.is_group_organiser(p_group_id) then
    raise exception 'only organisers can start a direct message from a group';
  end if;
  if not exists (
    select 1 from public.group_memberships m
    where m.group_id = p_group_id and m.user_id = p_peer_id
  ) then
    raise exception 'player is not in this group';
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

create or replace function public.touch_dm_thread()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dm_threads
    set last_message_at = new.created_at
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists dm_messages_touch_thread on public.dm_messages;
create trigger dm_messages_touch_thread
  after insert on public.dm_messages
  for each row execute function public.touch_dm_thread();

alter table public.dm_threads enable row level security;
alter table public.dm_messages enable row level security;

drop policy if exists dm_threads_select on public.dm_threads;
create policy dm_threads_select on public.dm_threads
  for select to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());

drop policy if exists dm_threads_insert on public.dm_threads;
create policy dm_threads_insert on public.dm_threads
  for insert to authenticated
  with check (false);

drop policy if exists dm_messages_select on public.dm_messages;
create policy dm_messages_select on public.dm_messages
  for select to authenticated
  using (public.is_dm_participant(thread_id));

drop policy if exists dm_messages_insert on public.dm_messages;
create policy dm_messages_insert on public.dm_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_dm_participant(thread_id)
  );
