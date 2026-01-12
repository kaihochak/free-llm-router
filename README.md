# Free LLM Router

A public API + SDK that surfaces the healthiest free LLM endpoints (OpenRouter today; adding more providers) with live health metrics and ordered model lists.

## Features

- **Free Model Discovery** - Get currently available free models with filtering and sorting
- **Health Metrics** - Community-reported success/issue signals rolled into health scores
- **Smart Filtering** - Exclude unhealthy models based on recent performance
- **Success Reporting** - Help the community by reporting both successes and failures
- **Time Windows** - Configurable time ranges (15m to 30d) for health data

## Quick Start

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Add your Neon DATABASE_URL and FREE_MODELS_API_KEY

# Push schema to database
bun run db:push

# Start dev server
bun run dev
```

## API Endpoints

### GET /api/v1/models/ids
Lightweight endpoint returning only model IDs. Perfect for quick lookups.

**Query Parameters:**
- `filter` - Capability filters: `chat`, `vision`, `tools`, `longContext`, `reasoning` (comma-separated)
- `sort` - Sort order: `contextLength`, `maxOutput`, `capable`, `leastIssues`, `newest`
- `limit` - Maximum models to return (1-100)
- `excludeWithIssues` - Exclude models with >N issues (default: 5)
- `timeWindow` - Time range for health: `15m`, `30m`, `1h`, `6h`, `24h`, `7d`, `30d`, `all` (default: 24h)

**Response:**
```json
{
  "ids": ["google/gemini-2.0-flash-exp:free", "..."],
  "count": 15
}
```

### GET /api/v1/models/full
Complete endpoint returning full model objects with metadata and health metrics.

**Query Parameters:** (Same as `/ids` endpoint, plus:)
- `userOnly` - Show only your reported issues (default: false, requires auth)

**Response:**
```json
{
  "models": [
    {
      "id": "google/gemini-2.0-flash-exp:free",
      "name": "Gemini 2.0 Flash",
      "contextLength": 1000000,
      "maxCompletionTokens": 8192,
      "modality": "text",
      "inputModalities": ["text"],
      "outputModalities": ["text"]
    }
  ],
  "feedbackCounts": {
    "google/gemini-2.0-flash-exp:free": {
      "rateLimited": 2,
      "unavailable": 1,
      "error": 0,
      "successCount": 150,
      "errorRate": 1.96
    }
  },
  "lastUpdated": "2025-01-08T10:30:00Z",
  "count": 15
}
```

### POST /api/v1/models/feedback
Report model success or issues. **Does not count towards rate limit.**

**Request Body:**
```json
// Report success
{
  "modelId": "google/gemini-2.0-flash-exp:free",
  "success": true,
  "details": "Optional details"
}

// Report issue
{
  "modelId": "google/gemini-2.0-flash-exp:free",
  "issue": "rate_limited",
  "details": "Optional details"
}
```

**Issue types:** `rate_limited`, `unavailable`, `error`

**Response:**
```json
{
  "received": true
}
```

### GET /api/health
Public endpoint for community model health data.

**Query Parameters:**
- `range` - Time range: `24h`, `7d`, `30d` (default: 24h)
- `myReports` - Show only your reports (requires auth, default: false)

## Usage Examples

### Basic Model Fetching

```typescript
import { getModelIds } from './public/free-llm-router';

// Get healthiest chat models from last 24 hours
const models = await getModelIds(
  ['chat'],
  'leastIssues',
  10,
  { excludeWithIssues: 5, timeWindow: '24h' }
);

console.log('Available models:', models);
```

### With Feedback Reporting

```typescript
import { getModelIds, reportSuccess, reportIssue, issueFromStatus } from './public/free-llm-router';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1'
});

const models = await getModelIds(['chat'], 'capable');

for (const modelId of models) {
  try {
    const response = await openai.chat.completions.create({
      model: modelId,
      messages: [{ role: 'user', content: 'Hello!' }]
    });

    // Report success to help the community
    reportSuccess(modelId);
    return response;
  } catch (error: any) {
    // Report issue with correct type
    reportIssue(modelId, issueFromStatus(error.status), error.message);
  }
}
```

### Monitoring Model Health

```typescript
import { getModelIds } from './public/free-llm-router';

