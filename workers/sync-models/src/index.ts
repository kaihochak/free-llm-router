/**
 * Cloudflare Worker with Cron Trigger for syncing free models from OpenRouter.
 *
 * This worker runs hourly inside Cloudflare's network, bypassing bot protection.
 * It directly connects to the Neon database to sync models.
 *
 * Required secrets (set via `wrangler secret put`):
 * - DATABASE_URL_ADMIN: Neon database URL with admin permissions
 */

import { neon } from '@neondatabase/serverless';

interface Env {
  DATABASE_URL_ADMIN: string;
}

interface OpenRouterApiModel {
  id: string;
  name: string;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  context_length?: number;
  description?: string;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
  top_provider?: {
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  supported_parameters?: string[];
}

interface SyncResult {
  totalApiModels: number;
  freeModelsFound: number;
  inserted: number;
  updated: number;
  markedInactive: number;
  error?: string;
}

function isFreeModel(model: OpenRouterApiModel): boolean {
  const promptCost = parseFloat(model.pricing?.prompt || '999');
  const completionCost = parseFloat(model.pricing?.completion || '999');
  return promptCost === 0 && completionCost === 0;
}

/** Escape a value for safe SQL insertion */
function escapeValue(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return 'NULL';
    return `ARRAY[${v.map((x) => `'${String(x).replace(/'/g, "''")}'`).join(',')}]::text[]`;
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function syncModels(databaseUrl: string): Promise<SyncResult> {
  const result: SyncResult = {
    totalApiModels: 0,
    freeModelsFound: 0,
    inserted: 0,
    updated: 0,
    markedInactive: 0,
  };

  try {
    // Fetch models from OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = (await response.json()) as { data?: OpenRouterApiModel[] };
    const allModels: OpenRouterApiModel[] = data.data || [];
    result.totalApiModels = allModels.length;

    const freeModelsList = allModels.filter(isFreeModel);
    result.freeModelsFound = freeModelsList.length;

    if (freeModelsList.length === 0) {
      return result;
    }

    const sql = neon(databaseUrl);
    const now = new Date().toISOString();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dateString = today.toISOString().split('T')[0];
    const todayIso = today.toISOString();

    // Get existing model IDs in one query
    const existingModels = (await sql`SELECT id FROM free_models`) as { id: string }[];
    const existingIds = new Set(existingModels.map((m) => m.id));

    // Build VALUES for bulk upsert
    const seenIds: string[] = [];
    const modelValues: string[] = [];

    for (const model of freeModelsList) {
      seenIds.push(model.id);
      if (!existingIds.has(model.id)) {
        result.inserted++;
      } else {
        result.updated++;
      }

      modelValues.push(`(
        ${escapeValue(model.id)},
        ${escapeValue(model.name)},
        ${escapeValue(model.context_length ?? null)},
        ${escapeValue(model.top_provider?.max_completion_tokens ?? null)},
        ${escapeValue(model.description ?? null)},
        ${escapeValue(model.architecture?.modality ?? null)},
        ${escapeValue(model.architecture?.input_modalities ?? null)},
        ${escapeValue(model.architecture?.output_modalities ?? null)},
        ${escapeValue(model.supported_parameters ?? null)},
        ${escapeValue(model.top_provider?.is_moderated ?? null)},
        TRUE,
        ${escapeValue(now)},
        ${escapeValue(now)}
      )`);
    }

    // Build snapshot VALUES
    const snapshotValues: string[] = seenIds.map((modelId) => {
      const snapshotId = `${modelId}_${dateString}`;
      return `(${escapeValue(snapshotId)}, ${escapeValue(modelId)}, ${escapeValue(todayIso)}, TRUE)`;
    });

    // Build the seenIds list for the NOT IN clause
    const seenIdsList = seenIds.map((id) => escapeValue(id)).join(',');

    // Execute all operations in a single multi-statement query
    // This minimizes subrequests to stay under Cloudflare's limit
    const bulkQuery = `
      INSERT INTO free_models (
        id, name, context_length, max_completion_tokens, description,
        modality, input_modalities, output_modalities, supported_parameters,
        is_moderated, is_active, last_seen_at, created_at
      ) VALUES ${modelValues.join(',\n')}
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        context_length = EXCLUDED.context_length,
        max_completion_tokens = EXCLUDED.max_completion_tokens,
        description = EXCLUDED.description,
        modality = EXCLUDED.modality,
        input_modalities = EXCLUDED.input_modalities,
        output_modalities = EXCLUDED.output_modalities,
        supported_parameters = EXCLUDED.supported_parameters,
        is_moderated = EXCLUDED.is_moderated,
        is_active = TRUE,
        last_seen_at = EXCLUDED.last_seen_at;

      UPDATE free_models
      SET is_active = FALSE
      WHERE is_active = TRUE
      AND id NOT IN (${seenIdsList});

      INSERT INTO sync_meta (key, value, updated_at)
      VALUES ('models_last_updated', ${escapeValue(now)}, ${escapeValue(now)})
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = EXCLUDED.updated_at;

      INSERT INTO model_availability_snapshots (id, model_id, snapshot_date, is_available)
      VALUES ${snapshotValues.join(',\n')}
      ON CONFLICT (id) DO UPDATE SET is_available = TRUE;
    `;

    // Use sql.query() for raw SQL strings (tagged template doesn't support this)
    await sql.query(bulkQuery);

    return result;
  } catch (error) {
    console.error('[SyncWorker] Sync failed:', error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

export default {
  // HTTP handler (for manual triggers / health checks)
  async fetch(_request: Request, env: Env): Promise<Response> {
    if (!env.DATABASE_URL_ADMIN) {
      return new Response(JSON.stringify({ error: 'DATABASE_URL_ADMIN not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await syncModels(env.DATABASE_URL_ADMIN);

    return new Response(JSON.stringify(result, null, 2), {
      status: result.error ? 500 : 200,
      headers: { 'Content-Type': 'application/json' },
    });
  },

  // Cron handler (scheduled trigger)
  async scheduled(event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    if (!env.DATABASE_URL_ADMIN) {
      console.error('[SyncWorker] DATABASE_URL_ADMIN not configured');
      return;
    }

    console.log(`[SyncWorker] Cron triggered at ${new Date(event.scheduledTime).toISOString()}`);

    const result = await syncModels(env.DATABASE_URL_ADMIN);

    console.log('[SyncWorker] Sync result:', JSON.stringify(result));
  },
};
