/**
 * Free LLM Router helper with built-in 15-minute caching
 * Set FREE_LLM_ROUTER_API_KEY in your environment.
 *
 * Caching behavior:
 *   - In-memory cache with 15-minute TTL (matches server refresh rate)
 *   - Cache is per-instance (resets on serverless cold starts)
 *   - Use { cache: 'no-store' } to bypass cache (mirrors fetch semantics)
 *   - Falls back to stale cache on API errors (resilient to outages)
 *
 * Usage:
 *   const ids = await getModelIds(['tools']);
 *   const fresh = await getModelIds(['chat'], 'contextLength', 5, { maxErrorRate: 20, timeRange: '24h', myReports: true, cache: 'no-store' });
 */

const API = 'https://freellmrouter.com/api/v1';
const API_KEY = process.env.FREE_LLM_ROUTER_API_KEY;

/**
 * Type definitions for SDK parameters.
 * IMPORTANT: Keep these in sync with src/lib/api-definitions.ts
 * - UseCase: see VALID_USE_CASES
 * - Sort: see VALID_SORTS
 * - TimeRange: see VALID_TIME_RANGES
 */
type UseCase = 'chat' | 'vision' | 'tools' | 'longContext' | 'reasoning';
type Sort = 'contextLength' | 'maxOutput' | 'capable' | 'leastIssues' | 'newest';
type CacheMode = 'default' | 'no-store';
type TimeRange = '15m' | '30m' | '1h' | '6h' | '24h' | '7d' | '30d' | 'all';

// In-memory cache - 15 minute TTL (matches server refresh rate)
// NOTE: Cache is per-instance and resets on serverless cold starts
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds
const cache = new Map<string, { data: string[]; timestamp: number }>();

/**
 * Get available free model IDs with optional filtering and sorting.
 * Default sort is 'contextLength' (largest context window first).
 * Default maxErrorRate is undefined (no filtering), timeRange is '24h', myReports is false.
 */
export async function getModelIds(
  useCase?: UseCase[],
  sort: Sort = 'contextLength',
  topN?: number,
  options?: {
    cache?: CacheMode;
    maxErrorRate?: number;
    timeRange?: TimeRange;
    myReports?: boolean;
  }
): Promise<string[]> {
  // Sort useCase array for deterministic cache keys (avoid fragmentation)
  const normalizedUseCase = useCase ? [...useCase].sort() : undefined;

  // Generate cache key from normalized params
  const cacheKey = JSON.stringify({
    useCase: normalizedUseCase,
    sort,
    topN,
    maxErrorRate: options?.maxErrorRate,
    timeRange: options?.timeRange,
    myReports: options?.myReports,
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
    if (normalizedUseCase) params.set('useCase', normalizedUseCase.join(','));
    if (topN) params.set('topN', String(topN));
    if (options?.maxErrorRate !== undefined) {
      params.set('maxErrorRate', String(options.maxErrorRate));
    }
    if (options?.timeRange) {
      params.set('timeRange', options.timeRange);
    }
    if (options?.myReports) {
      params.set('myReports', 'true');
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

// Report issues to help improve model health data.
// This does NOT count towards your rate limit - you're contributing!
export function reportIssue(
  modelId: string,
  issue: 'error' | 'rate_limited' | 'unavailable',
  details?: string
) {
  fetch(`${API}/models/feedback`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ modelId, issue, details }),
  }).catch(() => {}); // Fire-and-forget, don't block on errors
}

// Report successful model usage to improve health metrics.
// This does NOT count towards your rate limit - you're contributing!
export function reportSuccess(modelId: string, details?: string) {
  fetch(`${API}/models/feedback`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
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
