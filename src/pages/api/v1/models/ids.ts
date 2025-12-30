import type { APIRoute } from 'astro';
import { createDb } from '@/db';
import {
  getFilteredModels,
  getLastUpdated,
  syncModels,
  validateFilters,
  validateSort,
} from '@/services/openrouter';
import {
  validateApiKey,
  rateLimitHeaders,
  unauthorizedResponse,
  rateLimitedResponse,
  serverErrorResponse,
  corsHeaders,
} from '@/lib/api-auth';

const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Lightweight endpoint that returns only model IDs
 * Returns only model IDs - no feedback counts, no full model objects
 * Requires API key authentication
 */
export const GET: APIRoute = async (context) => {
  // Validate API key from Authorization header
  const validation = await validateApiKey(context);

  if (!validation.valid) {
    // Config/server errors return 500
    if (validation.errorCode === 'CONFIG_ERROR' || validation.errorCode === 'SERVER_ERROR') {
      return serverErrorResponse(validation.error || 'Server error');
    }
    // Rate limit returns 429
    if (validation.errorCode === 'RATE_LIMITED') {
      return rateLimitedResponse(validation);
    }
    // All other errors (MISSING_AUTH, INVALID_FORMAT, EMPTY_KEY, INVALID_KEY) return 401
    return unauthorizedResponse(validation.error || 'Unauthorized');
  }

  try {
    const runtime = (context.locals as { runtime?: { env?: { DATABASE_URL?: string } } }).runtime;
    const databaseUrl = runtime?.env?.DATABASE_URL || import.meta.env.DATABASE_URL;

    if (!databaseUrl) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const db = createDb(databaseUrl);

    // Parse and validate query parameters
    const filters = validateFilters(context.url.searchParams.get('filter'));
    const sort = validateSort(context.url.searchParams.get('sort'));
    const limitParam = context.url.searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 100) : undefined;

    // Lazy refresh if stale
    const lastUpdated = await getLastUpdated(db);
    if (!lastUpdated || Date.now() - lastUpdated.getTime() > STALE_THRESHOLD_MS) {
      await syncModels(db);
    }

    // Fetch filtered and sorted models
    const allModels = await getFilteredModels(db, filters, sort);

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
