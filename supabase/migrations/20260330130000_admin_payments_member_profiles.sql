-- Admin hub: posting rules, session banners, organiser member notes, payment settings, paid status

alter table public.groups
  add column if not exists members_can_post boolean not null default true;

alter table public.sessions
  add column if not exists banner_url text;

do $$ begin
  alter type public.registration_status add value if not exists 'paid';
exception
  when duplicate_object then null;
  when others then
    -- older postgres without IF NOT EXISTS on enum values
    begin
      alter type public.registration_status add value 'paid';
    exception when duplicate_object then null;
    end;
end $$;

create table if not exists public.group_member_profiles (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  organiser_level text not null default 'unknown'
    check (organiser_level in ('beginner', 'intermediate', 'advanced', 'pro', 'unknown')),
  notes text not null default '',
  sessions_played int not null default 0 check (sessions_played >= 0),
  no_shows int not null default 0 check (no_shows >= 0),
  updated_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists group_member_profiles_group_idx
  on public.group_member_profiles (group_id);

create table if not exists public.group_payment_settings (
  group_id uuid primary key references public.groups (id) on delete cascade,
  preferred_method text not null default 'revolut'
    check (preferred_method in ('revolut', 'bizum', 'stripe', 'cash')),
  revolut_me_code text,
  revolut_me_url text,
  bizum_phone text,
  bizum_name text,
  stripe_enabled boolean not null default false,
  payment_note text,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

alter table public.group_member_profiles enable row level security;
alter table public.group_payment_settings enable row level security;

-- Members can read profiles in their groups; organisers can write.
drop policy if exists group_member_profiles_select on public.group_member_profiles;
create policy group_member_profiles_select
  on public.group_member_profiles for select
  using (
    exists (
      select 1 from public.group_memberships m
      where m.group_id = group_member_profiles.group_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists group_member_profiles_upsert on public.group_member_profiles;
create policy group_member_profiles_upsert
  on public.group_member_profiles for all
  using (
    exists (
      select 1 from public.group_memberships m
      where m.group_id = group_member_profiles.group_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.group_memberships m
      where m.group_id = group_member_profiles.group_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

drop policy if exists group_payment_settings_select on public.group_payment_settings;
create policy group_payment_settings_select
  on public.group_payment_settings for select
  using (
    exists (
      select 1 from public.group_memberships m
      where m.group_id = group_payment_settings.group_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists group_payment_settings_upsert on public.group_payment_settings;
create policy group_payment_settings_upsert
  on public.group_payment_settings for all
  using (
    exists (
      select 1 from public.group_memberships m
      where m.group_id = group_payment_settings.group_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.group_memberships m
      where m.group_id = group_payment_settings.group_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );
