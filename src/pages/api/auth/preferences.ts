import type { APIRoute } from 'astro';
import { apiKeys, withUserContext } from '@/db';
import { eq, and } from 'drizzle-orm';
import { validatePreferences } from '@/lib/api-definitions';
import { getAuthSession, isSessionError } from '@/lib/auth-session';
import { jsonResponse } from '@/lib/api-response';

// GET /api/auth/preferences?apiKeyId=xxx - Get preferences for an API key
export const GET: APIRoute = async ({ request, locals, url }) => {
  try {
    const result = await getAuthSession(request, locals);
    if (isSessionError(result)) {
      return jsonResponse({ error: result.error }, { status: result.status });
    }

    const { session, databaseUrl } = result;
    const apiKeyId = url.searchParams.get('apiKeyId');

    if (!apiKeyId) {
      return jsonResponse({ error: 'apiKeyId is required' }, { status: 400 });
    }

    const preferences = await withUserContext(databaseUrl, session.user.id, async (db) => {
      // Verify the API key belongs to this user
      const [key] = await db
        .select({ metadata: apiKeys.metadata })
        .from(apiKeys)
        .where(and(eq(apiKeys.id, apiKeyId), eq(apiKeys.userId, session.user.id)))
        .limit(1);

      if (!key) {
        return null;
      }

      if (!key.metadata) {
        return {};
      }

      try {
        const parsed = JSON.parse(key.metadata);
        return parsed.preferences || {};
      } catch {
        return {};
      }
    });

    if (preferences === null) {
      return jsonResponse({ error: 'API key not found' }, { status: 404 });
    }

    return jsonResponse({ preferences });
  } catch (error) {
    console.error('Preferences fetch error:', error);
    return jsonResponse({ error: 'Internal server error' }, { status: 500 });
  }
};

// PUT /api/auth/preferences - Save preferences for an API key
export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    const result = await getAuthSession(request, locals);
    if (isSessionError(result)) {
      return jsonResponse({ error: result.error }, { status: result.status });
    }

    const { session, databaseUrl } = result;

    let body: { apiKeyId?: string; preferences?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { apiKeyId, preferences: rawPreferences } = body;

    if (!apiKeyId) {
      return jsonResponse({ error: 'apiKeyId is required' }, { status: 400 });
    }

    const preferences = validatePreferences(rawPreferences);

    const updated = await withUserContext(databaseUrl, session.user.id, async (db) => {
      // Verify the API key belongs to this user
      const [existing] = await db
        .select({ metadata: apiKeys.metadata })
        .from(apiKeys)
        .where(and(eq(apiKeys.id, apiKeyId), eq(apiKeys.userId, session.user.id)))
        .limit(1);

      if (!existing) {
        return null;
      }

      // Preserve existing metadata and add/update preferences
      let metadata: Record<string, unknown> = {};
      if (existing.metadata) {
        try {
          const parsed = JSON.parse(existing.metadata);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            metadata = parsed;
          }
        } catch {
          // Ignore parse errors, start fresh
        }
      }

      metadata.preferences = preferences;

      await db
        .update(apiKeys)
        .set({
          metadata: JSON.stringify(metadata),
          updatedAt: new Date(),
        })
        .where(eq(apiKeys.id, apiKeyId));

      return preferences;
    });

    if (updated === null) {
      return jsonResponse({ error: 'API key not found' }, { status: 404 });
    }

    return jsonResponse({ preferences: updated, message: 'Preferences saved' });
  } catch (error) {
    console.error('Preferences save error:', error);
    return jsonResponse({ error: 'Internal server error' }, { status: 500 });
  }
};
