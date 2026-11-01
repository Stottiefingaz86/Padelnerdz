-- Group avatar separate from wide banner/cover; organisers can delete groups.
alter table public.groups
  add column if not exists avatar_url text;

drop policy if exists groups_delete_organisers on public.groups;
create policy groups_delete_organisers
  on public.groups for delete
  to authenticated
  using (public.is_group_organiser(id));
