# Padel Nerdz — Cursor Delivery Package

This package is the single source of truth for building **Padel Nerdz**:
A native iOS + Android social padel app with WhatsApp-quality chat, groups, mix-in management, rankings, payments, and post-session media recaps.

## Repo layout
- `apps/mobile` — Expo Router iOS/Android app
- `packages/config` — brand tokens
- `packages/domain` — shared domain types
- `packages/ui` — shared UI primitives
- `packages/chat` — chat provider adapter boundary
- `packages/payments` — payment orchestration abstraction
- `supabase/` — migrations + RLS (Phase 1 foundations)
- `docs/` — PRD, architecture, security, brand, phases

## Run the app
```bash
npm install
cp apps/mobile/.env.example apps/mobile/.env   # optional; demo mode works without it
npm run mobile
```
Open in iOS Simulator / Android emulator, or press `w` for web. Without Supabase env vars, use **Explore demo** on the phone screen.

## Included docs
- `CURSOR_START_HERE.md` — exact build order and implementation rules for Cursor
- `AGENTS.md` — operating rules and guardrails for AI coding agents
- `docs/FULL_PRODUCT_PRD.md` — complete PRD from vision to acceptance criteria
- `docs/ARCHITECTURE.md` — system architecture and technical decisions
- `docs/MCP_STACK.md` — recommended MCPs / integrations / tooling
- `docs/SECURITY_PRIVACY.md` — security, privacy, and compliance requirements
- `docs/BRAND_AND_UI.md` — branding, logo usage, app icon brief, and UI principles
- `docs/BUILD_PHASES.md` — implementation sequencing and milestones
- `prompts/CURSOR_MASTER_PROMPT.md` — copy/paste prompt to anchor Cursor
- `branding/ASSET_PATHS.md` — image asset references already created

## Product summary
Padel Nerdz replaces noisy messaging groups with a purpose-built native app for:
- phone-number-based social groups
- private and public padel communities
- mix-ins and events
- chat + media sharing
- Kings & Queens / Americano / Mexicano formats
- selective session rooms for only the chosen players
- organiser tools
- manual and integrated payments
- platform commission model
- weekly and seasonal stats
- recap and Wrapped-style media stories

## Important product principles
1. **Not a WhatsApp bot** — it is a native social app.
2. **Not a generic club-management tool** — social groups come first.
3. **No voice/video calling** — out of scope.
4. **Security is first-class** — not a later phase.
5. **One permanent group, many temporary session rooms** — avoid chat noise.
6. **Chat should feel premium and familiar** — but not visually copied from WhatsApp.

