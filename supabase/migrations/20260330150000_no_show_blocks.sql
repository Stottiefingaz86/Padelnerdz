-- No-show registration status + group blocks

do $$ begin
  alter type public.registration_status add value 'no_show';
exception
  when duplicate_object then null;
end $$;

create table if not exists public.group_blocks (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  blocked_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.group_blocks enable row level security;

drop policy if exists group_blocks_select on public.group_blocks;
create policy group_blocks_select
  on public.group_blocks for select
  using (
    exists (
      select 1 from public.group_memberships m
      where m.group_id = group_blocks.group_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'organiser')
    )
  );

drop policy if exists group_blocks_write on public.group_blocks;
create policy group_blocks_write
  on public.group_blocks for all
  using (
    exists (
      select 1 from public.group_memberships m
      where m.group_id = group_blocks.group_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.group_memberships m
      where m.group_id = group_blocks.group_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );
