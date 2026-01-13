import type { APIRoute } from 'astro';

/**
 * Demo proxy endpoint for the website.
 * Uses a server-side DEMO_API_KEY to fetch models without exposing credentials to the browser.
 */
export const GET: APIRoute = async ({ locals, url }) => {
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

  try {
    const params = new URLSearchParams(url.searchParams);
    // Pass through myReports parameter if present
    const fullUrl = `${baseUrl}/api/v1/models/full${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(fullUrl, {
      headers: { 'Authorization': `Bearer ${demoKey}` },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch models' }), {
        status: response.status === 429 ? 429 : 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
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
