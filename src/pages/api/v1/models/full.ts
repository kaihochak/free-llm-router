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
} from '@/lib/api-auth';
import { initializeRequest, getUserIdIfUserOnly } from '@/lib/api-params';

/**
 * Full model endpoint - returns complete model objects with all metadata
 * Use /models/ids for a lightweight IDs-only response
 * Requires API key authentication
 */
export const GET: APIRoute = async (context) => {
  const req = await initializeRequest(context);

  // If error response, return it
  if (req instanceof Response) return req;

  try {
    const { db, params, validation } = req;
    const { filters, sort, limit, excludeWithIssues, timeWindow } = params;

    // Parse userOnly parameter (default: false, shows all community reports)
    const userOnly = context.url.searchParams.get('userOnly') === 'true';
    let userId: string | undefined;

    try {
      userId = await getUserIdIfUserOnly(context, userOnly);
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
      getFilteredModels(db, filters, sort, excludeWithIssues, timeWindow),
      getRecentFeedbackCounts(db, timeWindow, userId),
      getLastUpdated(db),
    ]);

    // Apply limit if specified
    const models = limit ? allModels.slice(0, limit) : allModels;

    return new Response(
      JSON.stringify({
        models,
        feedbackCounts,
        lastUpdated: updatedAt?.toISOString() ?? new Date().toISOString(),
        filters: filters.length > 0 ? filters : undefined,
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
