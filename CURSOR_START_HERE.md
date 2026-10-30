# CURSOR START HERE — Padel Nerdz

## Mission
Build **Padel Nerdz**, a native-feeling iOS and Android social app for padel players.
The app combines:
- group chat
- private 1:1 chat
- mix-in creation and registration
- player selection and waiting lists
- private session rooms for selected players only
- score handling and match formats
- organiser controls
- media sharing and recap generation
- payments + future platform commissions
- discovery of local groups
- rankings, stats, and player history

## Read these first
1. `README.md`
2. `AGENTS.md`
3. `docs/FULL_PRODUCT_PRD.md`
4. `docs/ARCHITECTURE.md`
5. `docs/MCP_STACK.md`
6. `docs/SECURITY_PRIVACY.md`
7. `docs/BRAND_AND_UI.md`
8. `docs/BUILD_PHASES.md`

## Do not do these things
- Do not build a WhatsApp bot as the main product.
- Do not build a web-only admin dashboard and call the project complete.
- Do not optimize for MVP shortcuts that break the final product direction.
- Do not add voice/video calling.
- Do not claim end-to-end encryption unless it is actually implemented.
- Do not build the interface as a crude webview clone of WhatsApp.
- Do not hardcode payment assumptions around only one method.
- Do not flood all group members with session-specific chat.

## Product truths
- A user joins with a phone number and OTP.
- A user can create or join permanent padel groups.
- A group can be public, approval-based, or private.
- Inside a group, the organiser can create a mix-in.
- Registration happens from the main group.
- Once players are selected, a **private session room** is created for the selected players + organisers only.
- Fixtures, scores, court rotations, reminders, payment reminders, and recap content should stay in the session room.
- The organiser can optionally share a polished recap/results post back into the main group.

## Build order
### Phase 1 — foundations
- app shell
- auth by phone number OTP
- onboarding
- group model
- 1:1 and group chat
- notifications
- media upload basics

### Phase 2 — play system
- mix-in creation
- registrations / waiting list
- player selection flow
- session room creation
- Kings & Queens engine
- Americano engine
- Mexicano engine
- score submission + confirmation
- standings and player stats

### Phase 3 — organiser tools + payments
- organiser settings
- payment settings: manual + future integrated
- organiser list and member controls
- no-shows and reliability rules
- moderation and privacy controls

### Phase 4 — discovery and growth
- discover local groups
- join requests
- invite flows from contacts/share links
- rankings
- achievements

### Phase 5 — media recaps
- media consent
- event gallery
- wrap-up cards
- recap composer
- Wrapped architecture

### Phase 6 — security hardening and release readiness
- access-control audit
- RLS validation
- security testing
- retention, deletion, consent, privacy

## Non-negotiable acceptance rules
- A permanent group must not become noisy with session details.
- A player who is not selected for a mix-in must not receive session-specific posts.
- Group creators must be able to configure price, venue, format, and visibility.
- Media and chat must be secure and permission-aware.
- Native UX quality matters.
- The codebase must be maintainable and modular.

