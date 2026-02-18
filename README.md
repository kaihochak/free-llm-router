# Free LLM Router

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](CONTRIBUTING.md)

Open-source API and web app for discovering free LLM models on [OpenRouter](https://openrouter.ai) with community-driven reliability signals.

## What is this?

Free LLM models are great for building AI features at zero cost, but they're often unavailable, rate-limited, or just disappear. Free LLM Router gives you an API that returns a live-updated, filterable list of available free models — along with community health data so you know which ones actually work.

## Features

- **Live-updated model list** — Continuously tracks which free models on OpenRouter are available right now
- **Filter by use case** — Narrow results by chat, vision, tools, long context, or reasoning capabilities
- **Community health signals** — Users submit success/failure feedback; flaky models get ranked lower
- **Model exclusion** — Blacklist specific models so they never appear in your results
- **Hosted or self-hosted** — 200 requests/day free on the hosted version, or self-host with no limits

## Quick Start (Hosted API)

1. Create an API key at [freellmrouter.com](https://freellmrouter.com)
2. Make a request:

```bash
curl -H "X-API-Key: your-api-key-here" \
  "https://freellmrouter.com/api/v1/models/ids?useCase=reasoning&topN=5"
```

```json
{
  "ids": [
    "deepseek/deepseek-r1-0528:free",
    "google/gemini-2.5-pro-exp-03-25:free",
    "qwen/qwen3-235b-a22b:free",
    "google/gemma-3-27b-it:free",
    "moonshotai/kimi-k2:free"
  ],
  "count": 5
}
```

### Endpoints

| Endpoint                       | Auth     | Description                          |
| ------------------------------ | -------- | ------------------------------------ |
| `GET /api/v1/models/ids`       | Required | Lightweight — returns model IDs only |
| `GET /api/v1/models/full`      | Required | Full model objects with health data  |
| `POST /api/v1/models/feedback` | Required | Submit success/failure feedback      |
| `GET /api/availability`        | Public   | Model availability history           |
| `GET /api/health`              | Public   | Community health metrics             |

Common query params: `useCase`, `sort`, `topN`, `maxErrorRate`, `timeRange`, `excludeModelIds`

Full API reference: [freellmrouter.com/docs](https://freellmrouter.com/docs)

## Self-Hosting

### Prerequisites

- [Bun](https://bun.sh) (runtime)
- PostgreSQL database ([Neon](https://neon.tech) recommended)
- GitHub OAuth app (for authentication)

### Setup

```bash
bun install
cp .env.example .env    # Configure DATABASE_URL, GitHub OAuth, and BETTER_AUTH_SECRET
bun run db:push          # Push schema to your database
bun run dev              # Start dev server at localhost:4321
```

See [.env.example](.env.example) for all required environment variables.

## Tech Stack

Astro · React · Cloudflare Pages · Drizzle ORM · Neon PostgreSQL · better-auth · Tailwind CSS

## Repository Guide

- `src/pages/api/` — API routes
- `src/services/` — Model sync and business logic
- `src/components/` — React UI components and docs
- `src/db/` — Drizzle schema and database client
- `scripts/` — Database management scripts

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
Please also review our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT — see [LICENSE](LICENSE).
