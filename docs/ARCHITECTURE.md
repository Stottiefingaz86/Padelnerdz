# Architecture — Padel Nerdz

## Recommended stack
### Mobile app
- React Native
- Expo
- Expo Router
- TypeScript
- Native-feeling UI layer (Expo UI / high-quality native component strategy)

### Backend / data
- Supabase Postgres
- Supabase Auth (phone OTP)
- Supabase Realtime or dedicated real-time layer
- Edge functions / server functions for orchestration

### Chat
Preferred options:
1. Stream Chat for production-grade chat features
2. Supabase-first custom chat if wanting full control (slower to mature)

Recommendation: use a battle-tested chat layer if budget allows, while keeping padel domain logic separate.

### Media
- **Now:** Supabase Storage (private bucket + short-lived signed URLs)
- **Later (optional):** Cloudflare R2 for object storage / CDN when media volume or egress needs it
- signed URLs / time-limited access
- client-side compression and preview generation

> Cloudflare is **not** required for app security. Auth, RLS, Edge Function checks, and signed media already cover the threat model for beta. Do not add Cloudflare WAF/Workers as a substitute for fixing RLS or payment authorization bugs.

### Push notifications
- Expo Notifications initially
- later native optimization if needed

### Payments
- Stripe Connect Express (destination charges)
- Platform `application_fee` = fee + IVA
- Organiser connected account receives court share
- Mobile PaymentSheet (card; Apple Pay / Google Pay when merchant IDs configured)

### Video/recap pipeline
- Remotion for programmatic recap generation
- FFmpeg processing
- queue-based background jobs

---

## Core modules
1. Auth + identity
2. Groups and memberships
3. Chat
4. Sessions / mix-ins
5. Match engine
6. Scores / confirmations
7. Payments
8. Reliability / attendance
9. Discovery
10. Media
11. Recaps
12. Notifications
13. Security / moderation
14. Admin / support tools

---

## Key domain model relationships
- User belongs to many Groups through Memberships
- Group has many Sessions
- Session has many Registrations
- Session has one Session Room
- Session Room has messages + media + system events
- Session has many Matches / Rounds
- Payment records attach to session registrations
- Reliability records attach to user + group + session

---

## Data access strategy
- RLS for user/group/session scoped data
- service-role only for server-side actions
- signed media access
- separation of public discovery data and private operational data

---

## Architectural decisions
### Session rooms as first-class objects
This is a fundamental architectural choice. Do not fake this through client filters on group chat.

### Private media access
Every asset must know its owner, scope, and visibility.

### Notifications as event-driven system
Use domain events for:
- registration created
- player selected
- payment claimed
- score submitted
- score confirmed
- next round generated
- recap published

### Payment abstraction
All payment providers should fit behind one abstraction.

---

## Suggested initial repo structure
- apps/mobile
- apps/admin (optional later)
- packages/ui
- packages/domain
- packages/chat
- packages/payments
- packages/media
- packages/security
- packages/config
- supabase/
- docs/

