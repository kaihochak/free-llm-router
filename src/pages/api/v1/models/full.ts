import type { APIRoute } from 'astro';
import { createDb } from '@/db';
import {
  getFilteredModels,
  getLastUpdated,
  getRecentFeedbackCounts,
  syncModels,
  validateFilters,
  validateSort,
} from '@/services/openrouter';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Full model endpoint - returns complete model objects with all metadata
 * Use /models/ids for a lightweight IDs-only response
 */
export const GET: APIRoute = async ({ locals, url }) => {
  try {
    const runtime = (locals as { runtime?: { env?: { DATABASE_URL?: string } } }).runtime;
    const databaseUrl = runtime?.env?.DATABASE_URL || import.meta.env.DATABASE_URL;

    if (!databaseUrl) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const db = createDb(databaseUrl);

    // Parse and validate query parameters
    const filters = validateFilters(url.searchParams.get('filter'));
    const sort = validateSort(url.searchParams.get('sort'));
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 100) : undefined;

    // Lazy refresh if stale
    const lastUpdated = await getLastUpdated(db);
    if (!lastUpdated || Date.now() - lastUpdated.getTime() > STALE_THRESHOLD_MS) {
      await syncModels(db);
    }

    // Fetch filtered and sorted models + feedback counts
    const [allModels, feedbackCounts, updatedAt] = await Promise.all([
      getFilteredModels(db, filters, sort),
      getRecentFeedbackCounts(db),
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
          'Cache-Control': 'public, s-maxage=900',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('[API/models/full] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch models' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};
