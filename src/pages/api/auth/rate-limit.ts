import type { APIRoute } from 'astro';
import { users, withUserContext } from '@/db';
import { eq } from 'drizzle-orm';
import { getAuthSession, isSessionError } from '@/lib/auth-session';
import { jsonResponse } from '@/lib/api-response';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const result = await getAuthSession(request, locals);
    if (isSessionError(result)) {
      return jsonResponse({ error: result.error }, { status: result.status });
    }

    const { session, databaseUrl } = result;

    const [record] = await withUserContext(databaseUrl, session.user.id, async (db) => {
      return db
        .select({
          remaining: users.remaining,
          limit: users.rateLimitMax,
          requestCount: users.requestCount,
          timeWindow: users.rateLimitTimeWindow,
          lastRequest: users.lastRequest,
        })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);
    });

    if (!record) {
      return jsonResponse({ error: 'User not found' }, { status: 404 });
    }

    return jsonResponse({
      remaining: record.remaining ?? 0,
      limit: record.limit ?? 200,
      requestCount: record.requestCount ?? 0,
      timeWindow: record.timeWindow ?? 86400000,
      lastRequest: record.lastRequest,
    });
  } catch (error) {
    console.error('Rate limit fetch error:', error);
    return jsonResponse({ error: 'Internal server error' }, { status: 500 });
  }
};
