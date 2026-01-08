import type { APIRoute } from 'astro';
import { createDb } from '@/db';
import {
  getFeedbackCountsByRange,
  getFeedbackTimeline,
  type TimeRange,
} from '@/services/openrouter';

const VALID_RANGES: TimeRange[] = ['15m', '1h', '6h', '24h', '7d', '30d'];

function validateRange(value: string | null): TimeRange {
  if (value && VALID_RANGES.includes(value as TimeRange)) {
    return value as TimeRange;
  }
  return '24h';
}

/**
 * Internal issues endpoint for the issues page.
 * No authentication required - this is for the public issues page.
 */
export const GET: APIRoute = async ({ locals, url }) => {
  try {
    const runtime = (locals as { runtime?: { env?: { DATABASE_URL?: string } } }).runtime;
    const databaseUrl = runtime?.env?.DATABASE_URL || import.meta.env.DATABASE_URL;

    if (!databaseUrl) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = createDb(databaseUrl);
    const range = validateRange(url.searchParams.get('range'));

    const [issues, timeline] = await Promise.all([
      getFeedbackCountsByRange(db, range),
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
