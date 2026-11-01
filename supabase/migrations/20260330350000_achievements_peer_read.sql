-- Group peers can view each other's unlocked medals on member profiles
drop policy if exists player_achievements_select on public.player_achievements;
drop policy if exists player_achievements_select_peers on public.player_achievements;

create policy player_achievements_select_peers
  on public.player_achievements for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.group_memberships me
      join public.group_memberships them on them.group_id = me.group_id
      where me.user_id = auth.uid()
        and them.user_id = player_achievements.user_id
    )
  );
