export const codeExamples = {
  // API Reference - Models Response
  modelsResponse: `{
  "models": [
    {
      "id": "google/gemini-2.0-flash-exp:free",
      "name": "Gemini 2.0 Flash",
      "contextLength": 1000000,
      "maxCompletionTokens": 8192,
      "description": "...",
      "modality": "text->text",
      "inputModalities": ["text", "image"],
      "outputModalities": ["text"],
      "supportedParameters": ["tools", "reasoning"],
      "isModerated": false
    }
  ],
  "feedbackCounts": {
    "model-id": { "rateLimited": 0, "unavailable": 0, "error": 0 }
  },
  "lastUpdated": "2024-12-29T10:00:00Z",
  "filters": ["vision"],
  "sort": "contextLength",
  "count": 15
}`,

  // API Reference - Feedback Request
  feedbackRequest: `{
  "modelId": "google/gemini-2.0-flash-exp:free",
  "issue": "rate_limited",
  "details": "Getting 429 after ~10 requests",
  "source": "my-app"
}`,

  // API Reference - Feedback Response
  feedbackResponse: `{ "received": true }`,

  // Code Examples - Basic Fetch
  basicFetch: `const response = await fetch('https://free-models-api.pages.dev/api/v1/models/openrouter');
const { models, count } = await response.json();
console.log(\`Found \${count} free models\`);`,

  // Code Examples - With Filters
  withFilters: `// Get only vision-capable models, sorted by context length
const url = 'https://free-models-api.pages.dev/api/v1/models/openrouter?filter=vision&sort=contextLength';
const { models } = await fetch(url).then(r => r.json());`,

  // Code Examples - Full Integration
  fullIntegration: `import { OpenRouter } from '@openrouter/sdk';

async function chat(message: string) {
  // 1. Get current free models
  const { models } = await fetch(
    'https://free-models-api.pages.dev/api/v1/models/openrouter?sort=capable'
  ).then(r => r.json());

  // 2. Create OpenRouter client
  const openRouter = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  // 3. Send message with automatic fallback
  const completion = await openRouter.chat.send({
    models: models.map(m => m.id),
    messages: [{ role: 'user', content: message }],
  });

  return completion.choices[0].message.content;
}`,

  // Code Examples - Report Issue
  reportIssue: `await fetch('https://free-models-api.pages.dev/api/feedback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    modelId: 'google/gemini-2.0-flash-exp:free',
    issue: 'rate_limited',
    details: 'Getting 429 after ~10 requests',
    source: 'my-app',
  }),
});`,
};
