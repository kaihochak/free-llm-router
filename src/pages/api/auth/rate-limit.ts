import type { APIRoute } from 'astro';
import { createAuth, type AuthEnv } from '@/lib/auth';
import { users, withUserContext } from '@/db';
import { eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ request, locals }) => {
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
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        remaining: record.remaining ?? 0,
        limit: record.limit ?? 200,
        requestCount: record.requestCount ?? 0,
        timeWindow: record.timeWindow ?? 86400000,
        lastRequest: record.lastRequest,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Rate limit fetch error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
