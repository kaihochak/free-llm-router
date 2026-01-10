import type { APIRoute } from 'astro';
import { createAuth, type AuthEnv } from '@/lib/auth';
import { createDb, apiRequestLogs, modelFeedback, apiKeys } from '@/db';
import { eq, desc, sql } from 'drizzle-orm';

export const GET: APIRoute = async ({ request, locals, url }) => {
  try {
    const runtime = (locals as { runtime?: { env?: Record<string, string> } }).runtime;
    const env = runtime?.env || {};

    const databaseUrl = env.DATABASE_URL || import.meta.env.DATABASE_URL;
    const baseUrl = env.BETTER_AUTH_URL || import.meta.env.BETTER_AUTH_URL;
    const secret = env.BETTER_AUTH_SECRET || import.meta.env.BETTER_AUTH_SECRET;
    const githubClientId = env.GITHUB_CLIENT_ID || import.meta.env.GITHUB_CLIENT_ID;
    const githubClientSecret = env.GITHUB_CLIENT_SECRET || import.meta.env.GITHUB_CLIENT_SECRET;

    if (!databaseUrl || !baseUrl || !secret) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user session using Better Auth
    const authEnv: AuthEnv = { databaseUrl, baseUrl, secret, githubClientId, githubClientSecret };
    const auth = createAuth(authEnv);
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const type = url.searchParams.get('type') || 'requests';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const db = createDb(databaseUrl);

    if (type === 'requests') {
      // Fetch request logs with API key info
      const [items, countResult] = await Promise.all([
        db
          .select({
            id: apiRequestLogs.id,
            endpoint: apiRequestLogs.endpoint,
            method: apiRequestLogs.method,
            statusCode: apiRequestLogs.statusCode,
            responseTimeMs: apiRequestLogs.responseTimeMs,
            createdAt: apiRequestLogs.createdAt,
            apiKeyId: apiRequestLogs.apiKeyId,
            apiKeyName: apiKeys.name,
            apiKeyPrefix: apiKeys.prefix,
          })
          .from(apiRequestLogs)
          .leftJoin(apiKeys, eq(apiRequestLogs.apiKeyId, apiKeys.id))
          .where(eq(apiRequestLogs.userId, session.user.id))
          .orderBy(desc(apiRequestLogs.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(apiRequestLogs)
          .where(eq(apiRequestLogs.userId, session.user.id)),
      ]);

      const total = countResult[0]?.count ?? 0;

      return new Response(
        JSON.stringify({
          items,
          pagination: {
            page,
            limit,
            total,
            hasMore: offset + items.length < total,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else if (type === 'feedback') {
      // Fetch feedback submitted by this user
      const [items, countResult] = await Promise.all([
        db
          .select()
          .from(modelFeedback)
          .where(eq(modelFeedback.source, session.user.id))
          .orderBy(desc(modelFeedback.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(modelFeedback)
          .where(eq(modelFeedback.source, session.user.id)),
      ]);

      const total = countResult[0]?.count ?? 0;

      return new Response(
        JSON.stringify({
          items,
          pagination: {
            page,
            limit,
            total,
            hasMore: offset + items.length < total,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ error: 'Invalid type parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('History fetch error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
