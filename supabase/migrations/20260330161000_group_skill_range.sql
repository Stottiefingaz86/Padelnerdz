-- Allow discoverable groups to span a level band (e.g. beginner → intermediate).
alter table public.groups
  add column if not exists skill_level_max text
  check (
    skill_level_max is null
    or skill_level_max in ('beginner', 'intermediate', 'advanced', 'pro')
  );

comment on column public.groups.skill_level is
  'Minimum player level for discoverable groups.';
comment on column public.groups.skill_level_max is
  'Maximum player level for discoverable groups (defaults to skill_level).';
