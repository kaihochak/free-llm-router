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

**Database Access**: The database connection is created per-request using Cloudflare's runtime environment. API routes access `DATABASE_URL` from `locals.runtime.env` in production or `import.meta.env` in development:
```typescript
const runtime = (locals as { runtime?: { env?: { DATABASE_URL?: string } } }).runtime;
const databaseUrl = runtime?.env?.DATABASE_URL || import.meta.env.DATABASE_URL;
const db = createDb(databaseUrl);
```

**React in Astro**: Interactive components use `client:load` directive and require wrapping with `QueryProvider` for data fetching. The base layout (`src/layouts/base.astro`) handles global styling, theme script, and shared components like `SiteHeader`.

**Model Sync**: The OpenRouter service (`src/services/openrouter.ts`) implements lazy refresh - if data is older than 15 minutes, it syncs from OpenRouter before returning models. Models are stored with `isActive` flag; missing models get marked inactive rather than deleted.

### Structure

- `src/pages/api/` - API routes (models endpoint at `v1/models/openrouter.ts`)
- `src/services/openrouter.ts` - Model sync logic, filtering, and database queries
- `src/db/` - Drizzle schema and database client factory
- `src/components/ui/` - shadcn/ui components
- `src/hooks/useModels.ts` - Frontend hook for model fetching with client-side filtering/sorting

### API

Main endpoint: `GET /api/v1/models/openrouter`
- Query params: `filter` (comma-separated: chat, vision, coding, longContext, reasoning), `sort` (contextLength, maxOutput, name, provider, capable)
- Returns: `{ models, feedbackCounts, lastUpdated, count }`
- CORS enabled for all origins
