import type { APIRoute } from 'astro';
import {
  getFeedbackCountsByRange,
  getFeedbackTimeline,
  type TimeRange,
} from '@/services/openrouter';
import { initializeDb, getUserIdIfUserOnly } from '@/lib/api-params';
import { corsHeaders } from '@/lib/api-auth';
import {
  VALID_TIME_WINDOWS_WITH_LABELS,
  validateTimeWindow,
  DEFAULT_TIME_WINDOW,
} from '@/lib/api-definitions';

function validateRange(value: string | null): TimeRange {
  const validated = validateTimeWindow(value);
  // Only allow UI-relevant time windows (not 'all')
  if (VALID_TIME_WINDOWS_WITH_LABELS.includes(validated as any)) {
    return validated as TimeRange;
  }
  return DEFAULT_TIME_WINDOW as TimeRange;
}

/**
 * Issues endpoint for the issues page and dashboard.
 * No authentication required - returns public community reports by default.
 * Optional userOnly parameter (requires API key) allows filtering to user's own reports.
 */
export const GET: APIRoute = async (context) => {
  try {
    const db = await initializeDb(context);
    if (db instanceof Response) return db;

    const range = validateRange(context.url.searchParams.get('range'));

    // Optional userOnly filter
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

    const [issues, timeline] = await Promise.all([
      getFeedbackCountsByRange(db, range, userId),
      getFeedbackTimeline(db, range),
    ]);

    return new Response(
      JSON.stringify({
        issues,
        timeline,
        range,
        lastUpdated: new Date().toISOString(),
        count: issues.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
        },
      }
    );
  } catch (error) {
    console.error('[API/issues] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch issues' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
