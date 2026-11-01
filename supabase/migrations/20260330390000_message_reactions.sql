-- Emoji / like reactions on group chat and session room messages

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  channel_type text not null check (channel_type in ('group', 'session_room')),
  channel_id uuid not null,
  message_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (char_length(emoji) >= 1 and char_length(emoji) <= 16),
  created_at timestamptz not null default now(),
  unique (channel_type, message_id, user_id, emoji)
);

create index if not exists message_reactions_message_idx
  on public.message_reactions (channel_type, message_id);

create index if not exists message_reactions_channel_idx
  on public.message_reactions (channel_type, channel_id);

alter table public.message_reactions enable row level security;

create or replace function public.can_react_on_channel(
  p_channel_type text,
  p_channel_id uuid
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_channel_type = 'group' then public.is_group_member(p_channel_id)
    when p_channel_type = 'session_room' then (
      public.is_session_room_member(p_channel_id)
      or exists (
        select 1
        from public.session_rooms r
        join public.sessions s on s.id = r.session_id
        where r.id = p_channel_id
          and public.is_group_organiser(s.group_id)
      )
    )
    else false
  end;
$$;

revoke all on function public.can_react_on_channel(text, uuid) from public, anon;
grant execute on function public.can_react_on_channel(text, uuid) to authenticated;

drop policy if exists "message_reactions_select" on public.message_reactions;
create policy "message_reactions_select"
  on public.message_reactions for select
  to authenticated
  using (public.can_react_on_channel(channel_type, channel_id));

drop policy if exists "message_reactions_insert" on public.message_reactions;
create policy "message_reactions_insert"
  on public.message_reactions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.can_react_on_channel(channel_type, channel_id)
  );

drop policy if exists "message_reactions_delete" on public.message_reactions;
create policy "message_reactions_delete"
  on public.message_reactions for delete
  to authenticated
  using (
    user_id = auth.uid()
    and public.can_react_on_channel(channel_type, channel_id)
  );
