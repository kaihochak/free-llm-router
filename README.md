# Free LLM Router

Open-source API and web app for discovering free LLM models with community reliability signals. This repo contains the API, the web UI, and the supporting infrastructure.

## Start here

- Homepage and hosted docs: https://freellmrouter.com
- Product and API overview: https://freellmrouter.com/docs

## Quick start (local)

```bash
bun install
cp .env.example .env
bun run db:push
bun run dev
```

## Repository guide

- API routes: `src/pages/api`
- UI and docs: `src/components/docs`
- DB schema/migrations: `drizzle/` and `sql/`
- Scripts: `scripts/`

## Contributing

See `CONTRIBUTING.md`.

## License

MIT. See `LICENSE`.
