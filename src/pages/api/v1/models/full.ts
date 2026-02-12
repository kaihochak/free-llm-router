import type { APIRoute } from 'astro';
import {
  getFilteredModels,
  checkModelsFreshness,
  ensureFreshModels,
  getLastUpdated,
  getRecentFeedbackCounts,
} from '@/services/openrouter';
import { corsHeaders, logApiRequest } from '@/lib/api-auth';
import { initializeRequest, getUserIdIfMyReports } from '@/lib/api-params';
import {
  apiResponseHeaders,
  jsonResponse,
  noContentResponse,
  type HeaderMap,
} from '@/lib/api-response';

/**
 * Full model endpoint - returns complete model objects with all metadata
 * Use /models/ids for a lightweight IDs-only response
 * Requires API key authentication
 */
export const GET: APIRoute = async (context) => {
  const startTime = performance.now();
  const req = await initializeRequest(context);

  // If error response, return it
  if (req instanceof Response) return req;

  try {
    const { db, databaseUrl, params, validation } = req;
    const { useCases, sort, topN, maxErrorRate, timeRange, myReports, excludeModelIds } = params;
    const runtime = (context.locals as { runtime?: { env?: Record<string, string> } }).runtime;
    const statsDbUrl = runtime?.env?.DATABASE_URL_STATS || import.meta.env.DATABASE_URL_STATS;

    // Get userId if myReports is enabled (optional authentication)
    let userId: string | undefined;

    try {
      userId = await getUserIdIfMyReports(context, myReports);
    } catch (error) {
      // If myReports=true but no valid API key, gracefully fall back to community data
      // This allows unauthenticated users to see community data without error
    }

    // Check data freshness (non-blocking)
    const freshness = await checkModelsFreshness(db);

    // If critically stale (>2h), attempt fallback sync with lock (prevents thundering herd)
    if (freshness.isCriticallyStale) {
      await ensureFreshModels(db);
    }

    // Fetch filtered and sorted models + feedback counts
    const [allModels, feedbackCounts, updatedAt] = await Promise.all([
      getFilteredModels(db, useCases, sort, maxErrorRate, timeRange, userId, statsDbUrl),
      getRecentFeedbackCounts(db, timeRange, userId, statsDbUrl),
      getLastUpdated(db),
    ]);

    // Apply exclusions first, then topN for deterministic behavior.
    const excludedSet = new Set(excludeModelIds);
    const withoutExcluded = allModels.filter((model) => !excludedSet.has(model.id));
    const models = topN ? withoutExcluded.slice(0, topN) : withoutExcluded;

    // Log request
    logApiRequest(databaseUrl, {
      userId: validation.userId!,
      apiKeyId: validation.keyId!,
      endpoint: '/api/v1/models/full',
      method: 'GET',
      statusCode: 200,
      responseTimeMs: Math.round(performance.now() - startTime),
      responseData: {
        count: models.length,
        params: { useCases, sort, topN, maxErrorRate, timeRange, myReports, excludeModelIds },
      },
    });

    // Build response headers
    const headers: HeaderMap = apiResponseHeaders({
      cacheControl: 'private, max-age=60',
      validation,
    });

    // Add staleness warning headers if data is stale
    if (!freshness.isFresh) {
      headers['X-Data-Stale'] = 'true';
      headers['X-Data-Age-Seconds'] = String(Math.round(freshness.ageMs / 1000));
    }

    return jsonResponse(
      {
        models,
        feedbackCounts,
        lastUpdated: updatedAt?.toISOString() ?? new Date().toISOString(),
        useCases: useCases.length > 0 ? useCases : undefined,
        sort,
        excludeModelIds,
        count: models.length,
        _meta: !freshness.isFresh
          ? { stale: true, ageSeconds: Math.round(freshness.ageMs / 1000) }
          : undefined,
      },
      { headers }
    );
  } catch (error) {
    console.error('[API/models/full] Error:', error);

    // Log error request
    logApiRequest(req.databaseUrl, {
      userId: req.validation.userId!,
      apiKeyId: req.validation.keyId!,
      endpoint: '/api/v1/models/full',
      method: 'GET',
      statusCode: 500,
      responseTimeMs: Math.round(performance.now() - startTime),
    });

    return jsonResponse(
      { error: 'Failed to fetch models' },
      { status: 500, headers: apiResponseHeaders() }
    );
  }
};

export const OPTIONS: APIRoute = async () => {
  return noContentResponse({ headers: corsHeaders });
};
