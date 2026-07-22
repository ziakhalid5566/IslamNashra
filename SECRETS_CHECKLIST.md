# Required Secrets & Environment Variables

This file lists every secret and environment variable needed to run IslamNashra.
**Values are never stored here.** Set them in your deployment platform's encrypted secrets manager.

---

## Replit (development)
Set via **Replit Secrets** (Settings → Secrets):

| Secret Name | Description |
|-------------|-------------|
| `GROQ_API_KEY` | Groq API key — used by `newsGenerator.ts` to call `llama-3.3-70b-versatile` |
| `GOOGLE_SEARCH_API_KEY` | Google Custom Search API key — 100 free searches/day |
| `GOOGLE_SEARCH_ENGINE_ID` | Google Custom Search Engine ID (the `cx` value) |
| `DATABASE_URL` | Neon PostgreSQL connection string (`postgres://...`) |
| `SESSION_SECRET` | Random string used to sign Express sessions |

---

## GitHub Actions (CI/CD)
Add the same values under **Settings → Secrets and variables → Actions**:

| Secret Name | Used In |
|-------------|---------|
| `GROQ_API_KEY` | API server runtime |
| `GOOGLE_SEARCH_API_KEY` | API server runtime |
| `GOOGLE_SEARCH_ENGINE_ID` | API server runtime |
| `DATABASE_URL` | DB push / migrations |
| `SESSION_SECRET` | API server runtime |

---

## Non-Secret Environment Variables
These are safe to store as plain env vars (not secrets):

| Variable | Value | Notes |
|----------|-------|-------|
| `EXPO_PUBLIC_DOMAIN` | Your Replit dev domain | Set automatically in Replit |
| `NEWS_GENERATION_CRON` | `*/45 * * * *` | Override to change post frequency |
| `AUTO_DELETE_CRON` | `*/15 * * * *` | Override to change delete frequency |

---

## How to obtain each secret

- **GROQ_API_KEY** → https://console.groq.com/keys
- **GOOGLE_SEARCH_API_KEY** → https://console.cloud.google.com/apis/credentials (enable "Custom Search API")
- **GOOGLE_SEARCH_ENGINE_ID** → https://programmablesearchengine.google.com/controlpanel/all (create a new engine, copy the `cx` value)
- **DATABASE_URL** → https://console.neon.tech (create a project, copy the connection string with `?sslmode=require`)
- **SESSION_SECRET** → run `openssl rand -base64 32` in your terminal
