-- Harden Phase 1 helper functions after advisor review.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_new_group() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

revoke all on function public.is_group_member(uuid) from public, anon;
revoke all on function public.is_group_organiser(uuid) from public, anon;
revoke all on function public.is_session_room_member(uuid) from public, anon;

grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_organiser(uuid) to authenticated;
grant execute on function public.is_session_room_member(uuid) to authenticated;
