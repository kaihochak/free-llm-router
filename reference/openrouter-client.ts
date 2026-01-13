/**
 * REFERENCE FILE - From CourseRater
 *
 * OpenRouter Client for making LLM calls.
 * This is for reference on how to use OpenRouter API -
 * not directly needed for the free-LLM-router, but useful context.
 */

export interface OpenRouterCallParams {
  apiKey: string;
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface OpenRouterResponse {
  text: string;
  tokenUsage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  costUsd: number;
}

/**
 * Parse JSON response from OpenRouter (handles markdown code fences and trailing commas)
 */
export function parseOpenRouterJson(text: string): unknown {
  const trimmed = text.trim();

  // Remove markdown code fences if present
  let cleaned = trimmed.startsWith('```')
    ? trimmed
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim()
    : trimmed;

  // Remove trailing commas before } or ] (common LLM mistake)
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse OpenRouter response:', cleaned);
    throw new Error(
      `Invalid JSON response from OpenRouter (${cleaned.length} chars): ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Call OpenRouter API (single attempt, no retries)
 */
export async function callOpenRouter(params: OpenRouterCallParams): Promise<OpenRouterResponse> {
  const { apiKey, model, prompt, systemPrompt, temperature = 0.1, maxOutputTokens = 2000 } = params;

  const messages: { role: string; content: string }[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const requestBody = {
    model,
    messages,
    temperature,
    max_tokens: maxOutputTokens,
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://your-app.com', // Update this
      'X-Title': 'YourApp', // Update this
    },
    body: JSON.stringify(requestBody),
  });

  const rawBody = await response.text();

  if (response.status === 429) {
    console.log(`OpenRouter 429 response: ${rawBody.substring(0, 500)}`);
    throw new Error('OpenRouter API rate limit exceeded');
  }

  let data: Record<string, unknown> = {};
  if (rawBody) {
    try {
      data = JSON.parse(rawBody);
    } catch {
      throw new Error('OpenRouter API returned non-JSON response');
    }
  }

  if (!response.ok) {
    const error = data?.error as { message?: string } | undefined;
    const errorMessage = error?.message || rawBody || response.statusText || 'Unknown error';
    console.log(`OpenRouter error ${response.status}: ${String(errorMessage).substring(0, 500)}`);
    throw new Error(`OpenRouter API error: ${response.status} ${errorMessage}`);
  }

  // Extract response text (OpenAI format)
  const choices = data.choices as
    | Array<{ message?: { content?: string }; finish_reason?: string }>
    | undefined;
  const text = choices?.[0]?.message?.content?.trim() ?? '';

  if (!text) {
    throw new Error('No response from OpenRouter');
  }

  // Check if response was truncated due to token limit
  const finishReason = choices?.[0]?.finish_reason;
  if (finishReason === 'length') {
    throw new Error(`OpenRouter response truncated (finish_reason: ${finishReason})`);
  }

  // Extract token usage (OpenAI format)
  const usage = data.usage as
    | { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    | undefined;
  const promptTokens = usage?.prompt_tokens ?? 0;
  const completionTokens = usage?.completion_tokens ?? 0;
  const totalTokens = usage?.total_tokens ?? promptTokens + completionTokens;

  return {
    text,
    tokenUsage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
    },
    costUsd: 0, // Free tier model
  };
}
