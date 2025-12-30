import type { APIRoute } from 'astro';
import { createDb, modelFeedback } from '@/db';
import {
  validateApiKey,
  rateLimitHeaders,
  unauthorizedResponse,
  rateLimitedResponse,
  serverErrorResponse,
  corsHeaders,
} from '@/lib/api-auth';

const VALID_ISSUES = ['rate_limited', 'unavailable', 'error'] as const;

/**
 * Submit feedback about a model issue (rate limiting, unavailability, errors)
 * Requires API key authentication
 */
export const POST: APIRoute = async (context) => {
  // Validate API key from Authorization header
  const validation = await validateApiKey(context);

  if (!validation.valid) {
    // Config/server errors return 500
    if (validation.errorCode === 'CONFIG_ERROR' || validation.errorCode === 'SERVER_ERROR') {
      return serverErrorResponse(validation.error || 'Server error');
    }
    // Rate limit returns 429
    if (validation.errorCode === 'RATE_LIMITED') {
      return rateLimitedResponse(validation);
    }
    // All other errors (MISSING_AUTH, INVALID_FORMAT, EMPTY_KEY, INVALID_KEY) return 401
    return unauthorizedResponse(validation.error || 'Unauthorized');
  }

  try {
    const runtime = context.locals.runtime;
    const databaseUrl = runtime?.env?.DATABASE_URL || import.meta.env.DATABASE_URL;

    if (!databaseUrl) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const body = await context.request.json();
    const { modelId, issue, details } = body;

    if (!modelId || typeof modelId !== 'string') {
      return new Response(JSON.stringify({ error: 'modelId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders(validation) },
      });
    }

    if (!issue || !VALID_ISSUES.includes(issue)) {
      return new Response(
        JSON.stringify({ error: `issue must be one of: ${VALID_ISSUES.join(', ')}` }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders(validation) },
        }
      );
    }

    const db = createDb(databaseUrl);
    const id = crypto.randomUUID();

    await db.insert(modelFeedback).values({
      id,
      modelId,
      issue,
      details: details || null,
      // Store the user ID from the API key for tracking
      source: validation.userId || 'api-key',
      createdAt: new Date(),
    });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders(validation) },
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
