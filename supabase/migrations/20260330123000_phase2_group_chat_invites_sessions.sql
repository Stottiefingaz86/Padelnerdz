-- Group chat, invite codes, session registrations

alter table public.groups
  add column if not exists invite_code text unique;

update public.groups
set invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where invite_code is null;

alter table public.groups
  alter column invite_code set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) > 0 and char_length(body) <= 4000),
  created_at timestamptz not null default now()
);

create index if not exists group_messages_group_created_idx
  on public.group_messages (group_id, created_at desc);

do $$ begin
  create type public.registration_status as enum (
    'registered',
    'waitlist',
    'selected',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.session_registrations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.registration_status not null default 'registered',
  created_at timestamptz not null default now(),
  unique (session_id, user_id)
);

alter table public.group_messages enable row level security;
alter table public.session_registrations enable row level security;
