-- Missions / medals / group leaderboard point ledger

create type public.point_event_kind as enum (
  'paid_place',
  'best_finish_1',
  'best_finish_2',
  'best_finish_3',
  'session_closed_played',
  'no_show'
);

create table if not exists public.player_point_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  kind public.point_event_kind not null,
  points int not null,
  created_at timestamptz not null default now()
);

create unique index if not exists player_point_events_idempotent_idx
  on public.player_point_events (group_id, user_id, session_id, kind)
  where session_id is not null;

create index if not exists player_point_events_group_created_idx
  on public.player_point_events (group_id, created_at desc);

create index if not exists player_point_events_user_idx
  on public.player_point_events (user_id, created_at desc);

create table if not exists public.player_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create index if not exists player_achievements_user_idx
  on public.player_achievements (user_id);

alter table public.player_point_events enable row level security;
alter table public.player_achievements enable row level security;

drop policy if exists player_point_events_select on public.player_point_events;
create policy player_point_events_select
  on public.player_point_events for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_group_member(group_id)
  );

-- No direct client inserts/updates — award via SECURITY DEFINER RPC only

drop policy if exists player_achievements_select on public.player_achievements;
create policy player_achievements_select
  on public.player_achievements for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.point_value_for_kind(p_kind public.point_event_kind)
returns int
language sql
immutable
as $$
  select case p_kind
    when 'paid_place' then 10
    when 'best_finish_1' then 25
    when 'best_finish_2' then 10
    when 'best_finish_3' then 10
    when 'session_closed_played' then 5
    when 'no_show' then -20
  end;
$$;

create or replace function public.award_point_event(
  p_group_id uuid,
  p_user_id uuid,
  p_kind public.point_event_kind,
  p_session_id uuid default null
)
returns public.player_point_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points int := public.point_value_for_kind(p_kind);
  v_row public.player_point_events;
begin
  if auth.uid() is null and current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    -- allow service role (edge) and authenticated callers that pass checks below
    null;
  end if;

  -- Authenticated non-service: organiser for group OR self for no_show? Prefer organiser/system only.
  if auth.role() = 'authenticated' then
    if not public.is_group_organiser(p_group_id) then
      raise exception 'Only organisers can award points';
    end if;
  end if;

  if p_session_id is not null then
    insert into public.player_point_events (group_id, user_id, session_id, kind, points)
    values (p_group_id, p_user_id, p_session_id, p_kind, v_points)
    on conflict (group_id, user_id, session_id, kind) where session_id is not null
    do nothing
    returning * into v_row;

    if v_row.id is null then
      select * into v_row
      from public.player_point_events
      where group_id = p_group_id
        and user_id = p_user_id
        and session_id = p_session_id
        and kind = p_kind;
    end if;
  else
    insert into public.player_point_events (group_id, user_id, session_id, kind, points)
    values (p_group_id, p_user_id, null, p_kind, v_points)
    returning * into v_row;
  end if;

  -- Keep sessions_played / no_shows in sync for reliability UI
  if p_kind = 'paid_place' then
    insert into public.group_member_profiles (group_id, user_id, sessions_played, no_shows, updated_at)
    values (p_group_id, p_user_id, 1, 0, now())
    on conflict (group_id, user_id) do update
      set sessions_played = public.group_member_profiles.sessions_played + 1,
          updated_at = now();
  elsif p_kind = 'no_show' then
    insert into public.group_member_profiles (group_id, user_id, sessions_played, no_shows, updated_at)
    values (p_group_id, p_user_id, 0, 1, now())
    on conflict (group_id, user_id) do update
      set no_shows = public.group_member_profiles.no_shows + 1,
          updated_at = now();
  end if;

  return v_row;
end;
$$;

revoke all on function public.award_point_event(uuid, uuid, public.point_event_kind, uuid) from public;
grant execute on function public.award_point_event(uuid, uuid, public.point_event_kind, uuid) to authenticated, service_role;

create or replace function public.group_leaderboard(
  p_group_id uuid,
  p_period text default 'all_time'
)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  points bigint,
  rank bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_from timestamptz;
begin
  if auth.uid() is null or not public.is_group_member(p_group_id) then
    raise exception 'Not a group member';
  end if;

  if p_period = 'this_month' then
    v_from := date_trunc('month', timezone('utc', now()));
  elsif p_period = 'last_year' then
    v_from := timezone('utc', now()) - interval '365 days';
  else
    v_from := null; -- all_time
  end if;

  return query
  with members as (
    select m.user_id
    from public.group_memberships m
    where m.group_id = p_group_id
  ),
  summed as (
    select
      mem.user_id,
      coalesce(sum(e.points) filter (
        where v_from is null or e.created_at >= v_from
      ), 0)::bigint as pts
    from members mem
    left join public.player_point_events e
      on e.group_id = p_group_id and e.user_id = mem.user_id
    group by mem.user_id
  )
  select
    s.user_id,
    coalesce(nullif(trim(p.display_name), ''), 'Player') as display_name,
    p.avatar_url,
    s.pts as points,
    rank() over (order by s.pts desc, coalesce(nullif(trim(p.display_name), ''), 'Player') asc) as rank
  from summed s
  left join public.profiles p on p.id = s.user_id
  order by points desc, display_name asc;
