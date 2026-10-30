-- Live fixtures, score confirm/dispute, approval join requests, private chat media.

create table if not exists public.session_fixture_rounds (
  session_id uuid not null references public.sessions (id) on delete cascade,
  round int not null check (round > 0),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, round)
);

alter table public.session_fixture_rounds enable row level security;

drop policy if exists "fixture_rounds_select_members" on public.session_fixture_rounds;
create policy "fixture_rounds_select_members"
  on public.session_fixture_rounds for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and public.is_group_member(s.group_id)
    )
  );

drop policy if exists "fixture_rounds_write_members" on public.session_fixture_rounds;
create policy "fixture_rounds_write_members"
  on public.session_fixture_rounds for insert
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and public.is_group_member(s.group_id)
    )
  );

drop policy if exists "fixture_rounds_update_members" on public.session_fixture_rounds;
create policy "fixture_rounds_update_members"
  on public.session_fixture_rounds for update
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and public.is_group_member(s.group_id)
    )
  );

create table if not exists public.match_score_states (
  session_id uuid not null references public.sessions (id) on delete cascade,
  round int not null,
  court int not null,
  score_a int not null,
  score_b int not null,
  status text not null default 'proposed'
    check (status in ('proposed', 'confirmed', 'disputed')),
  proposed_by uuid references public.profiles (id),
  confirmed_by uuid references public.profiles (id),
  disputed_by uuid references public.profiles (id),
  dispute_note text,
  updated_at timestamptz not null default now(),
  primary key (session_id, round, court)
);

alter table public.match_score_states enable row level security;

drop policy if exists "match_scores_select_members" on public.match_score_states;
create policy "match_scores_select_members"
  on public.match_score_states for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and public.is_group_member(s.group_id)
    )
  );

drop policy if exists "match_scores_upsert_members" on public.match_score_states;
create policy "match_scores_upsert_members"
  on public.match_score_states for all
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and public.is_group_member(s.group_id)
    )
  )
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and public.is_group_member(s.group_id)
    )
  );

create table if not exists public.group_join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  message text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id),
  unique (group_id, user_id)
);

create index if not exists group_join_requests_group_pending_idx
  on public.group_join_requests (group_id)
  where status = 'pending';

alter table public.group_join_requests enable row level security;

drop policy if exists "join_req_select" on public.group_join_requests;
create policy "join_req_select"
  on public.group_join_requests for select
  using (
    auth.uid() = user_id
    or public.is_group_organiser(group_id)
  );

drop policy if exists "join_req_insert" on public.group_join_requests;
create policy "join_req_insert"
  on public.group_join_requests for insert
  with check (auth.uid() = user_id);

drop policy if exists "join_req_update_organiser" on public.group_join_requests;
create policy "join_req_update_organiser"
  on public.group_join_requests for update
  using (public.is_group_organiser(group_id) or auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "chat_media_insert_own" on storage.objects;
create policy "chat_media_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "chat_media_select_auth" on storage.objects;
create policy "chat_media_select_auth"
  on storage.objects for select to authenticated
  using (bucket_id = 'chat-media');

drop policy if exists "chat_media_update_own" on storage.objects;
create policy "chat_media_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "chat_media_delete_own" on storage.objects;
create policy "chat_media_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
