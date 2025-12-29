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

    // Lazy refresh if stale
    const lastUpdated = await getLastUpdated(db);
    if (!lastUpdated || Date.now() - lastUpdated.getTime() > STALE_THRESHOLD_MS) {
      await syncModels(db);
    }

    // Fetch filtered and sorted models + feedback counts
    const [models, feedbackCounts, updatedAt] = await Promise.all([
      getFilteredModels(db, filters, sort),
      getRecentFeedbackCounts(db),
      getLastUpdated(db),
    ]);

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
    console.error('[API/models] Error:', error);
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
