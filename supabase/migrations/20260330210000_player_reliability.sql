-- Player reliability scoring used by session selection
create table if not exists public.player_reliability (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  sessions_played int not null default 0 check (sessions_played >= 0),
  no_shows int not null default 0 check (no_shows >= 0),
  updated_at timestamptz not null default now()
);

alter table public.player_reliability enable row level security;

drop policy if exists player_reliability_select on public.player_reliability;
create policy player_reliability_select
  on public.player_reliability for select
  to authenticated
  using (true);

drop policy if exists player_reliability_upsert_own on public.player_reliability;
create policy player_reliability_upsert_own
  on public.player_reliability for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
