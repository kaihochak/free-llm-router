import type { APIRoute } from 'astro';
import { createDb, modelFeedback } from '@/db';
import {
  validateApiKeyOnly,
  unauthorizedResponse,
  serverErrorResponse,
  corsHeaders,
} from '@/lib/api-auth';

const VALID_ISSUES = ['rate_limited', 'unavailable', 'error'] as const;

/**
 * Submit feedback about a model issue (rate limiting, unavailability, errors)
 * Requires API key authentication but does NOT count towards rate limit.
 */
export const POST: APIRoute = async (context) => {
  // Validate API key without counting towards rate limit (user is contributing)
  const validation = await validateApiKeyOnly(context);

  if (!validation.valid) {
    // Config/server errors return 500
    if (validation.errorCode === 'CONFIG_ERROR' || validation.errorCode === 'SERVER_ERROR') {
      return serverErrorResponse(validation.error || 'Server error');
    }
    // All other errors (MISSING_AUTH, INVALID_FORMAT, EMPTY_KEY, INVALID_KEY, EXPIRED_KEY) return 401
    return unauthorizedResponse(validation.error || 'Unauthorized');
  }

  try {
    const runtime = (context.locals as { runtime?: { env?: { DATABASE_URL?: string } } }).runtime;
    const databaseUrl = runtime?.env?.DATABASE_URL || import.meta.env.DATABASE_URL;

    if (!databaseUrl) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const body = await context.request.json();
    const { modelId, issue, details, dryRun } = body;

    if (!modelId || typeof modelId !== 'string') {
      return new Response(JSON.stringify({ error: 'modelId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!issue || !VALID_ISSUES.includes(issue)) {
      return new Response(
        JSON.stringify({ error: `issue must be one of: ${VALID_ISSUES.join(', ')}` }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Skip database insert for dry run (e.g., from TryItPanel demo)
    if (!dryRun) {
      const db = createDb(databaseUrl);
      const id = crypto.randomUUID();

      await db.insert(modelFeedback).values({
        id,
        modelId,
        issue,
        details: details || null,
        source: validation.userId || 'api-key',
        createdAt: new Date(),
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('[API/feedback] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to submit feedback' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};
