import type { APIRoute } from 'astro';
import { createDb, modelFeedback } from '@/db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const VALID_ISSUES = ['rate_limited', 'unavailable', 'error'] as const;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const runtime = locals.runtime;
    const databaseUrl = runtime?.env?.DATABASE_URL || import.meta.env.DATABASE_URL;

    if (!databaseUrl) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const body = await request.json();
    const { modelId, issue, details, source } = body;

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

    const db = createDb(databaseUrl);
    const id = crypto.randomUUID();

    await db.insert(modelFeedback).values({
      id,
      modelId,
      issue,
      details: details || null,
      source: source || 'anonymous',
      createdAt: new Date(),
    });

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
