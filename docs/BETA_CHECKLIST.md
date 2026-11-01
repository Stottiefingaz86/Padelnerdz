# Closed beta checklist

## Before inviting friends

1. Twilio Verify green in Admin → Beta readiness (local phone fallback **off**).
2. Stripe: PadelNerdz **Test mode** keys on mobile + Edge; Connect onboarded for the organiser group.
3. Build invite builds:
   - `cd apps/mobile && eas build --profile preview --platform ios`
   - `cd apps/mobile && eas build --profile preview --platform android`
   - Or `eas build --profile beta` then submit to TestFlight / Play internal.
4. Two phones, one organiser + one player — run the script below twice.

## Critical path script

- [ ] OTP signup (real SMS) on both phones
- [ ] Create group; player joins via **invite code** (works for approval/private)
- [ ] Group chat text + photo (other phone sees the photo)
- [ ] Organiser → Admin → Payments → Stripe Connect ready (test mode)
- [ ] Create paid Kings & Queens mix-in (blocked until Connect ready)
- [ ] Both register interest; organiser selects lineup
- [ ] Player pays with Stripe test card `4242 4242 4242 4242` → webhook → `paid` + session room
- [ ] Open fixtures with ≥4 paid
- [ ] Propose score → other player Confirms → next round
- [ ] Close mix-in → wrap card in group chat
- [ ] Leaderboard shows points (This month / Last year / All time)
- [ ] Kill app → send chat → push arrives
- [ ] Privacy → export data works; app lock optional

## Do not use in beta

- Americano / Mexicano (hidden until engines ship)
- Expo Go alone for push / media / lock / Stripe native modules
- Local phone fallback (`EXPO_PUBLIC_ALLOW_LOCAL_PHONE_FALLBACK`)
- Manual “I’ve paid” / Bizum honour verify (disabled — Stripe only)

## Still deferred (OK for tiny beta)

- Shop, Stream polish, Wrapped videos, Americano/Mexicano, affiliates/ads
- Stripe Connect **live** keys + Apple Pay merchant ID (card test mode works without wallets)
