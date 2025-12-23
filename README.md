# Free Models API

A public API that provides developers with a list of currently available free models from OpenRouter.

## Quick Start

```bash
# Initialize the project
bunx --bun create-astro@latest . --template with-tailwindcss --install --add react --git

# Add dependencies
bun add @astrojs/cloudflare drizzle-orm @neondatabase/serverless
bun add -D drizzle-kit

# Add shadcn/ui
bunx --bun shadcn@latest init
bunx --bun shadcn@latest add table card button badge

# Set up environment
cp .env.example .env
# Add your Neon DATABASE_URL

# Run migrations
bun run db:push

# Start dev server
bun run dev
```

## Documentation

- [PRD](./docs/PRD.md) - Full product requirements document
- [reference/](./reference/) - Reference implementations from CourseRater

## Stack

- **Astro** - Framework
- **React** - Interactive components
- **Tailwind v4** - Styling
- **shadcn/ui** - UI components
- **Bun** - Runtime & package manager
- **Cloudflare Pages** - Hosting
- **Neon** - Serverless Postgres
- **Drizzle** - ORM

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/models` | GET | List active free models |
| `/api/feedback` | POST | Report model issues |
| `/api/refresh` | POST | Trigger sync from OpenRouter |

## Environment Variables

```bash
DATABASE_URL=postgresql://...@ep-xxx.us-east-2.aws.neon.tech/free_models_api
REFRESH_API_KEY=your-secret-for-cron  # Optional
```

## Development

```bash
bun run dev      # Start dev server
bun run build    # Build for production
bun run preview  # Preview production build
bun run db:push  # Push schema to database
bun run db:studio # Open Drizzle Studio
```

## Deployment

Deploy to Cloudflare Pages:

```bash
bun run build
# Deploy via Cloudflare dashboard or wrangler
```

Set `DATABASE_URL` in Cloudflare Pages environment variables.
