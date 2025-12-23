# Free Models API - Product Requirements Document

## Problem Statement

OpenRouter's free models change frequently. Developers building POCs/demos need a reliable way to get current free models without hardcoding or paying for API calls during development.

## Goals

1. Provide a public API that returns currently available free models from OpenRouter
2. Create a landing page with setup docs, code examples, and live model status
3. Accept community feedback on model availability and rate limiting
4. Keep the list updated automatically

## Success Criteria

- API response time < 100ms (edge-cached)
- Model list updated within 24 hours of OpenRouter changes
- Zero maintenance burden (fully automated sync)
- Used by at least 2 external projects

## Target Users

- Developers building AI POCs/demos
- Open source projects that want free LLM access
- Students learning to work with LLMs

---

## Solution Architecture

```
┌─────────────────────────────────────────────────────────┐
│            Astro on Cloudflare Pages                    │
│                 (Single Deployment)                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Landing Page (/)           API Routes (/api/*)         │
│  ┌─────────────────┐       ┌─────────────────────┐      │
│  │ - Setup guide   │       │ GET  /api/models    │      │
│  │ - Live models   │       │ POST /api/feedback  │      │
│  │ - Code examples │       │ POST /api/refresh   │      │
│  │ - Status table  │       └─────────────────────┘      │
│  └─────────────────┘                │                   │
│                                     │                   │
└─────────────────────────────────────│───────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
          ┌─────────────────┐               ┌─────────────────┐
          │  Neon Postgres  │               │  OpenRouter API │
          │  - models       │               │  /api/v1/models │
          │  - feedback     │               └─────────────────┘
          │  - cache meta   │
          └─────────────────┘
```

---

## Tech Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Framework | Astro | Static pages + API routes, great for docs |
| UI | React + Tailwind v4 + shadcn/ui | Modern, accessible components |
| Runtime | Bun | Fast package manager and runtime |
| Hosting | Cloudflare Pages | Free tier, single deployment |
| Database | Neon Postgres | Free tier (0.5GB), serverless |
| ORM | Drizzle | Lightweight, type-safe |

---

## Features

### MVP (Phase 1)

#### 1. API Endpoints

**GET /api/models**
- Returns list of active free models
- Fields: `id`, `name`, `contextLength`
- Includes `lastUpdated` timestamp
- CORS enabled for all origins

**POST /api/feedback**
- Accepts model issue reports
- Fields: `modelId`, `issue`, `details`, `source`
- Issue types: `rate_limited`, `unavailable`, `error`

**POST /api/refresh**
- Triggers sync from OpenRouter API
- Protected by API key (for cron jobs)
- Updates model list in database

#### 2. Landing Page

- **Hero**: What this API does, why it exists
- **Quick Start**: 3-step guide to using the API
- **Live Model Table**: Shows current free models with status
- **Code Examples**: TypeScript/JavaScript snippets
- **Report Issues**: How to submit feedback

#### 3. Database Schema

