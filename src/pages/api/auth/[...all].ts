import type { APIRoute } from 'astro';
import { createAuth, type AuthEnv } from '@/lib/auth';
import { access } from '@/lib/runtime-access';

export const ALL: APIRoute = async ({ request, locals }) => {
  const rt = access(locals);
  const databaseUrl = rt.dbUrl('app');
  const databaseUrlAdmin = rt.dbUrl('admin');
  const baseUrl = rt.env('BETTER_AUTH_URL');
  const secret = rt.env('BETTER_AUTH_SECRET');
  const githubClientId = rt.env('GITHUB_CLIENT_ID');
  const githubClientSecret = rt.env('GITHUB_CLIENT_SECRET');

  // Database URL is always required
  if (!databaseUrl) {
    return new Response(
      JSON.stringify({
        error: 'Server configuration error: DATABASE_URL missing',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (!baseUrl) {
    return new Response(
      JSON.stringify({
        error: 'Server configuration error: BETTER_AUTH_URL missing',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (!secret) {
    return new Response(
      JSON.stringify({
        error: 'Server configuration error: BETTER_AUTH_SECRET missing',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // OAuth routes require GitHub credentials
  if (!githubClientId || !githubClientSecret) {
    return new Response(
      JSON.stringify({
        error: 'OAuth not configured. Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const authEnv: AuthEnv = {
    databaseUrl,
    databaseUrlAdmin,
    baseUrl,
    secret,
    githubClientId,
    githubClientSecret,
  };

  try {
    const auth = createAuth(authEnv);
    const response = await auth.handler(request);
    return response;
  } catch (error) {
    console.error('[Auth] Error:', error);
    return new Response(JSON.stringify({ error: 'Auth error', message: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
