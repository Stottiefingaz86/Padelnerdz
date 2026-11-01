# Stripe Connect — mix-in payments

Padel Nerdz uses **Stripe Connect Express** so:

1. Players pay one total in-app (card / Apple Pay / Google Pay via PaymentSheet)
2. Organisers receive the **court share** on their connected account
3. The platform keeps **8% of the event/court fee + IVA on that fee** as `application_fee_amount` on every charge

Revolut / Bizum P2P is no longer the product pay path.

## Prerequisites

1. Stripe account (EUR), **Connect** enabled, Express onboarding
2. Publishable key for the mobile app
3. Secret key + webhook secret for Supabase Edge Functions

## Stripe account

Use the **PadelNerdz** Stripe account (`acct_1UWXMkD2RFDCjacK`) — not “New business”, not Lemon Squeezy, not a throwaway sandbox.

- **Now:** Test mode keys (`pk_test_…` / `sk_test_…`)
- **Later (real money):** switch to Live mode keys from the same PadelNerdz account after platform onboarding + bank

### Connect onboarding branding (required)

Stripe-hosted KYC still shows Stripe UI for legal forms, but the **header/brand** must be Padel Nerdz. In the Stripe Dashboard (same account as the secret key):

1. Open [Connect settings → Onboarding](https://dashboard.stripe.com/settings/connect/onboarding-interface) (test: `/test/settings/connect/onboarding-interface`)
2. Set **Icon** to the PN mark (square PNG ≥128px)
3. **Brand color** `#0B0D10`, **Accent** `#C8FF2E`
4. Platform / business display name: **Padel Nerdz**

Also set [Account branding](https://dashboard.stripe.com/settings/branding) (icon + colors) so emails and receipts match.

The app opens a **Padel Nerdz bridge page** before Stripe’s form, and returns through a branded deep-link page — so organisers never land cold on a generic Stripe splash.

## Mobile env

In `apps/mobile/.env`:

```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…
```

Rebuild a native binary after adding `@stripe/stripe-react-native` (Expo Go may not include native Stripe modules — use EAS / dev client).

Apple Pay merchant id used in the app: `merchant.com.padelnerdz.app`  
Enable Apple Pay in the Stripe Dashboard and match the merchant ID in your Apple Developer account when you want wallets live. **Card works in test mode without Apple Pay.**

## Supabase Edge secrets

Preferred: set these in the Supabase project (Dashboard → Edge Functions → Secrets):

| Secret | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` / `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the webhook endpoint |
| `PUBLIC_SITE_URL` (optional) | HTTPS site for Connect return/refresh links (default `https://padelnerdz.com`) |

Connect onboarding **must** use HTTPS `return_url` / `refresh_url` (Stripe rejects `padelnerdz://` and Expo `exp://` schemes). The edge function always points Stripe at the public return function:

```text
https://<project>.supabase.co/functions/v1/stripe-connect-return?groupId=…&stripe=return|refresh
```

That page deep-links back into the app (`padelnerdz://group/…/payments`). Optional: when the marketing site DNS is live, you can switch returns to `https://padelnerdz.com/stripe/connect` via `PUBLIC_SITE_URL` — until then keep the Supabase function.

Fallback: the same names can live in **Supabase Vault** and are resolved at runtime via `public.app_secret(name)` (service_role only). Edge Functions check env first, then Vault.

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are already provided to functions.

Webhook URL (live):

```text
https://asxqvytuzvnklptwoilj.supabase.co/functions/v1/stripe-webhook
```

## Owner back office

`apps/web` `/admin` shows a **Stripe Connect** section (mode, platform charges, Connect groups, payment intents, balance) using `STRIPE_SECRET_KEY` from `apps/web/.env.local`.

## Deployed functions

| Function | JWT | Role |
|---|---|---|
| `stripe-connect-onboard` | yes | Create Express account + Account Link |
| `stripe-connect-status` | yes | Refresh `charges_enabled` / details |
| `stripe-create-payment-intent` | yes | Destination charge PI for a selected player |
| `stripe-webhook` | **no** | `payment_intent.succeeded` → mark paid + unlock room; `account.updated` |

Subscribe to:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `account.updated`

## Admin / player UX

- **Admin → Payments**: Connect bank with Stripe (once per group)
- **Paid mix-in create**: blocked until Connect is ready
- **Pay screen**: PaymentSheet only — no “I’ve paid” honour claim for Stripe

## Test checklist

1. Connect a test Express account (Stripe test mode)
2. Create a priced mix-in, select yourself, open Pay
3. Pay with test card `4242 4242 4242 4242`
4. Confirm registration becomes `paid`, session room opens, Dashboard shows application fee + transfer

## Later monetization

Affiliates and ads are separate — this rail only collects the per-player platform fee.
