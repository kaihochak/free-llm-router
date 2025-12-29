import type { APIRoute } from 'astro';
import { createDb } from '@/db';
import { syncModels } from '@/services/openrouter';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const runtime = locals.runtime;
    const databaseUrl = runtime?.env?.DATABASE_URL || import.meta.env.DATABASE_URL;
    const refreshApiKey = runtime?.env?.REFRESH_API_KEY || import.meta.env.REFRESH_API_KEY;

    // Check API key if configured
    if (refreshApiKey) {
      const authHeader = request.headers.get('Authorization');
      const providedKey = authHeader?.replace('Bearer ', '');

      if (providedKey !== refreshApiKey) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (!databaseUrl) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = createDb(databaseUrl);
    const result = await syncModels(db);

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalApiModels: result.totalApiModels,
        freeModelsFound: result.freeModelsFound,
        inserted: result.inserted,
        updated: result.updated,
        markedInactive: result.markedInactive,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[API/refresh] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to refresh models' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
