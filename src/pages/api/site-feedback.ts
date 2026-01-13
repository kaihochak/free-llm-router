import type { APIRoute } from 'astro';
import { createDb, siteFeedback } from '@/db';

interface FeedbackPayload {
  type?: (typeof VALID_TYPES)[number];
  message?: string;
  email?: string;
  userAgent?: string;
  pageUrl?: string;
  'cf-turnstile-response'?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const VALID_TYPES = ['general', 'bug'] as const;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const runtime = (locals as { runtime?: { env?: Record<string, string> } }).runtime;
    const databaseUrl = runtime?.env?.DATABASE_URL || import.meta.env.DATABASE_URL;
    const turnstileSecret =
      runtime?.env?.TURNSTILE_SECRET_KEY || import.meta.env.TURNSTILE_SECRET_KEY;

    if (!databaseUrl) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const body = (await request.json()) as FeedbackPayload;
    const { type, message, email, userAgent, pageUrl, 'cf-turnstile-response': token } = body;

    // Verify Turnstile token if secret is configured
    if (turnstileSecret && token) {
      const turnstileResponse = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: turnstileSecret,
            response: token,
          }),
        }
      );

      const turnstileResult = (await turnstileResponse.json()) as { success?: boolean };

      if (!turnstileResult.success) {
        return new Response(JSON.stringify({ error: 'Captcha verification failed' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    } else if (turnstileSecret && !token) {
      // Turnstile is configured but no token provided
      return new Response(JSON.stringify({ error: 'Missing captcha token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!type || !VALID_TYPES.includes(type)) {
      return new Response(
        JSON.stringify({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: 'message is required (minimum 10 characters)' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (message.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'message is too long (maximum 5000 characters)' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Valid email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const db = createDb(databaseUrl);
    const id = crypto.randomUUID();

    await db.insert(siteFeedback).values({
      id,
      type,
      message: message.trim(),
      email,
      userAgent: userAgent || null,
      pageUrl: pageUrl || null,
      createdAt: new Date(),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('[API/site-feedback] Error:', error);
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