```sql
-- Free models from OpenRouter
CREATE TABLE free_models (
  id TEXT PRIMARY KEY,           -- e.g., 'google/gemini-2.0-flash-exp:free'
  name TEXT NOT NULL,
  context_length INTEGER,
  description TEXT,
  priority INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Community feedback on models
CREATE TABLE model_feedback (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL,
  issue TEXT NOT NULL,           -- 'rate_limited' | 'unavailable' | 'error'
  details TEXT,
  source TEXT,                   -- 'courserater', 'anonymous', etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sync metadata
CREATE TABLE sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Future (Phase 2+)

- Model health scores based on feedback
- Historical availability data
- Model comparison features
- Slack/Discord notifications for new models
- API key authentication for higher rate limits

---

## API Response Format

### GET /api/models

```json
{
  "models": [
    {
      "id": "google/gemini-2.0-flash-exp:free",
      "name": "Gemini 2.0 Flash Experimental",
      "contextLength": 1000000
    },
    {
      "id": "meta-llama/llama-3.2-3b-instruct:free",
      "name": "Llama 3.2 3B Instruct",
      "contextLength": 131072
    }
  ],
  "lastUpdated": "2024-12-23T10:00:00Z"
}
```

### POST /api/feedback

Request:
```json
{
  "modelId": "google/gemini-2.0-flash-exp:free",
  "issue": "rate_limited",
  "details": "Getting 429 after ~10 requests",
  "source": "courserater"
}
```

Response:
```json
{
  "received": true
}
```

---

## Project Structure

```
free-models-api/
├── src/
│   ├── pages/
│   │   ├── index.astro        # Landing page
│   │   └── api/
│   │       ├── models.ts      # GET - list models
│   │       ├── feedback.ts    # POST - report issues
│   │       └── refresh.ts     # POST - force refresh
│   ├── components/
│   │   ├── ui/                # shadcn components
│   │   ├── ModelTable.tsx     # Live model list
│   │   └── CodeExample.tsx    # Usage examples
│   ├── db/
│   │   ├── index.ts           # Drizzle client
│   │   └── schema.ts          # Tables definition
│   ├── services/
│   │   └── openrouter.ts      # Fetch & filter logic
│   └── styles/
│       └── globals.css        # Tailwind v4
├── drizzle/
│   └── migrations/            # SQL migrations
├── drizzle.config.ts
├── astro.config.mjs
├── components.json            # shadcn config
└── package.json
```

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/free_models_api

# OpenRouter
OPENROUTER_API_KEY=your-openrouter-key

# Optional: Protect refresh endpoint
REFRESH_API_KEY=your-secret-key
```

---

## Implementation Order

### Phase 1: Core API
1. Initialize Astro project with Bun, Tailwind v4, React
2. Set up Neon database and Drizzle
3. Implement database schema and migrations
4. Build `GET /api/models` endpoint
5. Build `POST /api/feedback` endpoint
6. Build `POST /api/refresh` endpoint with OpenRouter sync

### Phase 2: Landing Page
1. Add shadcn/ui components (table, card, button)
2. Build landing page layout
3. Create ModelTable component (fetches from API)
4. Create CodeExample component
5. Add responsive styling

### Phase 3: Deploy
1. Configure Cloudflare Pages adapter
2. Set up environment variables in Cloudflare
3. Deploy and test
4. Set up cron job for daily refresh (Cloudflare Cron Triggers or external)

---

## Security Considerations

- DATABASE_URL only accessible server-side
- Rate limit feedback endpoint to prevent spam (IP-based)
- Optional API key for refresh endpoint
- CORS configured appropriately
- No PII collected

---

## Testing Strategy

- Unit tests for OpenRouter sync logic
- Integration tests for API endpoints
- Manual testing of landing page
- Monitor Cloudflare analytics for usage

---

## Reference Implementation

The `reference/` directory contains files from the CourseRater implementation that can be adapted:

- `openrouter-sync.ts` - Sync logic for fetching and filtering free models
- `openrouter-models.server.ts` - Database operations pattern
- `openrouter-client.ts` - OpenRouter API client

These files use Supabase, but the logic can be adapted for Drizzle + Neon.

---

## OpenRouter Sync & Model Availability

**Source API**
- `GET https://openrouter.ai/api/v1/models` (requires `OPENROUTER_API_KEY`)

**Free model detection**
- Primary: `id` ends with `:free`
- Secondary confirmation: pricing fields are `"0"`

**Availability**
- A model is considered active if it appears in the latest `/api/v1/models` response.
- If a previously stored model is missing, mark it inactive and record `last_seen_at`.
- Canonical slug can be used as a stable indicator for availability changes.

**Sync policy**
- Scheduled daily sync.
- Lazy refresh when `/api/models` is called and `lastUpdated` is older than 15 minutes.
- `/api/refresh` remains as a manual trigger (admin/cron), protected by `REFRESH_API_KEY`.

**Caching**
- `GET /api/models` sets `Cache-Control: public, s-maxage=900` and supports `ETag`.
- `lastUpdated` is sourced from `sync_meta.updated_at`.
