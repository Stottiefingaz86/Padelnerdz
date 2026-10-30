-- Chat media kinds, wrap cards, session close, commission, friend tags, mute prefs

do $$ begin
  alter type public.message_kind add value if not exists 'image';
exception when others then
  begin
    alter type public.message_kind add value 'image';
  exception when duplicate_object then null;
  end;
end $$;

do $$ begin
  alter type public.message_kind add value if not exists 'video';
exception when others then
  begin
    alter type public.message_kind add value 'video';
  exception when duplicate_object then null;
  end;
end $$;

do $$ begin
  alter type public.message_kind add value if not exists 'wrap_card';
exception when others then
  begin
    alter type public.message_kind add value 'wrap_card';
  exception when duplicate_object then null;
  end;
end $$;

do $$ begin
  alter type public.message_kind add value if not exists 'accept_notice';
exception when others then
  begin
    alter type public.message_kind add value 'accept_notice';
  exception when duplicate_object then null;
  end;
end $$;

alter table public.group_messages
  alter column sender_id drop not null;

alter table public.group_messages
  add column if not exists kind text not null default 'text',
  add column if not exists payload jsonb not null default '{}'::jsonb;

alter table public.sessions
  add column if not exists commission_cents int not null default 100,
  add column if not exists closed_at timestamptz,
  add column if not exists wrap_media_url text,
  add column if not exists status text not null default 'open';

alter table public.profiles
  add column if not exists friend_tag text unique,
  add column if not exists avatar_url text;

create table if not exists public.session_room_messages (
  id uuid primary key default gen_random_uuid(),
  session_room_id uuid not null references public.session_rooms (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  body text not null,
  kind text not null default 'text',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists session_room_messages_room_idx
  on public.session_room_messages (session_room_id, created_at);

create table if not exists public.friendships (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create table if not exists public.channel_notification_prefs (
  user_id uuid not null references public.profiles (id) on delete cascade,
  channel_id text not null,
  muted boolean not null default false,
  sounds_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, channel_id)
);

alter table public.session_room_messages enable row level security;
alter table public.friendships enable row level security;
alter table public.channel_notification_prefs enable row level security;
