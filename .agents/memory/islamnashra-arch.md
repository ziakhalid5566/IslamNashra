---
name: IslamNashra architecture
description: Key decisions and constraints for the IslamNashra AI news platform build
---

## Key decisions

- **Zod imports**: api-server uses `zod/v4` — must have `zod: catalog:` in api-server/package.json (not just through api-zod)
- **Groq response_format**: Do NOT use `response_format: { type: "json_object" }` with array-returning prompts — model returns empty when mode conflicts with array instruction. Remove that option and rely on explicit prompt + regex extraction.
- **DB tables**: posts, user_preferences, flagged_posts — all in lib/db/src/schema/; rebuild libs with `pnpm run typecheck:libs` before typechecking artifact packages.
- **Image daily budget**: DAILY_IMAGE_BUDGET=90 (Google CSE free 100/day), only articles with significanceScore>=6 get images. Counter is in-memory (resets on restart).
- **Content moderation**: runs before publish; flagged articles go to flagged_posts table, NOT auto-published. Admin routes at /api/admin/flagged — currently unprotected, protect in production.
- **EXPO_PUBLIC_DOMAIN**: Set to REPLIT_DEV_DOMAIN value via setEnvVars. Used by setBaseUrl() in app/_layout.tsx.
- **Push notifications**: Server-side uses expo-server-sdk. Client-side token registration is wired in settings screen via upsertPreferences mutation.
- **Scheduler**: node-cron in api-server/src/jobs/scheduler.ts, runs news gen every 45min + auto-delete every 15min. First run triggers 8s after startup.

**Why:**
- zod/v4 subpath needed because workspace catalog pins zod ^3.25.76 (which has /v4 compat)
- Groq json_object mode requires object response, not array — prompt contradiction caused empty returns
- Daily image counter resets on process restart (acceptable for MVP; use Redis for multi-instance)
