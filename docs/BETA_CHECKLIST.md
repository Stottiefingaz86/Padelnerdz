# Closed beta checklist

## Before inviting friends

1. Twilio Verify green in Admin → Beta readiness (local phone fallback **off**).
2. Build invite builds:
   - `cd apps/mobile && eas build --profile preview --platform ios`
   - `cd apps/mobile && eas build --profile preview --platform android`
   - Or `eas build --profile beta` then submit to TestFlight / Play internal.
3. Two phones, one organiser + one player — run the script below twice.

## Critical path script

- [ ] OTP signup (real SMS) on both phones
- [ ] Create / join group (public or invite code)
- [ ] Approval request → organiser Approves in Admin
- [ ] Group chat text + photo (other phone sees the photo)
- [ ] Create Kings & Queens mix-in
- [ ] Both register interest; organiser selects lineup
- [ ] Player claims payment; organiser verifies
- [ ] Session room opens; Open fixtures with ≥4 paid
- [ ] Propose score → other player Confirms → next round
- [ ] Kill app → send chat → push arrives
- [ ] Privacy → export data works; app lock optional

## Do not use in beta

- Americano / Mexicano (hidden until engines ship)
- Expo Go alone for push / media / lock testing
- Local phone fallback (`EXPO_PUBLIC_ALLOW_LOCAL_PHONE_FALLBACK`)

## Still deferred (OK for tiny beta)

- Shop, Stripe marketplace, Stream polish, Wrapped videos, Americano/Mexicano
