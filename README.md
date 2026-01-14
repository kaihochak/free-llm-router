# Free LLM Router

A free, open-source API that surfaces the healthiest free LLM models with community-powered health metrics. Get reliable model endpoints, real-time reliability data, and help the community improve model quality.

**Website:** https://free-llm-router.pages.dev
**GitHub:** https://github.com/kaihochak/free-llm-router
**License:** MIT

## Features

- ✅ **Free Model Discovery** - Get currently available free LLM models with filtering and sorting
- ✅ **Community Health Data** - Aggregated success/error reports from real users
- ✅ **Smart Filtering** - Exclude unreliable models based on recent performance
- ✅ **Personal Reports** - View your own experience with models (with `?myReports=true`)
- ✅ **Real-Time Feedback** - Report successes and issues to help the community
- ✅ **Flexible Time Windows** - See health metrics from 15 minutes to 30 days
- ✅ **Self-Hosting** - MIT licensed code, run it yourself with your own database

## Quick Start

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Add your Neon DATABASE_URL and FREE_LLM_ROUTER_API_KEY

# Push schema to database
bun run db:push

# Start dev server
bun run dev
```

## API Usage

### Authentication

Free tier: 200 requests per 24 hours per user, 10 API keys maximum.

Get your API key at https://free-llm-router.pages.dev

```bash
curl -H "Authorization: Bearer fma_your_key_here" \
  "https://free-llm-router.pages.dev/api/v1/models/ids?filter=chat"
```

### GET /api/v1/models/ids

Lightweight endpoint returning only model IDs. Perfect for quick lookups.

**Query Parameters:**

- `filter` - Capability filters: `chat`, `vision`, `tools`, `longContext`, `reasoning` (comma-separated)
- `sort` - Sort order: `contextLength`, `maxOutput`, `capable`, `leastIssues`, `newest`
- `topN` - Maximum models to return (1-100, default: all)
- `maxErrorRate` - Exclude models with error rate > N% (0-100)
- `timeRange` - Time range for health: `15m`, `30m`, `1h`, `6h`, `24h`, `7d`, `30d`, `all` (default: 24h)
- `myReports` - Show only your reported data (requires auth, default: false)

**Response:**

```json
{
  "ids": ["google/gemini-2.0-flash-exp:free", "..."],
  "count": 15
}
```

### GET /api/v1/models/full

Complete endpoint returning full model objects with metadata and health metrics.

**Query Parameters:** (Same as `/ids` endpoint)

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
  "lastUpdated": "2026-01-08T10:30:00Z",
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

Public endpoint for community model health data. No authentication required.

**Query Parameters:**

- `timeRange` - Time range: `24h`, `7d`, `30d` (default: 24h)

## Usage Examples

### Basic Model Fetching

```typescript
import { getModelIds } from './public/free-llm-router';

// Get healthiest chat models from last 24 hours
const models = await getModelIds(['chat'], 'leastIssues', 10, {
  excludeWithIssues: 5,
  timeWindow: '24h',
});

console.log('Available models:', models);
```

### With Feedback Reporting

```typescript
import { getModelIds, reportSuccess, reportIssue, issueFromStatus } from './public/free-llm-router';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

const models = await getModelIds(['chat'], 'capable');

