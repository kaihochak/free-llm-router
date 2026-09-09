# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install          # Install dependencies
bun run dev          # Start dev server (Astro)
bun run build        # Build for production
bun run preview      # Preview production build
bun run db:push      # Push schema changes to Neon database
bun run db:studio    # Open Drizzle Studio for database inspection
bun run db:generate  # Generate Drizzle migrations
```

## Commit Policy

Do not commit without my permission.

## Architecture

This is an Astro site with server-side rendering deployed to Cloudflare Pages. It provides a public API for fetching free LLM models from OpenRouter.

### Key Patterns

**Database Access**: The database connection is created per-request using `access(...)` from `src/lib/runtime-access.ts`. In Cloudflare/runtime contexts, DB and slot keys (`ACTIVE_DB_SLOT`, `DATABASE_URL*`) must come from `locals.runtime.env`; local development can fall back to `import.meta.env`.

```typescript
const rt = access(contextOrLocals);
const db = rt.db('app');
```

**React in Astro**: Interactive components use `client:load` directive and require wrapping with `QueryProvider` for data fetching. The base layout (`src/layouts/base.astro`) handles global styling, theme script, and shared components like `SiteHeader`.

**Model Sync**: The OpenRouter service (`src/services/openrouter.ts`) syncs against OpenRouter's `/api/v1/models` feed. In this codebase, `provider/model:free` and `provider/model` are treated as distinct model IDs. `free_models.isActive` is the current sync-state flag, while `model_availability_snapshots` stores historical positive sightings ("last seen as free in the feed").

### Structure

- `src/pages/api/` - API routes (`/api/v1/models/ids`, `/api/v1/models/full`, admin/auth/demo routes)
- `src/services/openrouter.ts` - Model sync logic, filtering, and database queries
- `src/db/` - Drizzle schema and database client factory
- `src/components/ui/` - shadcn/ui components
- `src/hooks/useAvailability.ts` - Frontend hook for model availability history
- `src/lib/runtime-access.ts` - Request-scoped env/DB resolution helper

### API

Main endpoints:

- `GET /api/v1/models/ids`
- `GET /api/v1/models/full`

- Query params: `useCase`, `sort`, `topN`, `maxErrorRate`, `timeRange`, `myReports`
- Returns IDs or full model objects, plus freshness metadata when applicable
- CORS enabled for all origins
