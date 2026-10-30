-- Allow creators to read their group immediately after insert (RETURNING / .select()).
-- Private groups previously failed the post-insert select when membership wasn't visible yet.
drop policy if exists groups_select_member_or_public on public.groups;

create policy groups_select_member_or_public
  on public.groups for select
  using (
    created_by = auth.uid()
    or visibility = 'public'::group_visibility
    or visibility = 'approval'::group_visibility
    or is_group_member(id)
  );
