/**
 * Free Models API helper with built-in 15-minute caching
 * Set FREE_MODELS_API_KEY in your environment.
 *
 * Caching behavior:
 *   - In-memory cache with 15-minute TTL (matches server refresh rate)
 *   - Cache is per-instance (resets on serverless cold starts)
 *   - Use { cache: 'no-store' } to bypass cache (mirrors fetch semantics)
 *   - Falls back to stale cache on API errors (resilient to outages)
 *
 * Usage:
 *   const ids = await getModelIds(['tools']);
 *   const fresh = await getModelIds(['chat'], 'capable', 5, { cache: 'no-store' });
 */

const API = 'https://free-models-api.pages.dev/api/v1';
const API_KEY = process.env.FREE_MODELS_API_KEY;

type Filter = 'chat' | 'vision' | 'coding' | 'tools' | 'longContext' | 'reasoning';
type Sort = 'contextLength' | 'maxOutput' | 'name' | 'provider' | 'capable';
type CacheMode = 'default' | 'no-store';

// In-memory cache - 15 minute TTL (matches server refresh rate)
// NOTE: Cache is per-instance and resets on serverless cold starts
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds
const cache = new Map<string, { data: string[]; timestamp: number }>();

export async function getModelIds(
  filter?: Filter[],
  sort: Sort = 'capable',
  limit?: number,
  options?: { cache?: CacheMode }
): Promise<string[]> {
  // Sort filter array for deterministic cache keys (avoid fragmentation)
  const normalizedFilter = filter ? [...filter].sort() : undefined;

  // Generate cache key from normalized params
  const cacheKey = JSON.stringify({
    filter: normalizedFilter,
    sort,
    limit,
  });

  const cached = cache.get(cacheKey);
  const cacheMode = options?.cache ?? 'default';

  // Return cached data if fresh and cache is enabled
  if (cacheMode === 'default' && cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Fetch fresh data
  try {
    const params = new URLSearchParams({ sort });
    if (normalizedFilter) params.set('filter', normalizedFilter.join(','));
    if (limit) params.set('limit', String(limit));

    const { ids } = await fetch(`${API}/models/ids?${params}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    }).then((r) => r.json());

    // Store in cache
    cache.set(cacheKey, { data: ids, timestamp: Date.now() });

    return ids;
  } catch (error) {
    // Fall back to stale cache if available (resilient to API outages)
    if (cached) {
      // Only log in development to avoid serverless noise
      if (process.env.NODE_ENV !== 'production') {
        console.warn('API request failed, using stale cached data', error);
      }
      return cached.data;
    }
    throw error;
  }
}

// Report issues to help improve model reliability data.
// This does NOT count towards your rate limit - you're contributing!
export function reportIssue(
  modelId: string,
  issue: 'error' | 'rate_limited' | 'unavailable',
  details?: string
) {
  fetch(`${API}/models/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelId, issue, details }),
  }).catch(() => {}); // Fire-and-forget, don't block on errors
}

// Helper: detect issue type from HTTP status code
export function issueFromStatus(status: number): 'rate_limited' | 'unavailable' | 'error' {
  if (status === 429) return 'rate_limited';
  if (status === 503) return 'unavailable';
  return 'error';
}
