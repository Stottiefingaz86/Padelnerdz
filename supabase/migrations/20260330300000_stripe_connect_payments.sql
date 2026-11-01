-- Stripe Connect fields on group payout settings
alter table public.group_payment_settings
  add column if not exists stripe_account_id text,
  add column if not exists stripe_charges_enabled boolean not null default false,
  add column if not exists stripe_details_submitted boolean not null default false;

-- Prefer stripe as default for new groups going forward
alter table public.group_payment_settings
  alter column preferred_method set default 'stripe';

create table if not exists public.session_payment_intents (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  stripe_payment_intent_id text not null unique,
  amount_cents integer not null check (amount_cents > 0),
  application_fee_cents integer not null check (application_fee_cents >= 0),
  currency text not null default 'eur',
  status text not null default 'requires_payment'
    check (status in ('requires_payment', 'succeeded', 'canceled', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists session_payment_intents_session_user_idx
  on public.session_payment_intents (session_id, user_id);

alter table public.session_payment_intents enable row level security;

drop policy if exists session_payment_intents_select_own on public.session_payment_intents;
create policy session_payment_intents_select_own
  on public.session_payment_intents for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_group_organiser(group_id)
  );
