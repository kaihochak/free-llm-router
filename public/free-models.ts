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
 *   const fresh = await getModelIds(['chat'], 'contextLength', 5, { cache: 'no-store' });
 */

const API = 'https://free-models-api.pages.dev/api/v1';
const API_KEY = process.env.FREE_MODELS_API_KEY;

/**
 * Type definitions for SDK parameters.
 * IMPORTANT: Keep these in sync with src/lib/api-definitions.ts
 * - Filter: see VALID_FILTERS
 * - Sort: see VALID_SORTS
 * - TimeWindow: see VALID_TIME_WINDOWS
 */
type Filter = 'chat' | 'vision' | 'tools' | 'longContext' | 'reasoning';
type Sort = 'contextLength' | 'maxOutput' | 'capable' | 'leastIssues' | 'newest';
type CacheMode = 'default' | 'no-store';
type TimeWindow = '15m' | '30m' | '1h' | '6h' | '24h' | '7d' | '30d' | 'all';

// In-memory cache - 15 minute TTL (matches server refresh rate)
// NOTE: Cache is per-instance and resets on serverless cold starts
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds
const cache = new Map<string, { data: string[]; timestamp: number }>();

/**
 * Get available free model IDs with optional filtering and sorting.
 * Default sort is 'contextLength' (largest context window first).
 * Default excludeWithIssues is 5, timeWindow is '24h'.
 */
export async function getModelIds(
  filter?: Filter[],
  sort: Sort = 'contextLength',
  limit?: number,
  options?: {
    cache?: CacheMode;
    excludeWithIssues?: number;
    timeWindow?: TimeWindow;
  }
): Promise<string[]> {
  // Sort filter array for deterministic cache keys (avoid fragmentation)
  const normalizedFilter = filter ? [...filter].sort() : undefined;

  // Generate cache key from normalized params
  const cacheKey = JSON.stringify({
    filter: normalizedFilter,
    sort,
    limit,
    excludeWithIssues: options?.excludeWithIssues,
    timeWindow: options?.timeWindow,
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
    if (options?.excludeWithIssues !== undefined) {
      params.set('excludeWithIssues', String(options.excludeWithIssues));
    }
    if (options?.timeWindow) {
      params.set('timeWindow', options.timeWindow);
    }

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
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ modelId, issue, details }),
  }).catch(() => {}); // Fire-and-forget, don't block on errors
}

// Report successful model usage to improve reliability metrics.
// This does NOT count towards your rate limit - you're contributing!
export function reportSuccess(modelId: string, details?: string) {
  fetch(`${API}/models/feedback`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ modelId, success: true, details }),
  }).catch(() => {}); // Fire-and-forget, don't block on errors
}

// Helper: detect issue type from HTTP status code
export function issueFromStatus(status: number): 'rate_limited' | 'unavailable' | 'error' {
  if (status === 429) return 'rate_limited';
  if (status === 503) return 'unavailable';
  return 'error';
}
