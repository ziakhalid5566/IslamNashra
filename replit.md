# IslamNashra — AI-Powered Islamic News Platform

> عالمی اسلامی خبریں، ہر لمحہ اپڈیٹ — Global Islamic News, Updated in Real-Time

Full-stack mobile + web app: Express API auto-generates AI-written Islamic news via Groq, and an Expo React Native mobile app displays the feed.

---

## Architecture

```
artifacts/
  api-server/      Express API + node-cron jobs (news generation, auto-delete)
  islamnashra/     Expo React Native mobile app (Expo Router)
  mockup-sandbox/  Vite dev server for UI component previews (Canvas)

lib/
  db/              Drizzle ORM schema + PostgreSQL (Replit built-in)
  api-spec/        OpenAPI 3.1 spec (source of truth for client generation)
  api-client-react/ Generated React Query hooks (auto-generated from spec)
  api-zod/         Generated Zod validation schemas (auto-generated from spec)
```

## Running the Project

Three workflows start automatically:

| Workflow | Command | What it does |
|---|---|---|
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | Builds & starts Express API on port 8080. Runs cron jobs: news generation every 45 min, auto-delete every 15 min. |
| `artifacts/islamnashra: expo` | `pnpm --filter @workspace/islamnashra run dev` | Starts Expo dev server. Scan QR in Expo Go app, or use web preview. |
| `artifacts/mockup-sandbox: Component Preview Server` | `pnpm --filter @workspace/mockup-sandbox run dev` | Vite dev server for canvas component previews. |

## Database

Uses Replit's built-in PostgreSQL (`DATABASE_URL` is auto-provisioned).

To push schema changes: `pnpm --filter @workspace/db exec drizzle-kit push`

Tables: `posts`, `flagged_posts`, `user_preferences`

## Required Secrets

All set as Replit Secrets:

| Secret | Purpose |
|---|---|
| `GROQ_API_KEY` | AI article generation via Groq |
| `GOOGLE_SEARCH_API_KEY` | Image fetching via Google Custom Search |
| `GOOGLE_SEARCH_ENGINE_ID` | Google CSE ID (cx value) |
| `SESSION_SECRET` | Express session signing |

## Key Files

- `artifacts/api-server/src/jobs/newsGenerationJob.ts` — AI → moderation → publish pipeline
- `artifacts/api-server/src/lib/imageProvider.ts` — Swappable image provider (swap to Pexels/Pixabay here)
- `artifacts/api-server/src/lib/contentModeration.ts` — Keyword/pattern filter before publish
- `lib/api-spec/openapi.yaml` — OpenAPI spec; regenerate client with `pnpm --filter @workspace/api-spec run generate`

## GitHub

Remote: `https://github.com/ziakhalid5566/IslamNashra`

## User Preferences

- Keep the project's existing monorepo structure (pnpm workspace).
- Use Replit's built-in PostgreSQL; do not switch to external providers unless asked.
