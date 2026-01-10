import type { APIRoute } from 'astro';
import {
  getFilteredModels,
  ensureFreshModels,
  getLastUpdated,
  getRecentFeedbackCounts,
} from '@/services/openrouter';
import {
  rateLimitHeaders,
  corsHeaders,
  logApiRequest,
} from '@/lib/api-auth';
import { initializeRequest, getUserIdIfMyReports } from '@/lib/api-params';

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
    const { useCases, sort, topN, maxErrorRate, timeRange, myReports } = params;

    // Get userId if myReports is enabled
    let userId: string | undefined;

    try {
      userId = await getUserIdIfMyReports(context, myReports);
    } catch (error) {
      return new Response(JSON.stringify({ error: (error as Error).message || 'Invalid API key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Lazy refresh if stale
    await ensureFreshModels(db);

    // Fetch filtered and sorted models + feedback counts
    const [allModels, feedbackCounts, updatedAt] = await Promise.all([
      getFilteredModels(db, useCases, sort, maxErrorRate, timeRange),
      getRecentFeedbackCounts(db, timeRange, userId),
      getLastUpdated(db),
    ]);

    // Apply topN if specified
    const models = topN ? allModels.slice(0, topN) : allModels;

    // Log request
    logApiRequest(databaseUrl, {
      userId: validation.userId!,
      apiKeyId: validation.keyId!,
      endpoint: '/api/v1/models/full',
      method: 'GET',
      statusCode: 200,
      responseTimeMs: Math.round(performance.now() - startTime),
    });

    return new Response(
      JSON.stringify({
        models,
        feedbackCounts,
        lastUpdated: updatedAt?.toISOString() ?? new Date().toISOString(),
        useCases: useCases.length > 0 ? useCases : undefined,
        sort,
        count: models.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=60',
          ...corsHeaders,
          ...rateLimitHeaders(validation),
        },
      }
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

    return new Response(JSON.stringify({ error: 'Failed to fetch models' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};
