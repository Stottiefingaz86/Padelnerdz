-- Player attendance check-in (QR / organiser scan)
alter table public.session_registrations
  add column if not exists checked_in_at timestamptz;

comment on column public.session_registrations.checked_in_at is
  'When the player checked in at the venue (organiser scan or manual).';
