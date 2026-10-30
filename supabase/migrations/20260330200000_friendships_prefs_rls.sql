-- Critical: friendships + channel prefs must not be world-readable
alter table public.friendships enable row level security;
alter table public.channel_notification_prefs enable row level security;

drop policy if exists friendships_select_own on public.friendships;
create policy friendships_select_own
  on public.friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists friendships_insert_own on public.friendships;
create policy friendships_insert_own
  on public.friendships for insert
  with check (auth.uid() = user_id);

drop policy if exists friendships_delete_own on public.friendships;
create policy friendships_delete_own
  on public.friendships for delete
  using (auth.uid() = user_id);

drop policy if exists channel_prefs_select_own on public.channel_notification_prefs;
create policy channel_prefs_select_own
  on public.channel_notification_prefs for select
  using (auth.uid() = user_id);

drop policy if exists channel_prefs_upsert_own on public.channel_notification_prefs;
create policy channel_prefs_upsert_own
  on public.channel_notification_prefs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
