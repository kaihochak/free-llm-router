import type { APIRoute } from 'astro';
import {
  getFeedbackCountsByRange,
  getFeedbackTimeline,
  type TimeRange,
} from '@/services/openrouter';
import { initializeDb, getUserIdIfMyReports } from '@/lib/api-params';
import {
  VALID_TIME_RANGES_WITH_LABELS,
  validateTimeRange,
  validateUseCases,
  validateSort,
  DEFAULT_TIME_RANGE,
} from '@/lib/api-definitions';
import { apiResponseHeaders, jsonResponse } from '@/lib/api-response';

function validateRange(value: string | null): TimeRange {
  const validated = validateTimeRange(value);
  // Only allow UI-relevant time ranges (not 'all')
  if (VALID_TIME_RANGES_WITH_LABELS.includes(validated as TimeRange)) {
    return validated as TimeRange;
  }
  return DEFAULT_TIME_RANGE as TimeRange;
}

/**
 * Health endpoint for the health page and dashboard.
 * No authentication required - returns public community reports by default.
 *
 * Query params:
 * - range: time range (15m, 30m, 1h, 6h, 24h, 7d, 30d)
 * - myReports: filter to user's own reports (requires auth)
 * - useCases: comma-separated use case filters (chat, vision, tools, longContext, reasoning)
 * - sort: sort order (contextLength, maxOutput, capable, leastIssues, newest)
 * - topN: limit to top N results
 * - maxErrorRate: filter to models with error rate <= this value (0-100)
 */
export const GET: APIRoute = async (context) => {
  try {
    const db = await initializeDb(context);
    if (db instanceof Response) return db;
    const runtime = (context.locals as { runtime?: { env?: Record<string, string> } }).runtime;
    const importMetaEnv = (import.meta as { env?: Record<string, string> }).env;
    const statsDbUrl = runtime?.env?.DATABASE_URL_STATS || importMetaEnv?.DATABASE_URL_STATS;

    const params = context.url.searchParams;
    const range = validateRange(params.get('range'));

    // Optional myReports filter (requires authentication)
    const myReports = params.get('myReports') === 'true';
    let userId: string | undefined;

    try {
      userId = await getUserIdIfMyReports(context, myReports);
    } catch {
      // If myReports=true but no valid API key, gracefully fall back to community data
    }

    // Parse filter params
    const useCasesParam = params.get('useCases');
    const useCases = useCasesParam ? validateUseCases(useCasesParam) : undefined;

    const sortParam = params.get('sort');
    const sort = sortParam ? validateSort(sortParam) : undefined;

    const topNParam = params.get('topN');
    const topN = topNParam ? parseInt(topNParam, 10) : undefined;

    const maxErrorRateParam = params.get('maxErrorRate');
    const maxErrorRate = maxErrorRateParam ? parseFloat(maxErrorRateParam) : undefined;

    // Get filtered issues first
    const issues = await getFeedbackCountsByRange(db, {
      range,
      userId,
      statsDbUrl,
      useCases: useCases && useCases.length > 0 ? useCases : undefined,
      sort,
      topN: topN && topN > 0 ? topN : undefined,
      maxErrorRate: maxErrorRate !== undefined && !isNaN(maxErrorRate) ? maxErrorRate : undefined,
    });

    // Extract model IDs from filtered issues to filter timeline
    const filteredModelIds = issues.map((i) => i.modelId);

    // Get timeline filtered to only include the filtered models
    let timeline = await getFeedbackTimeline(db, range, userId, statsDbUrl, filteredModelIds);

    const normalizeId = (id: string) => id.toLowerCase().replace(/:free$/, '');
    const issueIdMap = new Map(issues.map((i) => [normalizeId(i.modelId), i.modelId]));

    const timelineHasData = timeline.some((point) => Object.keys(point).length > 1);

    // Fallback 1: re-fetch without model filter, then remap to issue IDs
    if (!timelineHasData && issues.length > 0) {
      const allTimeline = await getFeedbackTimeline(db, range, userId, statsDbUrl, undefined);
      const filteredTimeline = allTimeline
        .map((point) => {
          const next: Record<string, unknown> = { date: point.date };
          Object.keys(point).forEach((key) => {
            if (key === 'date' || key.endsWith('_meta')) return;
            const canonicalId = issueIdMap.get(normalizeId(key));
            if (!canonicalId) return;
            next[canonicalId] = point[key];
            const metaKey = `${key}_meta`;
            if (point[metaKey]) {
              next[`${canonicalId}_meta`] = point[metaKey];
            }
          });
          return next;
        })
        .filter((p) => Object.keys(p).length > 1);

      if (filteredTimeline.length > 0) {
        timeline = filteredTimeline;
      }
    }

    // Fallback 2: synthesize a single point from aggregated issues
    const timelineStillEmpty = timeline.every((point) => Object.keys(point).length <= 1);
    if (timelineStillEmpty && issues.length > 0) {
      const nowBucket = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const fallbackPoint: Record<string, unknown> = { date: nowBucket };
      for (const issue of issues) {
        const totalCount = issue.successCount + issue.total;
        fallbackPoint[issue.modelId] = totalCount > 0 ? issue.errorRate : 0;
        fallbackPoint[`${issue.modelId}_meta`] = {
          errorRate: issue.errorRate,
          errorCount: issue.total,
          totalCount,
        };
      }
      timeline = [fallbackPoint];
    }

    return jsonResponse(
      {
        issues,
        timeline,
        range,
        lastUpdated: new Date().toISOString(),
        count: issues.length,
      },
      { headers: apiResponseHeaders({ cacheControl: 'public, max-age=60', cors: false }) }
    );
  } catch (error) {
    console.error('[API/health] Error:', error);
    return jsonResponse({ error: 'Failed to fetch health data' }, { status: 500, headers: apiResponseHeaders({ cors: false }) });
  }
};
