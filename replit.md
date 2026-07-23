# IslamNashra

اسلامی خبریں — AI سے تیار کردہ عالمی اسلامی نیوز پلیٹ فارم۔ اردو، عربی اور انگریزی میں خودکار خبریں۔

## Run & Operate

- `pnpm --filter @workspace/islamnashra run dev` — Expo موبائل ایپ (port 20173)
- `pnpm --filter @workspace/api-server run dev` — API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (React Native) with Expo Router
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- AI: Groq SDK (news generation in EN/UR/AR)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/islamnashra/` — Expo mobile app
  - `app/(tabs)/` — Feed, Search, Notifications, Settings screens
  - `app/post/[id].tsx` — Post detail screen
  - `components/NewsCard.tsx` — main news card component
  - `contexts/LanguageContext.tsx` — multi-language (UR/AR/EN)
  - `contexts/NotificationsContext.tsx` — push notification state
  - `constants/colors.ts` — design tokens (light + dark mode)
- `artifacts/api-server/src/` — Express backend
  - `routes/posts.ts` — CRUD + likes/views
  - `routes/preferences.ts` — push notification registration
  - `routes/admin.ts` — content moderation
  - `jobs/newsGenerationJob.ts` — AI news generation (every 45 min)
  - `jobs/autoDeleteJob.ts` — expired post cleanup (every 15 min)
  - `lib/newsGenerator.ts` — Groq AI integration
  - `lib/imageProvider.ts` — Pexels image search
  - `lib/pushNotifications.ts` — Expo push notifications
- `lib/db/src/schema/` — DB schema (posts, userPreferences, flaggedPosts)
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/api-client-react/` — generated React Query hooks

## Architecture decisions

- AI news generated entirely by Groq (not real RSS/scraping) — summaries labeled "AI-Generated Summary" in UI
- Multi-language in single Groq call to minimize API cost
- Pexels for images (free, no billing required)
- AsyncStorage for device-local state (liked posts, language preference)
- Push notifications via Expo server SDK

## Product

- **Feed** — اسلامی خبریں (World, Palestine, South Asia, Scholars, Community)
- **Search** — instant search with breaking/trending pinned
- **Notifications** — push notification inbox
- **Settings** — language, notification preferences

## User preferences

- GitHub repo: https://github.com/ziakhalid5566/IslamNashra.git

## Gotchas

- GROQ_API_KEY required for news generation (set in Replit Secrets)
- GITHUB_TOKEN required for git push (set in Replit Secrets)
- Pexels API key may be needed for image search (PEXELS_API_KEY)
- Required env: `DATABASE_URL` — Postgres connection string (runtime-managed)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `SECRETS_CHECKLIST.md` for all required API keys
