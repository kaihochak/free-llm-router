# Contributing to Free LLM Router

Thank you for your interest in contributing! This project is driven by community contributions to improve LLM model health data.

## Ways to Contribute

### 1. Report Issues
- Found a bug? [Open an issue](../../issues) with details about the problem
- Suggest improvements to model filtering, health metrics, or documentation

### 2. Improve Health Data
- Use the API and submit feedback about model reliability
- Help us identify patterns in model performance
- Contribute ideas for better health scoring algorithms

### 3. Code Contributions
- Fix bugs and add features
- Improve documentation and examples
- Optimize performance

### 4. Integrations
- Create SDKs for your favorite language
- Build plugins for LangChain, LlamaIndex, etc.
- Create examples and tutorials

## Development Setup

### Prerequisites
- Node.js 18+ / Bun
- PostgreSQL database (or use Supabase / Neon)

### Local Setup

```bash
# Install dependencies
bun install

# Create .env.local with database URL
echo "DATABASE_URL=postgresql://..." > .env.local

# Run database migrations
bun run db:push

# Start dev server
bun run dev
```

### Database Schema
- `free_models` - LLM model metadata from OpenRouter
- `model_feedback` - User-submitted success/error reports
- Users, API keys, and request logs in auth schema

See `src/db/schema.ts` for full details.

## Code Style

- Use TypeScript for type safety
- Follow existing patterns in `src/lib/` and `src/services/`
- Keep API endpoints simple and well-documented
- Use environment variables for configuration

## Testing

```bash
# Run tests (if available)
bun run test

# Build for production
bun run build
```

## Submitting Changes

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Make your changes with clear commit messages
4. Test locally before submitting
5. Open a pull request with a description of changes

## Health Data Quality

If contributing health data insights:
- Report both successes and failures (balanced feedback)
- Include relevant context (rate limits, errors, timing)
- Be honest about model performance

## Questions?

- Check [GitHub Discussions](../../discussions) for help
- Review the [API documentation](README.md)

Thank you for contributing!
