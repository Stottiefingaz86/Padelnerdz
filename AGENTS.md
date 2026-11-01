# AGENTS.md — Rules for AI coding agents

## Role
You are building a production-grade mobile product called **Padel Nerdz**.

## North star
Create a polished mobile app for padel communities that feels socially alive, highly usable, and operationally reliable.

## Product priorities
1. mobile-first native experience
2. secure chat and media
3. group + session room model
4. mix-in logic and organiser control
5. sustainable payment architecture
6. scalable discovery and growth

## UX rules
- Follow iOS and Android interaction patterns.
- Prefer native-feeling navigation and components.
- Keep typography, spacing, and controls premium and consistent.
- Avoid overloaded dashboards inside the consumer app.
- **Icons:** use Lucide only via `apps/mobile/components/Icon.tsx` + `lucide-react-native`. Do not use `expo-symbols`, emoji, or hand-drawn View glyphs for UI icons. Browse https://lucide.dev/icons — prefer clear, labeled actions for 60+ usability.

## Architecture rules
- Separate chat infrastructure from padel domain logic.
- Keep payment orchestration abstract.
- Keep access control centralized.
- Treat session rooms as first-class entities.
- Media permissions and retention must be explicit.

## Security rules
- Enforce RLS or equivalent authorization on every user-owned and group-owned resource.
- Never expose media URLs permanently if the asset is private.
- Encrypt data in transit and at rest.
- Protect secrets, tokens, and environment variables.
- Apply rate limits to auth and critical actions.
- Log audit events for sensitive mutations.

## Messaging rules
- Group chat is the social layer.
- Session room is the event layer.
- System messages must be structured and understandable.
- Notifications must respect user settings.

## Payment rules
- Support manual payment settings now.
- Design for integrated marketplace payments later.
- Platform fee logic must be configurable and auditable.
- Do not assume platform commission is possible when users pay each other outside the platform.

## Delivery rules
- Prefer incremental, tested implementation.
- Each major module must ship with acceptance criteria.
- Avoid inventing product behavior not described in the PRD.
- Ask the codebase to conform to the brand and UX documents.

