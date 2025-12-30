export const codeExamples = {
  // API Reference - GET Models (IDs only) Response
  getModelsResponse: `{
  "ids": [
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-chat:free"
  ],
  "count": 15
}`,

  // API Reference - GET Models Full Response
  getModelsFullResponse: `{
  "models": [
    {
      "id": "google/gemini-2.0-flash-exp:free",
      "name": "Gemini 2.0 Flash",
      "contextLength": 1000000,
      "maxCompletionTokens": 8192,
      "description": "...",
      "inputModalities": ["text", "image"],
      "outputModalities": ["text"],
      "supportedParameters": ["tools", "reasoning"]
    }
  ],
  "feedbackCounts": { ... },
  "lastUpdated": "2024-12-29T10:00:00Z",
  "filters": ["vision"],
  "sort": "contextLength",
  "count": 15
}`,

  // API Reference - Feedback Response
  feedbackResponse: `{ "received": true }`,

  // Code Examples - Basic Fetch
  basicFetch: `const response = await fetch('https://free-models-api.pages.dev/api/v1/models/ids');
const { ids, count } = await response.json();
console.log(\`Found \${count} free models\`);`,

  // Code Examples - With Filters
  withFilters: `// Get only vision-capable models, sorted by context length
const url = 'https://free-models-api.pages.dev/api/v1/models/ids?filter=vision&sort=contextLength';
const { ids } = await fetch(url).then(r => r.json());`,

  // Code Examples - Full Integration
  fullIntegration: `import { OpenRouter } from '@openrouter/sdk';

async function chat(message: string) {
  // 1. Get current free model IDs
  const { ids } = await fetch(
    'https://free-models-api.pages.dev/api/v1/models/ids?sort=capable'
  ).then(r => r.json());

  // 2. Create OpenRouter client
  const openRouter = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  // 3. Send message with automatic fallback
  const completion = await openRouter.chat.send({
    models: ids,
    messages: [{ role: 'user', content: message }],
  });

  return completion.choices[0].message.content;
}`,

  // Code Examples - Report Issue
  reportIssue: `await fetch('https://free-models-api.pages.dev/api/v1/models/feedback', {
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
