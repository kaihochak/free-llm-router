import type { APIRoute } from 'astro';
import { createDb, modelFeedback, apiRequestLogs } from '@/db';
import { lt } from 'drizzle-orm';

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
export const POST: APIRoute = async ({ request, locals }) => {
  const runtime = (locals as { runtime?: { env?: Record<string, string> } }).runtime;
  const adminSecret = runtime?.env?.ADMIN_SECRET || import.meta.env.ADMIN_SECRET;
  const databaseUrl = runtime?.env?.DATABASE_URL || import.meta.env.DATABASE_URL;

  // Validate admin secret
  if (!adminSecret) {
    return new Response(JSON.stringify({ error: 'ADMIN_SECRET not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const providedSecret = request.headers.get('X-Admin-Secret');
  if (!providedSecret || providedSecret !== adminSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!databaseUrl) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = createDb(databaseUrl);
    const now = new Date();

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

    return new Response(
      JSON.stringify({
        success: true,
        deleted: {
          modelFeedback: feedbackResult.rowCount ?? 0,
          apiRequestLogs: logsResult.rowCount ?? 0,
        },
        cutoffs: {
          modelFeedback: feedbackCutoff.toISOString(),
          apiRequestLogs: logsCutoff.toISOString(),
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[API/admin/cleanup] Error:', error);
    return new Response(JSON.stringify({ error: 'Cleanup failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
