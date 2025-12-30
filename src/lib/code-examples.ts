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

  // Code Examples - One-off API Call
  oneOffCall: `import { getModelIds, reportIssue } from './free-models';

const prompt = 'Summarize this article in 3 bullet points: ...';

try {
  // Get top 3 models with both chat and vision capabilities
  const models = await getModelIds(['chat', 'vision'], 'capable', 3);

  // Try each model until one succeeds
  for (const id of models) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${process.env.OPENROUTER_API_KEY}\`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: id,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      console.log(data.choices[0].message.content);
      break; // Success - exit loop
    } catch (e) {
      reportIssue(id, 'error', e.message); // Help improve the list
    }
  }
} catch {
  // API unavailable - handle gracefully
  console.error('Failed to fetch models');
}`,

  // Code Examples - Chatbot
  chatbot: `import { getModelIds, reportIssue } from './free-models';
import OpenAI from 'openai';

// OpenAI SDK works with OpenRouter's API
const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Store conversation history for multi-turn chat
const messages: OpenAI.ChatCompletionMessageParam[] = [];

async function chat(userMessage: string) {
  messages.push({ role: 'user', content: userMessage });

  try {
    const models = await getModelIds(['chat'], 'capable', 5);

    for (const id of models) {
      try {
        const res = await client.chat.completions.create({
          model: id,
          messages, // Include full history
        });
        const reply = res.choices[0].message.content;
        messages.push({ role: 'assistant', content: reply });
        return reply;
      } catch (e) {
        reportIssue(id, 'error', e.message);
      }
    }
  } catch {
    // API unavailable
  }
  throw new Error('All models failed');
}`,

  // Code Examples - Tool Calling
  toolCalling: `import { getModelIds, reportIssue } from './free-models';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';

// Vercel AI SDK with OpenRouter
const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Define tools with Zod schemas
const tools = {
  getWeather: tool({
    description: 'Get current weather for a location',
    parameters: z.object({ location: z.string() }),
    execute: async ({ location }) => \`72°F and sunny in \${location}\`,
  }),
};

async function askWithTools(prompt: string) {
  try {
    // Filter for models that support tool calling
    const models = await getModelIds(['tools'], 'capable', 3);

    for (const id of models) {
      try {
        const { text, toolCalls } = await generateText({
          model: openrouter(id),
          prompt,
          tools,
        });
        return { text, toolCalls };
      } catch (e) {
        reportIssue(id, 'error', e.message);
      }
    }
  } catch {
    // API unavailable
  }
  throw new Error('All models failed');
}`,
};
