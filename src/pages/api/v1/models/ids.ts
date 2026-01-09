import type { APIRoute } from 'astro';
import {
  getFilteredModels,
  ensureFreshModels,
} from '@/services/openrouter';
import { initializeRequest } from '@/lib/api-params';
import { rateLimitHeaders, corsHeaders } from '@/lib/api-auth';

/**
 * Lightweight endpoint that returns only model IDs
 * Returns only model IDs - no feedback counts, no full model objects
 * Requires API key authentication
 */
export const GET: APIRoute = async (context) => {
  const req = await initializeRequest(context);

  // If error response, return it
  if (req instanceof Response) return req;

  try {
    const { db, params, validation } = req;
    const { filters, sort, limit, excludeWithIssues, timeWindow } = params;

    // Lazy refresh if stale
    await ensureFreshModels(db);

    // Fetch filtered and sorted models
    const allModels = await getFilteredModels(db, filters, sort, excludeWithIssues, timeWindow);

    // Apply limit and extract IDs only
    const models = limit ? allModels.slice(0, limit) : allModels;
    const ids = models.map((m) => m.id);

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
