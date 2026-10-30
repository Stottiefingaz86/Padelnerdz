-- Any group member can open a DM with another member (not only organisers).
create or replace function public.open_dm_thread(p_peer_id uuid, p_group_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  tid uuid;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if p_peer_id is null or p_peer_id = me then
    raise exception 'invalid peer';
  end if;
  if p_group_id is null then
    raise exception 'group required';
  end if;
  if not public.is_group_member(p_group_id) then
    raise exception 'you must be in this group';
  end if;
  if not exists (
    select 1 from public.group_memberships m
    where m.group_id = p_group_id and m.user_id = p_peer_id
  ) then
    raise exception 'player is not in this group';
  end if;

  if me < p_peer_id then
    a := me; b := p_peer_id;
  else
    a := p_peer_id; b := me;
  end if;

  insert into public.dm_threads (user_a, user_b, context_group_id, created_by)
  values (a, b, p_group_id, me)
  on conflict (user_a, user_b) do update
    set context_group_id = coalesce(public.dm_threads.context_group_id, excluded.context_group_id),
        last_message_at = greatest(public.dm_threads.last_message_at, now())
  returning id into tid;

  return tid;
end;
$$;
