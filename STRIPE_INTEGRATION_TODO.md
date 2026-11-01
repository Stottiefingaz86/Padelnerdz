# Stripe Integration TODO

Single source of truth for remaining Checkout Studio (hosted) setup.

> **Product note:** Mix-in pay in the mobile app still uses **Stripe Connect + PaymentSheet** (`stripe-create-payment-intent`). This Checkout Session endpoint is the hosted Checkout Studio path (`hosted_mobile_app_0001`) and is not yet wired into the pay screen.

## Values to Replace

The following values are placeholders and must be updated before going live.

**Files containing placeholders:**
- [supabase/functions/stripe-create-checkout-session/index.ts](supabase/functions/stripe-create-checkout-session/index.ts)

| Field | Current Value | What to Set |
|-------|---------------|-------------|
| mode | `payment` | Keep `payment` for one-time mix-in fees. Use `subscription` only for recurring products. |
| success_url | `padelnerdz://stripe-checkout/success?session_id={CHECKOUT_SESSION_ID}` | Your real post-pay deep link / web URL. Keep `{CHECKOUT_SESSION_ID}` if you need the session id. |
| cancel_url | `padelnerdz://stripe-checkout/cancel` | Your real cancel / return deep link or URL. |
| line_items[].price | `price_...` | A real Stripe Price ID from [Dashboard → Prices](https://dashboard.stripe.com/test/prices) (or pass `priceId` in the POST body). |
| ui_mode | `hosted_page` | Edge Function uses Stripe REST (no stripe-node). If you later use stripe-node **&lt; 21.0.0**, switch to `hosted`. |

## Configured Parameters

These parameters were set from Checkout Studio and are already in the create call.

**Files containing these parameters:**
- [supabase/functions/stripe-create-checkout-session/index.ts](supabase/functions/stripe-create-checkout-session/index.ts)

| Parameter | Value |
|-----------|-------|
| ui_mode | `hosted_page` |
| billing_address_collection | `auto` |
| phone_number_collection.enabled | `false` |
| automatic_tax.enabled | `false` |
| allow_promotion_codes | `false` |
| submit_type | `auto` |
| saved_payment_method_options.payment_method_save | `enabled` |
| integration_identifier | `hosted_mobile_app_0001` |
| origin_context | `mobile_app` |

`payment_method_collection` is **not** sent — Checkout Studio value `always` applies only when `mode` is `subscription`.

## Setup and next steps

### Environment

Already used by Edge Functions (env and/or Vault via `app_secret`):

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Server secret (`sk_test_…` / `sk_live_…`) — PadelNerdz account |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Mobile publishable key (`pk_test_…`) |

Do **not** put the secret key in the app. See [Stripe key best practices](https://docs.stripe.com/keys-best-practices).

### Project structure (new)

```text
supabase/functions/stripe-create-checkout-session/index.ts
STRIPE_INTEGRATION_TODO.md
```

### How it works

1. Authenticated client `POST`s to  
   `https://asxqvytuzvnklptwoilj.supabase.co/functions/v1/stripe-create-checkout-session`  
   with the user JWT (`Authorization: Bearer …`).
2. Optional JSON body: `{ "priceId": "price_xxx", "successUrl": "…", "cancelUrl": "…" }`.
3. Server creates a **hosted** Checkout Session and returns `{ sessionId, url }`.
4. Mobile / web opens `url` (Stripe-hosted page). Customer pays; Stripe redirects to success/cancel URLs.

### Webhook

Existing `stripe-webhook` handles PaymentIntent Connect events. For hosted Checkout fulfillment, also subscribe to:

- `checkout.session.completed`

Endpoint: `https://asxqvytuzvnklptwoilj.supabase.co/functions/v1/stripe-webhook`  
(or a dedicated handler if you prefer to keep Connect and Checkout separate).

### Testing

- Dashboard: **PadelNerdz → Test mode**
- Card: `4242 4242 4242 4242`, any future expiry, any CVC
- Docs: [Testing](https://docs.stripe.com/testing)

### Next steps

1. Create a Product/Price in Stripe Test mode; replace `price_...`.
2. Wire mobile pay UI to open the returned Checkout `url` **or** keep PaymentSheet Connect as the primary path (recommended for organiser destination charges).
3. Handle `checkout.session.completed` to mark registrations paid / unlock session rooms (same as PaymentIntent success today).
4. Before live: switch to PadelNerdz **live** keys, finish platform onboarding + bank, use live Price IDs.

### Resources

- https://support.stripe.com  
- https://docs.stripe.com/mcp  
- https://docs.stripe.com/payments/checkout  
- Product Connect pay path: [docs/STRIPE_CONNECT.md](docs/STRIPE_CONNECT.md)
