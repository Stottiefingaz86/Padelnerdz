# Padel Nerdz web

Marketing site (App Store URLs, privacy, support) and **admin back office** for owner metrics + PostHog.

## Scripts

```bash
npm run web          # from monorepo root
# or
cd apps/web && npm run dev
```

- `/`,  landing
- `/privacy` · `/support`,  App Store required pages
- `/admin`,  password-gated metrics (default password in `.env.local`)

## Env

Copy `.env.example` → `.env.local`. Set `NEXT_PUBLIC_POSTHOG_KEY` when you have a Padel Nerdz PostHog project (org plan currently allows one project,  filter by `app=padel_nerdz` if sharing).
