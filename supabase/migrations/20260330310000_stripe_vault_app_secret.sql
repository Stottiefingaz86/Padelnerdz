-- Resolve Stripe secrets from Vault when Edge env secrets are unset.
create or replace function public.app_secret(secret_name text)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v text;
begin
  select ds.decrypted_secret into v
  from vault.decrypted_secrets ds
  where ds.name = secret_name
  limit 1;
  return v;
end;
$$;

revoke all on function public.app_secret(text) from public;
revoke all on function public.app_secret(text) from anon, authenticated;
grant execute on function public.app_secret(text) to service_role;

-- Secrets themselves are stored via vault.create_secret / vault.update_secret
-- (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) — not committed here.
