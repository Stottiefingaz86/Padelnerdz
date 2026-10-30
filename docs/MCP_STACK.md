# Recommended MCPs / Tooling for Cursor

This list is meant to help Cursor build the product faster and more reliably.

## 1. Core development MCPs
### Expo / React Native support
Use tools and integrations that help inspect, run, and debug Expo / React Native apps.

Recommended capabilities:
- app build and run
- simulator launch
- emulator launch
- log inspection
- bundle errors
- device testing flows

### GitHub MCP
Use for:
- issues
- PRs
- code review loops
- commit visibility
- project tracking

### Supabase MCP
Use for:
- schema management
- migrations
- policies (RLS)
- auth setup
- storage buckets
- edge functions
- query validation

### Cloudflare MCP
Use for:
- R2 buckets
- object storage config
- media delivery setup
- signed URL patterns
- optional worker/service integration

### Stripe MCP (for later)
Use for:
- Connect accounts
- checkout flows
- payouts
- platform fees
- webhook simulation

### Sentry MCP / error tooling
Use for:
- release health
- crash tracking
- error tracing
- performance monitoring

### Figma MCP
Use for:
- design-to-code alignment
- component references
- spacing and UI consistency
- icon assets and screens

## 2. Nice-to-have MCPs
### Linear / Jira
For project tracking and milestones.

### Playwright / testing MCP
For end-to-end testing of admin or web surfaces.

### Browser / docs MCP
For checking provider docs while implementing SDK details.

### Resend or email tooling
For support/admin flows if needed.

---

## 3. Recommended product services
### Mobile UI / native quality
- Expo Router
- high-quality native-feeling components
- Reanimated
- Gesture Handler

### Data and auth
- Supabase

### Chat
- Stream Chat preferred if budget allows
- fallback: custom on Supabase

### Media
- Cloudflare R2
- image/video compression libs
- FFmpeg pipeline for recap

### Maps / location
- Mapbox or Google Maps, depending cost and design needs

### Analytics
- PostHog, Amplitude, or Mixpanel

### Notifications
- Expo Notifications initially
- APNs / FCM under the hood

### Security
- secret scanning
- dependency scanning
- audit logging
- Sentry

---

## 4. MCP guidance for Cursor
Cursor should prioritize these external systems in this order:
1. Supabase
2. Expo / mobile runtime tooling
3. GitHub
4. Cloudflare
5. Figma
6. Sentry
7. Stripe (later phase)

---

## 5. Build recommendation summary
### Use immediately
- Supabase MCP
- GitHub MCP
- Figma MCP
- Cloudflare MCP
- Expo/mobile tooling

### Add later
- Stripe MCP
- Sentry / monitoring
- analytics tooling

