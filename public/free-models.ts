/**
 * Free Models API helper
 * Set FREE_MODELS_API_KEY in your environment.
 *
 * Usage:
 *   const ids = await getModelIds(['tools']);
 */

const API = 'https://free-models-api.pages.dev/api/v1';
const API_KEY = process.env.FREE_MODELS_API_KEY;

type Filter = 'chat' | 'vision' | 'coding' | 'tools' | 'longContext' | 'reasoning';
type Sort = 'contextLength' | 'maxOutput' | 'name' | 'provider' | 'capable';

export async function getModelIds(filter?: Filter[], sort: Sort = 'capable', limit?: number): Promise<string[]> {
  const params = new URLSearchParams({ sort });
  if (filter) params.set('filter', filter.join(','));
  if (limit) params.set('limit', String(limit));
  const { ids } = await fetch(`${API}/models/ids?${params}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  }).then(r => r.json());
  return ids;
}

export function reportIssue(modelId: string, issue: 'error' | 'rate_limited' | 'unavailable', details?: string) {
  fetch(`${API}/models/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelId, issue, details }),
  }).catch(() => {}); // Fire-and-forget, don't block on errors
}