end;
$$;

revoke all on function public.group_leaderboard(uuid, text) from public;
grant execute on function public.group_leaderboard(uuid, text) to authenticated;

create or replace function public.claim_achievement(p_achievement_id text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_at timestamptz;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_achievement_id is null or length(trim(p_achievement_id)) < 2 then
    raise exception 'Invalid achievement';
  end if;

  insert into public.player_achievements (user_id, achievement_id, unlocked_at)
  values (v_uid, p_achievement_id, now())
  on conflict (user_id, achievement_id) do nothing
  returning unlocked_at into v_at;

  if v_at is null then
    return null; -- already unlocked
  end if;
  return v_at;
end;
$$;

revoke all on function public.claim_achievement(text) from public;
grant execute on function public.claim_achievement(text) to authenticated;

create or replace function public.list_my_achievements()
returns table (achievement_id text, unlocked_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select a.achievement_id, a.unlocked_at
  from public.player_achievements a
  where a.user_id = auth.uid();
$$;

revoke all on function public.list_my_achievements() from public;
grant execute on function public.list_my_achievements() to authenticated;

-- Aggregates for mission progress evaluation (caller must be self)
create or replace function public.my_mission_stats()
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_paid int;
  v_wins int;
  v_podiums int;
  v_groups int;
  v_hosted int;
  v_no_shows int;
  v_reliable int;
  v_top1 int;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select count(*)::int into v_paid
  from public.player_point_events
  where user_id = v_uid and kind = 'paid_place';

  select count(*)::int into v_wins
  from public.player_point_events
  where user_id = v_uid and kind = 'best_finish_1';

  select count(*)::int into v_podiums
  from public.player_point_events
  where user_id = v_uid and kind in ('best_finish_1', 'best_finish_2', 'best_finish_3');

  select count(distinct group_id)::int into v_groups
  from public.group_memberships
  where user_id = v_uid;

  select count(*)::int into v_hosted
  from public.sessions
  where created_by = v_uid;

  select coalesce(sum(no_shows), 0)::int into v_no_shows
  from public.group_member_profiles
  where user_id = v_uid;

  select count(*)::int into v_reliable
  from public.player_point_events
  where user_id = v_uid and kind = 'session_closed_played';

  -- Times user was rank 1 on all-time points in any group (approx via events)
  select count(*)::int into v_top1
  from (
    select e.group_id
    from public.player_point_events e
    where e.user_id = v_uid
    group by e.group_id
    having sum(e.points) > 0
       and sum(e.points) >= coalesce((
         select sum(e2.points)
         from public.player_point_events e2
         where e2.group_id = e.group_id
           and e2.user_id <> v_uid
         group by e2.user_id
         order by sum(e2.points) desc
         limit 1
       ), 0)
  ) t;

  return json_build_object(
    'mixins_paid', v_paid,
    'wins', v_wins,
    'podiums', v_podiums,
    'groups_joined', v_groups,
    'hosted', v_hosted,
    'no_shows', v_no_shows,
    'closed_played', v_reliable,
    'group_top1_count', v_top1
  );
end;
$$;

revoke all on function public.my_mission_stats() from public;
grant execute on function public.my_mission_stats() to authenticated;

-- Award finishes for a closed session (places 1..3)
create or replace function public.award_session_finishes(
  p_session_id uuid,
  p_finishes jsonb
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_item jsonb;
  v_user uuid;
  v_place int;
  v_kind public.point_event_kind;
  v_count int := 0;
begin
  select group_id into v_group_id from public.sessions where id = p_session_id;
  if v_group_id is null then
    raise exception 'Session not found';
  end if;
  if auth.role() = 'authenticated' and not public.is_group_organiser(v_group_id) then
    raise exception 'Only organisers can award finishes';
  end if;

  for v_item in select * from jsonb_array_elements(p_finishes)
  loop
    v_user := (v_item->>'user_id')::uuid;
    v_place := (v_item->>'place')::int;
    if v_user is null or v_place is null then
      continue;
    end if;
    v_kind := case v_place
      when 1 then 'best_finish_1'::public.point_event_kind
      when 2 then 'best_finish_2'::public.point_event_kind
      when 3 then 'best_finish_3'::public.point_event_kind
      else null
    end;
    if v_kind is null then
      continue;
    end if;
    perform public.award_point_event(v_group_id, v_user, v_kind, p_session_id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.award_session_finishes(uuid, jsonb) from public;
grant execute on function public.award_session_finishes(uuid, jsonb) to authenticated, service_role;

-- Batch award participation on close
create or replace function public.award_session_closed_played(p_session_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_uid uuid;
  v_count int := 0;
begin
  select group_id into v_group_id from public.sessions where id = p_session_id;
  if v_group_id is null then
    raise exception 'Session not found';
  end if;
  if auth.role() = 'authenticated' and not public.is_group_organiser(v_group_id) then
    raise exception 'Only organisers can close awards';
  end if;

  for v_uid in
    select r.user_id
    from public.session_registrations r
    where r.session_id = p_session_id and r.status = 'paid'
  loop
    perform public.award_point_event(v_group_id, v_uid, 'session_closed_played', p_session_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.award_session_closed_played(uuid) from public;
grant execute on function public.award_session_closed_played(uuid) to authenticated, service_role;
