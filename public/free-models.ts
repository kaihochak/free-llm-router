/**
 * Free Models API - fetch free LLM model IDs from OpenRouter
 *
 * Usage:
 *   const ids = await getModelIds('tools');
 *   // Returns: ['google/gemini-2.0-flash', 'meta-llama/llama-3.3-70b', ...]
 */

const API = 'https://free-models-api.pages.dev/api/v1';

type Filter = 'chat' | 'vision' | 'coding' | 'tools' | 'longContext' | 'reasoning';
type Sort = 'contextLength' | 'maxOutput' | 'name' | 'provider' | 'capable';

/**
 * Fetch free model IDs from the API
 * @param filter - Optional capability filter (e.g., 'tools' for function calling)
 * @param sort - How to sort results (default: 'capable')
 * @param limit - Max number of models to return
 * @returns Array of model IDs like 'google/gemini-2.0-flash'
 */
export async function getModelIds(filter?: Filter, sort: Sort = 'capable', limit?: number): Promise<string[]> {
  const params = new URLSearchParams({ sort });
  if (filter) params.set('filter', filter);
  if (limit) params.set('limit', String(limit));
  const { ids } = await fetch(`${API}/models/ids?${params}`).then(r => r.json());
  return ids;
}

/**
 * Report an issue with a model (fire-and-forget)
 * This helps improve the free model list over time
 * @param modelId - The model that had an issue
 * @param issue - Type of issue encountered
 * @param details - Optional error message or details
 */
export function reportIssue(modelId: string, issue: 'error' | 'rate_limited' | 'unavailable', details?: string) {
  fetch(`${API}/models/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelId, issue, details }),
  }).catch(() => {}); // Fire-and-forget, don't block on errors
}
