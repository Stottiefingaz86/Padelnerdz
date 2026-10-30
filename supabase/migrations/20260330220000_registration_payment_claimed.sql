-- Player claims payment; organiser verify → paid unlocks session room.
alter type public.registration_status add value if not exists 'payment_claimed' after 'selected';

alter table public.session_registrations
  add column if not exists payment_claimed_at timestamptz,
  add column if not exists payment_verified_at timestamptz,
  add column if not exists payment_verified_by uuid references public.profiles (id);

comment on column public.session_registrations.payment_claimed_at is
  'When the player tapped I paid (honour claim — not bank confirmation).';
comment on column public.session_registrations.payment_verified_at is
  'When an organiser confirmed they saw the Bizum/Revolut transfer.';
