import type { APIRoute } from 'astro';
import { createAuth, type AuthEnv } from '@/lib/auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const ALL: APIRoute = async ({ request, locals }) => {
  const runtime = (locals as { runtime?: { env?: Record<string, string> } }).runtime;
  const env = runtime?.env || {};

  const databaseUrl = env.DATABASE_URL || import.meta.env.DATABASE_URL;
  const baseUrl = env.BETTER_AUTH_URL || import.meta.env.BETTER_AUTH_URL;
  const secret = env.BETTER_AUTH_SECRET || import.meta.env.BETTER_AUTH_SECRET;
  const githubClientId = env.GITHUB_CLIENT_ID || import.meta.env.GITHUB_CLIENT_ID;
  const githubClientSecret = env.GITHUB_CLIENT_SECRET || import.meta.env.GITHUB_CLIENT_SECRET;

  // Database URL is always required
  if (!databaseUrl) {
    return new Response(
      JSON.stringify({
        error: 'Server configuration error: DATABASE_URL missing',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
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
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
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
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
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
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }

  const authEnv: AuthEnv = {
    databaseUrl,
    baseUrl,
    secret,
    githubClientId,
    githubClientSecret,
  };

  const auth = createAuth(authEnv);
  return auth.handler(request);
};
