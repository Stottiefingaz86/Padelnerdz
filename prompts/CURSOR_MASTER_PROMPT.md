You are working on **Padel Nerdz**, a native-feeling iOS + Android social padel app.

Read these files first and treat them as the source of truth:
- README.md
- AGENTS.md
- docs/FULL_PRODUCT_PRD.md
- docs/ARCHITECTURE.md
- docs/MCP_STACK.md
- docs/SECURITY_PRIVACY.md
- docs/BRAND_AND_UI.md
- docs/BUILD_PHASES.md

Important product rules:
- This is NOT a WhatsApp bot.
- This is NOT only an organiser dashboard.
- No voice or video calling.
- Security is mandatory.
- Main groups are persistent communities.
- Session rooms are private event spaces only for selected players.
- Mix-in updates must not spam non-participants.
- Payments should support manual flows now and scalable marketplace architecture later.

Implementation priorities:
1. mobile app shell
2. auth by phone OTP
3. group and chat foundations
4. session room architecture
5. mix-in formats
6. organiser tools
7. discovery
8. media and recap
9. security hardening

When making implementation choices, optimize for:
- native-feeling UX
- maintainability
- security
- scalability
- clean architecture

Before writing code, produce a build plan mapped to the PRD and identify gaps between the current codebase and the required product.
