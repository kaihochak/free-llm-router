import type { APIRoute } from 'astro';
import { createAuth, type AuthEnv } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, count } from 'drizzle-orm';
import { apiKeys } from '@/db/schema';

const MAX_KEYS_PER_USER = 10;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Cookie',
  'Access-Control-Allow-Credentials': 'true',
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const POST: APIRoute = async ({ request, locals }) => {
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
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const authEnv: AuthEnv = { databaseUrl, baseUrl, secret, githubClientId, githubClientSecret };
  const auth = createAuth(authEnv);

  // Get session from request
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Count existing keys for this user
  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  const [result] = await db
    .select({ count: count() })
    .from(apiKeys)
    .where(eq(apiKeys.userId, session.user.id));

  if (result.count >= MAX_KEYS_PER_USER) {
    return new Response(
      JSON.stringify({
        error: `Maximum ${MAX_KEYS_PER_USER} API keys allowed. Delete an existing key to create a new one.`,
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }

  // Create the key via Better Auth
  const body = await request.json();
  const response = await auth.api.createApiKey({
    body: { name: body.name, expiresIn: body.expiresIn },
    headers: request.headers,
  });

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
};