// Get models with error rates from last 7 days
const models = await getModelIds(
  ['chat'],
  'capable',
  undefined,
  { timeWindow: '7d' }
);

// Check error rates in the response metadata
const response = await fetch(
  `https://free-LLM-router.pages.dev/api/v1/models/full?timeWindow=7d`,
  {
    headers: { 'Authorization': `Bearer ${process.env.FREE_MODELS_API_KEY}` }
  }
);

const data = await response.json();

data.models.forEach(model => {
  const feedback = data.feedbackCounts[model.id];
  if (feedback && feedback.errorRate > 20) {
    console.warn(`${model.id}: High error rate (${feedback.errorRate}%)`);
  }
});
```

## Authentication

Get your free API key at https://free-LLM-router.pages.dev

Use in API requests:
```bash
curl -H "Authorization: Bearer fma_your_key_here" \
  "https://free-LLM-router.pages.dev/api/v1/models/ids?filter=chat"
```

Set in environment:
```bash
FREE_MODELS_API_KEY=fma_xxxxxxxxxxxxx
```

## Environment Variables

```bash
# Required for API access
FREE_MODELS_API_KEY=fma_xxxxxxxxxxxxx

# Required for hosting (database)
DATABASE_URL=postgresql://...@ep-xxx.us-east-2.aws.neon.tech/free_models_api

# Optional - for scheduled model sync from OpenRouter
REFRESH_API_KEY=your-secret-for-cron
```

## Tech Stack

- **Astro** - Framework with Server-Side Rendering
- **React** - Interactive components
- **Tailwind v4** - Styling
- **shadcn/ui** - UI components
- **Bun** - Runtime & package manager
- **Cloudflare Pages** - Hosting
- **Neon** - Serverless Postgres
- **Drizzle** - ORM

## Development

```bash
bun run dev          # Start dev server (http://localhost:4321)
bun run build        # Build for production
bun run preview      # Preview production build
bun run db:generate  # Generate database migrations
bun run db:push      # Push schema to database
bun run db:studio    # Open Drizzle Studio (database GUI)
```

## Deployment

Deploy to Cloudflare Pages:

1. Build the project:
   ```bash
   bun run build
   ```

2. Deploy via Cloudflare dashboard:
   - Connect your GitHub repository
   - Set build command: `bun run build`
   - Set build output directory: `dist`

3. Set environment variables in Cloudflare Pages:
   - `DATABASE_URL` - Neon Postgres connection string
   - `FREE_MODELS_API_KEY` - Optional, for public SDK usage

## Documentation

- Full web documentation and interactive API explorer at https://free-LLM-router.pages.dev
- [PRD](./docs/PRD.md) - Product requirements and design
- [Reference implementations](./reference/) - Example code for common patterns

## Best Practices

### Error Rate Calculation

Error rates are only meaningful when we have both success and failure reports:

- **10 errors out of 1000 attempts** = 1% error rate ✅ (healthy)
- **10 errors out of 20 attempts** = 50% error rate ⚠️ (unhealthy)
- **10 errors, 0 successes** = Cannot calculate health rate (missing context)

Help improve metrics by reporting both successes and failures.

### When to Report

**Report Success** ✅
- After successful API call to OpenRouter
- Model responded without errors
- Response quality was acceptable

**Report Issues** ⚠️
- `rate_limited` (429): Rate limit exceeded
- `unavailable` (503): Service temporarily unavailable
- `error`: Any other error (4xx, 5xx, malformed responses)

### Time Windows

Choose the appropriate time window for your use case:

- **15m** - Real-time incident detection
- **1h/6h** - Recent performance trends
- **24h** - Daily health (recommended default)
- **7d/30d** - Long-term stability patterns

## Contributing

Help improve model health data by:
1. Using the API in your applications
2. Reporting both successes and issues
3. Sharing feedback on the models you use

Success reports are just as valuable as issue reports for calculating accurate error rates.

## License

MIT

## Support

- GitHub Issues: Report bugs and request features
- Discussions: Ask questions and share feedback
- Email: Check the website for contact information
