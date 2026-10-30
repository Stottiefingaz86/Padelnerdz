-- Public / approval groups declare a minimum skill so beginners
-- cannot walk into intermediate+ rooms via Discover.
alter table public.groups
  add column if not exists skill_level text
  check (
    skill_level is null
    or skill_level in ('beginner', 'intermediate', 'advanced', 'pro')
  );

comment on column public.groups.skill_level is
  'Minimum player level for discoverable groups (public / approval).';
