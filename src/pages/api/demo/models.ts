import type { APIRoute } from 'astro';
import { getClientIp, createRateLimiter, isAllowedOrigin } from '@/lib/api-utils';
import { siteConfig } from '@/lib/seo';

// Lightweight in-memory cache (best effort per instance).
// This keeps the endpoint anonymous while reducing demo key burn.
const cache = new Map<string, { body: string; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // reuse upstream response for 60s

// Rate limiter: 20 requests per IP per minute
const rateLimiter = createRateLimiter(20, 60_000);

// Allowed origins for demo endpoint (blocks off-site scraping)
const ALLOWED_ORIGINS = [
  siteConfig.url,
  'https://staging.free-llm-router.pages.dev',
  'http://localhost:4321',
  'http://localhost:3000',
];

/**
 * Demo proxy endpoint for the website.
 * Uses a server-side DEMO_API_KEY to fetch models without exposing credentials to the browser.
 */
export const GET: APIRoute = async ({ locals, url, request }) => {
  // Check origin first (blocks off-site scraping)
  if (!isAllowedOrigin(request, ALLOWED_ORIGINS)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const runtime = (locals as { runtime?: { env?: Record<string, string> } }).runtime;
  const env = runtime?.env || {};

  const demoKey = env.DEMO_API_KEY || import.meta.env.DEMO_API_KEY;
  const baseUrl = env.BETTER_AUTH_URL || import.meta.env.BETTER_AUTH_URL || url.origin;

  if (!demoKey) {
    return new Response(JSON.stringify({ error: 'Demo API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }


  const ip = getClientIp(request);
  const { limited } = rateLimiter.check(ip);
  if (limited) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cacheKey = url.search;
  const now = Date.now();
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return new Response(cached.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    });
  }

  try {
    const params = new URLSearchParams(url.searchParams);
    // Force myReports=false for demo - shows community data, not demo user's reports
    params.set('myReports', 'false');
    const fullUrl = `${baseUrl}/api/v1/models/full${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(fullUrl, {
      headers: { Authorization: `Bearer ${demoKey}` },
    });

    const text = await response.text();

    if (!response.ok) {
      return new Response(text || JSON.stringify({ error: 'Failed to fetch models' }), {
        status: response.status === 429 ? 429 : 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    cache.set(cacheKey, { body: text, expiresAt: now + CACHE_TTL_MS });

    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('[API/demo/models] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch models' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