for (const modelId of models) {
  try {
    const response = await openai.chat.completions.create({
      model: modelId,
      messages: [{ role: 'user', content: 'Hello!' }],
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
const models = await getModelIds(['chat'], 'capable', undefined, { timeWindow: '7d' });

// Check error rates in the response metadata
const response = await fetch(`https://free-llm-router.pages.dev/api/v1/models/full?timeWindow=7d`, {
  headers: { Authorization: `Bearer ${process.env.FREE_LLM_ROUTER_API_KEY}` },
});

const data = await response.json();

data.models.forEach((model) => {
  const feedback = data.feedbackCounts[model.id];
  if (feedback && feedback.errorRate > 20) {
    console.warn(`${model.id}: High error rate (${feedback.errorRate}%)`);
  }
});
```

## Your Personal Data

### View Your Own Reports

Use `?myReports=true` to see only YOUR reported data (instead of community-wide):

```bash
curl -H "Authorization: Bearer fma_your_key_here" \
  "https://free-llm-router.pages.dev/api/v1/models/full?myReports=true"
```

This shows model reliability based on your actual experience, preventing bad actors from poisoning community data with false reports.

### Data Privacy

- Your personal health reports are private (only visible to you)
- Community health data is public (aggregated from all users)
- See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for full details

## Environment Variables

```bash
# Required for API access
FREE_LLM_ROUTER_API_KEY=fma_xxxxxxxxxxxxx

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

### Hosted (Cloudflare Pages + Neon)

1. Fork this repository on GitHub

2. Set up a Neon Postgres database:
   - Create account at https://neon.tech
   - Create a new database
   - Copy the connection string

3. Deploy to Cloudflare Pages:
   - Connect your GitHub repository in Cloudflare dashboard
   - Set build command: `bun run build`
   - Set build output directory: `dist`
   - Set environment variables:
     - `DATABASE_URL` - Your Neon connection string
     - `OPENROUTER_API_KEY` - (optional) for syncing OpenRouter models

### Self-Hosted

Run your own instance with full control over data:

```bash
# Clone the repository
git clone https://github.com/kaihochak/free-llm-router.git
cd free-llm-router

# Install dependencies
bun install

# Set up your database
# Option A: Use Neon / Supabase (free tier available)
# Option B: Run PostgreSQL locally or on your server
export DATABASE_URL="postgresql://user:password@localhost/free_llm_router"

# Push database schema
bun run db:push

# Start the server
bun run dev

# For production with Docker
docker build -t free-llm-router .
docker run -e DATABASE_URL="..." -p 3000:3000 free-llm-router
```

**Note:** Self-hosted instances can read from the public health API but don't contribute to shared health metrics.

## Documentation

- Full web documentation and interactive API explorer at https://free-llm-router.pages.dev
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

## Administration

### Data Retention

The API stores request logs and model feedback for analytics. To prevent unbounded growth:

- **model_feedback**: Retained for 90 days
- **api_request_logs**: Retained for 30 days

### Cleanup Endpoint

A protected admin endpoint is available to delete old data:

```bash
# Trigger cleanup manually
curl -X POST \
  -H "X-Admin-Secret: your-admin-secret" \
  "https://your-domain.com/api/admin/cleanup"
```

**Response:**

```json
{
  "success": true,
  "deleted": {
    "modelFeedback": 150,
    "apiRequestLogs": 2340
  },
  "cutoffs": {
    "modelFeedback": "2024-10-15T00:00:00.000Z",
    "apiRequestLogs": "2024-12-14T00:00:00.000Z"
  }
}
```

### Environment Variables for Admin

```bash
# Required for cleanup endpoint
ADMIN_SECRET=your-secure-random-string
```

### Automated Cleanup (Optional)

For automated cleanup, use an external cron service like [cron-job.org](https://cron-job.org) to call the cleanup endpoint daily or weekly.

## Contributing

We welcome contributions! Help improve the Free LLM Router:

1. **Report Health Data** - Use the API and submit feedback about model reliability
2. **Report Bugs** - Found an issue? [Open a GitHub issue](../../issues)
3. **Submit Features** - Have an idea? [Discuss it](../../discussions)
4. **Improve Code** - Submit a pull request with improvements
5. **Share Integrations** - Build SDKs, plugins, or examples for your favorite tools

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## Community

- **GitHub Issues:** [Report bugs and request features](../../issues)
- **GitHub Discussions:** [Ask questions and share feedback](../../discussions)
- **Website:** https://free-llm-router.pages.dev
- **Health Data:** Public metrics available at `/api/health`

## License

MIT - See [LICENSE](LICENSE) file for full details

This means you can freely:

- ✅ Use commercially
- ✅ Modify the code
- ✅ Distribute it
- ✅ Use it privately

Just include the license and copyright notice.

## Acknowledgments

Built with:

- [OpenRouter](https://openrouter.ai) - Free LLM model access
- [Cloudflare Pages](https://pages.cloudflare.com) - Hosting
- [Neon](https://neon.tech) - Serverless Postgres
- [Astro](https://astro.build) - Framework
- Community feedback and contributions

## Disclaimer

This service is provided as-is. We do not guarantee:

- Uptime or availability
- Accuracy of health metrics
- Model behavior matches community reports

Always test models in your own environment before production use. See [TERMS_OF_SERVICE.md](TERMS_OF_SERVICE.md) for full details.
