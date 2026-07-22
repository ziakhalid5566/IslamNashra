# IslamNashra — AI-Powered Islamic News Platform

> عالمی اسلامی خبریں، ہر لمحہ اپڈیٹ — Global Islamic News, Updated in Real-Time

A full-stack mobile + web application that auto-generates and posts AI-written news content about Muslims and Islamic affairs worldwide. Articles auto-expire after 72 hours.

---

## ⚠️ Important Notices

### AI-Generated Content
This app uses AI (Groq) to write news summaries. There is **no human journalist** verifying facts. Content carries a real risk of inaccuracies. **Spot-check generated content regularly.** The "AI-Generated Summary" label is shown on every article in the UI.

### Image Copyright
Images are fetched from Google Custom Search (72-hour auto-delete reduces but does not eliminate copyright risk). Long-term, consider switching to Pexels/Pixabay or AI-generated images. See `artifacts/api-server/src/lib/imageProvider.ts` to swap providers.

### App Store Policy
Google Play has specific policies for news/current-events apps regarding content accuracy. The content moderation queue and AI disclaimer are designed to help pass review. Read [Google Play's News content policy](https://support.google.com/googleplay/android-developer/answer/9876714) before submitting.

---

## Environment Variables Required

Set these as Replit Secrets (never commit them):

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq API key for AI article generation |
| `GOOGLE_SEARCH_API_KEY` | Google Custom Search API key (100 free searches/day) |
| `GOOGLE_SEARCH_ENGINE_ID` | Google Custom Search Engine ID (cx value) |
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `SESSION_SECRET` | Session secret (auto-generated) |

Non-secret env vars (set in Replit env, not secrets):

| Variable | Description | Default |
|----------|-------------|---------|
| `NEWS_GENERATION_CRON` | Cron schedule for news generation | `*/45 * * * *` (every 45min) |
| `AUTO_DELETE_CRON` | Cron schedule for auto-delete | `*/15 * * * *` (every 15min) |
| `EXPO_PUBLIC_DOMAIN` | Replit dev domain (set automatically) | — |

---

## Posting Schedule & Image Budget

### Adjusting post frequency
Edit the `NEWS_GENERATION_CRON` env var using standard cron syntax:
- `*/30 * * * *` — every 30 min (~48 runs/day × 5 articles = 240 articles/day) ⚠️ **exceeds image budget**
- `*/45 * * * *` — every 45 min (~32 runs/day × 5 = 160 articles/day) ✅ recommended
- `0 * * * *` — every hour (~24 runs/day × 5 = 120 articles/day) ✅ conservative

### Image budget
Google Custom Search free tier: **100 searches/day**. The app limits usage to 90/day (`DAILY_IMAGE_BUDGET` in `newsGenerationJob.ts`) and only fetches images for articles with `significanceScore >= 6` (`IMAGE_SCORE_THRESHOLD`).

To adjust: edit `artifacts/api-server/src/jobs/newsGenerationJob.ts`:
```typescript
const DAILY_IMAGE_BUDGET = 90;      // Max images per day
const IMAGE_SCORE_THRESHOLD = 6;    // Min score to get an image
```

### Swapping image providers
Edit `artifacts/api-server/src/lib/imageProvider.ts` — the `fetchImage()` function is the single place to change. Documented alternatives: Pexels API, Pixabay API, AI-generated images.

---

## Content Moderation Queue

Flagged articles are held in the `flagged_posts` table for manual review.

**Review flagged posts via the API:**
```bash
# List all flagged posts
curl https://YOUR_DOMAIN/api/admin/flagged

# Approve and publish a flagged post
curl -X POST https://YOUR_DOMAIN/api/admin/flagged/POST_ID/approve

# Reject and delete a flagged post
curl -X POST https://YOUR_DOMAIN/api/admin/flagged/POST_ID/reject
```

**⚠️ Production note:** These admin routes are currently open (no auth). Before publishing, protect them with a secret header or IP allowlist in `artifacts/api-server/src/routes/admin.ts`.

---

## Database Schema

Three tables in PostgreSQL (managed via Drizzle ORM):

| Table | Purpose |
|-------|---------|
| `posts` | Published articles (auto-deleted after 72h) |
| `flagged_posts` | Articles held for moderation |
| `user_preferences` | Device push token + category subscriptions |

Schema files: `lib/db/src/schema/`

Push schema changes: `pnpm --filter @workspace/db run push`

---

## Running Locally

```bash
# Install dependencies
pnpm install

# Push DB schema
pnpm --filter @workspace/db run push

# Start API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Start Expo app (separate terminal)
pnpm --filter @workspace/islamnashra run dev
```

---

## Building for Play Store (Android APK/AAB)

> ⚠️ **Replit does not currently support Google Play (Android) publishing** via the built-in Expo Launch flow. iOS (App Store) publishing is supported via Replit's Expo Launch button.

For Android, you'll need to build locally using EAS:
1. Install EAS CLI: `npm install -g eas-cli`
2. Log in: `eas login`
3. Configure: `eas build:configure`
4. Build AAB: `eas build --platform android --profile production`

**AdMob integration:** Replace placeholders in `artifacts/islamnashra/app/(tabs)/index.tsx`:
- `YOUR_ADMOB_APP_ID` → your AdMob App ID
- `YOUR_BANNER_UNIT_ID` → your banner ad unit ID

---

## Architecture

```
artifacts/
  api-server/          Express API + cron jobs
    src/
      jobs/
        newsGenerationJob.ts   AI → moderation → publish
        autoDeleteJob.ts       Deletes expired posts every 15min
        scheduler.ts           node-cron orchestration
      lib/
        newsGenerator.ts       Groq API integration
        imageProvider.ts       Swappable image fetching (Google CSE)
        contentModeration.ts   Keyword/pattern filter
        pushNotifications.ts   Expo push notification sender
      routes/
        posts.ts               GET /posts, /posts/categories, /posts/:id
        preferences.ts         POST/GET /preferences
        admin.ts               Admin moderation endpoints
  islamnashra/         Expo React Native mobile app
    app/
      (tabs)/index.tsx   Home feed
      (tabs)/settings.tsx  Notifications & category settings
      post/[id].tsx      Article detail view
    components/
      NewsCard.tsx        News card component
      SkeletonCard.tsx    Loading skeleton

lib/
  db/          Drizzle ORM + PostgreSQL schema
  api-spec/    OpenAPI 3.1 spec (source of truth)
  api-client-react/  Generated React Query hooks (auto-generated)
  api-zod/     Generated Zod validation schemas (auto-generated)
```

---

## Known Risks

1. **AI hallucination**: No human journalist verifies facts. Spot-check regularly.
2. **Image copyright**: 72-hour auto-delete reduces but does not eliminate risk. Consider AI-generated images long-term.
3. **Google API ToS**: Multi-account quota rotation may risk account suspension. Single-account 90/day limit is the safe default.
4. **App store review**: Google Play has news app content policies. Disclaimer + moderation queue are mitigations, not guarantees.
5. **Push notification scale**: Expo's free push service has rate limits. At large scale, use FCM/APNs directly.
6. **Server costs**: Neon free tier + Render/Railway low-cost should suffice initially (~450-500 posts stored at any time with 72h TTL at recommended posting rate).
