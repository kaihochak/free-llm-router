import type { APIRoute } from 'astro';
import { getFilteredModels, ensureFreshModels } from '@/services/openrouter';
import { initializeRequest, getUserIdIfMyReports } from '@/lib/api-params';
import { rateLimitHeaders, corsHeaders, logApiRequest } from '@/lib/api-auth';

/**
 * Lightweight endpoint that returns only model IDs
 * Returns only model IDs - no feedback counts, no full model objects
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

    // Lazy refresh if stale
    await ensureFreshModels(db);

    // Fetch filtered and sorted models
    const allModels = await getFilteredModels(
      db,
      useCases,
      sort,
      maxErrorRate,
      timeRange,
      userId,
      statsDbUrl
    );

    // Apply topN and extract IDs only
    const models = topN ? allModels.slice(0, topN) : allModels;
    const ids = models.map((m) => m.id);

    // Log request
    logApiRequest(databaseUrl, {
      userId: validation.userId!,
      apiKeyId: validation.keyId!,
      endpoint: '/api/v1/models/ids',
      method: 'GET',
      statusCode: 200,
      responseTimeMs: Math.round(performance.now() - startTime),
    });

    return new Response(
      JSON.stringify({
        ids,
        count: ids.length,
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
    console.error('[API/models/ids] Error:', error);

    // Log error request
    logApiRequest(req.databaseUrl, {
      userId: req.validation.userId!,
      apiKeyId: req.validation.keyId!,
      endpoint: '/api/v1/models/ids',
      method: 'GET',
      statusCode: 500,
      responseTimeMs: Math.round(performance.now() - startTime),
    });

    return new Response(JSON.stringify({ error: 'Failed to fetch model IDs' }), {
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
