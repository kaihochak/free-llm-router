import type { APIRoute } from 'astro';
import { createAuth, type AuthEnv } from '@/lib/auth';
import { createDb, users } from '@/db';
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

    // Fetch user's rate limit data
    const db = createDb(databaseUrl);
    const [user] = await db
      .select({
        remaining: users.remaining,
        rateLimitMax: users.rateLimitMax,
        requestCount: users.requestCount,
        lastRequest: users.lastRequest,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        remaining: user.remaining ?? 200,
        limit: user.rateLimitMax ?? 200,
        requestCount: user.requestCount ?? 0,
        lastRequest: user.lastRequest,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Rate limit fetch error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
