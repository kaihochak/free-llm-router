import type { APIRoute } from 'astro';
import {
  getFeedbackCountsByRange,
  getFeedbackTimeline,
  type TimeRange,
} from '@/services/openrouter';
import { initializeDb, getUserIdIfMyReports } from '@/lib/api-params';
import { corsHeaders } from '@/lib/api-auth';
import {
  VALID_TIME_RANGES_WITH_LABELS,
  validateTimeRange,
  DEFAULT_TIME_RANGE,
} from '@/lib/api-definitions';

function validateRange(value: string | null): TimeRange {
  const validated = validateTimeRange(value);
  // Only allow UI-relevant time ranges (not 'all')
  if (VALID_TIME_RANGES_WITH_LABELS.includes(validated as any)) {
    return validated as TimeRange;
  }
  return DEFAULT_TIME_RANGE as TimeRange;
}

/**
 * Health endpoint for the health page and dashboard.
 * No authentication required - returns public community reports by default.
 * Optional myReports parameter (requires API key) allows filtering to user's own reports.
 */
export const GET: APIRoute = async (context) => {
  try {
    const db = await initializeDb(context);
    if (db instanceof Response) return db;

    const range = validateRange(context.url.searchParams.get('range'));

    // Optional myReports filter (requires authentication)
    const myReports = context.url.searchParams.get('myReports') === 'true';
    let userId: string | undefined;

    try {
      userId = await getUserIdIfMyReports(context, myReports);
    } catch (error) {
      // If myReports=true but no valid API key, gracefully fall back to community data
      // This allows unauthenticated users to see community data without error
    }

    const [issues, timeline] = await Promise.all([
      getFeedbackCountsByRange(db, range, userId),
      getFeedbackTimeline(db, range, userId),
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
    console.error('[API/health] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch health data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
