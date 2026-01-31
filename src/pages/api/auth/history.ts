import type { APIRoute } from 'astro';
import { createAuth, type AuthEnv } from '@/lib/auth';
import { apiRequestLogs, modelFeedback, apiKeys, withUserContext } from '@/db';
import { eq, desc, sql } from 'drizzle-orm';

export const GET: APIRoute = async ({ request, locals, url }) => {
  try {
    const runtime = (locals as { runtime?: { env?: Record<string, string> } }).runtime;
    const env = runtime?.env || {};

    const databaseUrl = env.DATABASE_URL || import.meta.env.DATABASE_URL;
    const databaseUrlAdmin = env.DATABASE_URL_ADMIN || import.meta.env.DATABASE_URL_ADMIN;
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
    const authEnv: AuthEnv = {
      databaseUrl,
      databaseUrlAdmin,
      baseUrl,
      secret,
      githubClientId,
      githubClientSecret,
    };
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

    if (type === 'requests') {
      // Fetch request logs with API key info (RLS-protected)
      const [items, countResult] = await withUserContext(
        databaseUrl,
        session.user.id,
        async (db) => {
          return Promise.all([
            db
              .select({
                id: apiRequestLogs.id,
                endpoint: apiRequestLogs.endpoint,
                method: apiRequestLogs.method,
                statusCode: apiRequestLogs.statusCode,
                responseTimeMs: apiRequestLogs.responseTimeMs,
                responseData: apiRequestLogs.responseData,
                createdAt: apiRequestLogs.createdAt,
                apiKeyId: apiRequestLogs.apiKeyId,
                apiKeyName: apiKeys.name,
                apiKeyPrefix: apiKeys.prefix,
              })
              .from(apiRequestLogs)
              .leftJoin(apiKeys, eq(apiRequestLogs.apiKeyId, apiKeys.id))
              .where(eq(apiRequestLogs.userId, session.user.id)) // Keep WHERE as defense-in-depth
              .orderBy(desc(apiRequestLogs.createdAt))
              .limit(limit)
              .offset(offset),
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(apiRequestLogs)
              .where(eq(apiRequestLogs.userId, session.user.id)), // Keep WHERE as defense-in-depth
          ]);
        }
      );

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
      // Fetch feedback submitted by this user (RLS-protected)
      const [items, countResult] = await withUserContext(
        databaseUrl,
        session.user.id,
        async (db) => {
          return Promise.all([
            db
              .select()
              .from(modelFeedback)
              .where(eq(modelFeedback.source, session.user.id)) // Keep WHERE as defense-in-depth
              .orderBy(desc(modelFeedback.createdAt))
              .limit(limit)
              .offset(offset),
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(modelFeedback)
              .where(eq(modelFeedback.source, session.user.id)), // Keep WHERE as defense-in-depth
          ]);
        }
      );

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

    if (type === 'unified') {
      // Fetch both requests and feedback, merge by createdAt
      const [requests, feedback, requestCount, feedbackCount] = await withUserContext(
        databaseUrl,
        session.user.id,
        async (db) => {
          return Promise.all([
            db
              .select({
                id: apiRequestLogs.id,
                endpoint: apiRequestLogs.endpoint,
                method: apiRequestLogs.method,
                statusCode: apiRequestLogs.statusCode,
                responseTimeMs: apiRequestLogs.responseTimeMs,
                responseData: apiRequestLogs.responseData,
                createdAt: apiRequestLogs.createdAt,
                apiKeyId: apiRequestLogs.apiKeyId,
                apiKeyName: apiKeys.name,
                apiKeyPrefix: apiKeys.prefix,
              })
              .from(apiRequestLogs)
              .leftJoin(apiKeys, eq(apiRequestLogs.apiKeyId, apiKeys.id))
              .where(eq(apiRequestLogs.userId, session.user.id))
              .orderBy(desc(apiRequestLogs.createdAt))
              .limit(limit * 2), // Fetch more for merge
            db
              .select()
              .from(modelFeedback)
              .where(eq(modelFeedback.source, session.user.id))
              .orderBy(desc(modelFeedback.createdAt))
              .limit(limit * 2),
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(apiRequestLogs)
              .where(eq(apiRequestLogs.userId, session.user.id)),
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(modelFeedback)
              .where(eq(modelFeedback.source, session.user.id)),
          ]);
        }
      );

      // Group feedback by requestId for linking
      const feedbackByRequestId = new Map<string, typeof feedback>();
      const linkedFeedbackIds = new Set<string>();
      for (const f of feedback) {
        if (f.requestId) {
          const arr = feedbackByRequestId.get(f.requestId) || [];
          arr.push(f);
          feedbackByRequestId.set(f.requestId, arr);
          linkedFeedbackIds.add(f.id);
        }
      }

      // Filter out linked feedback from top-level list (they'll appear nested under requests)
      const unlinkedFeedback = feedback.filter((f) => !linkedFeedbackIds.has(f.id));

      // Transform feedback item to nested shape
      type LinkedFeedbackItem = {
        id: string;
        modelId: string;
        isSuccess: boolean;
        issue: string | null;
        details: string | null;
        createdAt: Date | null;
      };

      // Transform to unified shape
      type UnifiedItem = {
        id: string;
        type: 'request' | 'feedback';
        createdAt: Date | null;
        endpoint: string | null;
        method: string | null;
        statusCode: number | null;
        responseTimeMs: number | null;
        responseData: string | null;
        apiKeyId: string | null;
        apiKeyName: string | null;
        apiKeyPrefix: string | null;
        modelId: string | null;
        isSuccess: boolean | null;
        issue: string | null;
        details: string | null;
        linkedFeedback?: LinkedFeedbackItem[];
        timeToFirstFeedbackMs?: number | null;
      };

      const unifiedRequests: UnifiedItem[] = requests.map((r) => {
        const linked = feedbackByRequestId.get(r.id) || [];
        // Sort linked feedback by createdAt ascending to find first
        const sortedLinked = [...linked].sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeA - timeB;
        });

        // Calculate time to first feedback
        let timeToFirstFeedbackMs: number | null = null;
        if (sortedLinked.length > 0 && r.createdAt && sortedLinked[0].createdAt) {
          timeToFirstFeedbackMs =
            new Date(sortedLinked[0].createdAt).getTime() - new Date(r.createdAt).getTime();
        }

        return {
          id: r.id,
          type: 'request' as const,
          createdAt: r.createdAt,
          endpoint: r.endpoint,
          method: r.method,
          statusCode: r.statusCode,
          responseTimeMs: r.responseTimeMs,
          responseData: r.responseData,
          apiKeyId: r.apiKeyId,
          apiKeyName: r.apiKeyName,
          apiKeyPrefix: r.apiKeyPrefix,
          modelId: null,
          isSuccess: null,
          issue: null,
          details: null,
          linkedFeedback: sortedLinked.map((f) => ({
            id: f.id,
            modelId: f.modelId,
            isSuccess: f.isSuccess,
            issue: f.issue,
            details: f.details,
            createdAt: f.createdAt,
          })),
          timeToFirstFeedbackMs,
        };
      });

      const unifiedFeedback: UnifiedItem[] = unlinkedFeedback.map((f) => ({
        id: f.id,
        type: 'feedback' as const,
        createdAt: f.createdAt,
        endpoint: null,
        method: null,
        statusCode: null,
        responseTimeMs: null,
        responseData: null,
        apiKeyId: null,
        apiKeyName: null,
        apiKeyPrefix: null,
        modelId: f.modelId,
        isSuccess: f.isSuccess,
        issue: f.issue,
        details: f.details,
      }));

      // Merge and sort by createdAt descending
      const merged = [...unifiedRequests, ...unifiedFeedback].sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      // Apply pagination
      const paginatedItems = merged.slice(offset, offset + limit);
      // Note: total count includes linked feedback that won't appear at top level
      // This is acceptable for now - exact pagination isn't critical
      const total = (requestCount[0]?.count ?? 0) + (feedbackCount[0]?.count ?? 0);

      return new Response(
        JSON.stringify({
          items: paginatedItems,
          pagination: {
            page,
            limit,
            total,
            hasMore: offset + paginatedItems.length < total,
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
