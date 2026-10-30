-- Phase 1 foundations: profiles, groups, memberships, sessions, session rooms
-- RLS enforced on every user/group-owned resource.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone_e164 text unique,
  display_name text,
  bio text,
  avatar_url text,
  level numeric(3, 1),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone_e164)
  values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Groups
-- ---------------------------------------------------------------------------
create type public.group_visibility as enum ('public', 'approval', 'private');
create type public.group_role as enum ('owner', 'admin', 'organiser', 'member');

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  visibility public.group_visibility not null default 'private',
  cover_url text,
  location_label text,
  latitude double precision,
  longitude double precision,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger groups_updated_at
  before update on public.groups
  for each row execute function public.set_updated_at();

create table public.group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.group_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index group_memberships_user_idx on public.group_memberships (user_id);
create index group_memberships_group_idx on public.group_memberships (group_id);

-- Auto-add creator as owner
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_memberships (group_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (group_id, user_id) do nothing;
  return new;
end;
$$;

create trigger on_group_created
  after insert on public.groups
  for each row execute function public.handle_new_group();

-- ---------------------------------------------------------------------------
-- Sessions + session rooms (first-class private event spaces)
-- ---------------------------------------------------------------------------
create type public.session_format as enum (
  'kings_and_queens',
  'americano',
  'mexicano',
  'custom'
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  venue_label text,
  format public.session_format not null default 'custom',
  courts int not null default 1 check (courts > 0),
  max_players int not null default 8 check (max_players > 0),
  price_cents int,
  currency text not null default 'GBP',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.session_rooms (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions (id) on delete cascade,
  chat_channel_id text,
  created_at timestamptz not null default now()
);

create table public.session_room_members (
  session_room_id uuid not null references public.session_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (session_room_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_memberships m
    where m.group_id = p_group_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_group_organiser(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_memberships m
    where m.group_id = p_group_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin', 'organiser')
  );
$$;

create or replace function public.is_session_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.session_room_members m
    where m.session_room_id = p_room_id
      and m.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.sessions enable row level security;
alter table public.session_rooms enable row level security;
alter table public.session_room_members enable row level security;

-- Profiles: readable by authenticated users; only owner can update
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Groups
create policy "groups_select_member_or_public"
  on public.groups for select
  to authenticated
  using (
    visibility = 'public'
    or visibility = 'approval'
    or public.is_group_member(id)
  );

create policy "groups_insert_authenticated"
  on public.groups for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "groups_update_organisers"
  on public.groups for update
  to authenticated
  using (public.is_group_organiser(id))
  with check (public.is_group_organiser(id));

-- Memberships
create policy "memberships_select_same_group"
  on public.group_memberships for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_group_member(group_id)
  );

create policy "memberships_insert_controlled"
  on public.group_memberships for insert
  to authenticated
  with check (
    public.is_group_organiser(group_id)
    or (
      user_id = auth.uid()
      and exists (
        select 1 from public.groups g
        where g.id = group_id
          and g.visibility = 'public'
      )
    )
    or (
      user_id = auth.uid()
      and role = 'owner'
      and exists (
        select 1 from public.groups g
        where g.id = group_id
          and g.created_by = auth.uid()
      )
    )
  );

create policy "memberships_update_organisers"
  on public.group_memberships for update
  to authenticated
  using (public.is_group_organiser(group_id))
  with check (public.is_group_organiser(group_id));

create policy "memberships_delete_self_or_organiser"
  on public.group_memberships for delete
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_group_organiser(group_id)
  );

-- Sessions: group members only
create policy "sessions_select_group_members"
  on public.sessions for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "sessions_insert_organisers"
  on public.sessions for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.is_group_organiser(group_id)
  );

create policy "sessions_update_organisers"
  on public.sessions for update
  to authenticated
  using (public.is_group_organiser(group_id))
  with check (public.is_group_organiser(group_id));

-- Session rooms: selected players only — never all group members by default
create policy "session_rooms_select_members"
  on public.session_rooms for select
  to authenticated
  using (public.is_session_room_member(id));

create policy "session_rooms_insert_organisers"
  on public.session_rooms for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.sessions s
      where s.id = session_id
        and public.is_group_organiser(s.group_id)
    )
  );

create policy "session_room_members_select_peers"
  on public.session_room_members for select
  to authenticated
  using (public.is_session_room_member(session_room_id));

create policy "session_room_members_insert_organisers"
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
  );
