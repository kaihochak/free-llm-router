import type { APIRoute } from 'astro';
import { createDb, modelFeedback, apiRequestLogs } from '@/db';
import { lt } from 'drizzle-orm';
import { apiResponseHeaders, jsonResponse } from '@/lib/api-response';

const MODEL_FEEDBACK_RETENTION_DAYS = 90;
const API_LOGS_RETENTION_DAYS = 30;

/**
 * Admin endpoint to clean up old data.
 * Protected by ADMIN_SECRET env var.
 *
 * POST /api/admin/cleanup
 * Headers: X-Admin-Secret: <secret>
 *
 * Deletes:
 * - model_feedback older than 90 days
 * - api_request_logs older than 30 days
 */
type CleanupDeps = {
  createDb?: typeof createDb;
  now?: () => Date;
};

export const POST: APIRoute = async ({ request, locals }) => {
  const runtime = (locals as { runtime?: { env?: Record<string, string> } }).runtime;
  const deps = (locals as { cleanupDeps?: CleanupDeps }).cleanupDeps;
  const dbFactory = deps?.createDb ?? createDb;
  const now = deps?.now ? deps.now() : new Date();
  const importMetaEnv = (import.meta as { env?: Record<string, string> }).env;
  const adminSecret = runtime?.env?.ADMIN_SECRET || importMetaEnv?.ADMIN_SECRET;
  const databaseUrl =
    runtime?.env?.DATABASE_URL_ADMIN ||
    importMetaEnv?.DATABASE_URL_ADMIN ||
    runtime?.env?.DATABASE_URL ||
    importMetaEnv?.DATABASE_URL;

  // Validate admin secret
  if (!adminSecret) {
    return jsonResponse(
      { error: 'ADMIN_SECRET not configured' },
      { status: 500, headers: apiResponseHeaders({ cors: false }) }
    );
  }

  const providedSecret = request.headers.get('X-Admin-Secret');
  if (!providedSecret || providedSecret !== adminSecret) {
    return jsonResponse(
      { error: 'Unauthorized' },
      { status: 401, headers: apiResponseHeaders({ cors: false }) }
    );
  }

  if (!databaseUrl) {
    return jsonResponse(
      { error: 'Database not configured' },
      { status: 500, headers: apiResponseHeaders({ cors: false }) }
    );
  }

  try {
    const db = dbFactory(databaseUrl);

    // Calculate cutoff dates
    const feedbackCutoff = new Date(now.getTime() - MODEL_FEEDBACK_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const logsCutoff = new Date(now.getTime() - API_LOGS_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    // Delete old model feedback
    const feedbackResult = await db
      .delete(modelFeedback)
      .where(lt(modelFeedback.createdAt, feedbackCutoff));

    // Delete old API request logs
    const logsResult = await db
      .delete(apiRequestLogs)
      .where(lt(apiRequestLogs.createdAt, logsCutoff));

    return jsonResponse(
      {
        success: true,
        deleted: {
          modelFeedback: feedbackResult.rowCount ?? 0,
          apiRequestLogs: logsResult.rowCount ?? 0,
        },
        cutoffs: {
          modelFeedback: feedbackCutoff.toISOString(),
          apiRequestLogs: logsCutoff.toISOString(),
        },
      },
      { headers: apiResponseHeaders({ cors: false }) }
    );
  } catch (error) {
    console.error('[API/admin/cleanup] Error:', error);
    return jsonResponse({ error: 'Cleanup failed' }, { status: 500, headers: apiResponseHeaders({ cors: false }) });
  }
};
