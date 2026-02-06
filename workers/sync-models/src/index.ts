/**
 * Cloudflare Worker with Cron Trigger for syncing free models from OpenRouter.
 *
 * This worker runs hourly inside Cloudflare's network, bypassing bot protection.
 * It directly connects to the Neon database to sync models.
 *
 * Required secrets (set via `wrangler secret put`):
 * - DATABASE_URL_ADMIN: Neon database URL with admin permissions
 */

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

interface Env {
  DATABASE_URL_ADMIN: string;
}

type Sql = NeonQueryFunction<false, false>;

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

async function syncModels(sql: Sql): Promise<SyncResult> {
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

    // Get existing model IDs
    const existingModels = (await sql`SELECT id FROM free_models`) as { id: string }[];
    const existingIds = new Set(existingModels.map((m) => m.id));

    const seenIds: string[] = [];
    const now = new Date();

    // Upsert each model
    for (const model of freeModelsList) {
      seenIds.push(model.id);
      const isNew = !existingIds.has(model.id);

      await sql`
        INSERT INTO free_models (
          id, name, context_length, max_completion_tokens, description,
          modality, input_modalities, output_modalities, supported_parameters,
          is_moderated, is_active, last_seen_at, created_at
        ) VALUES (
          ${model.id},
          ${model.name},
          ${model.context_length ?? null},
          ${model.top_provider?.max_completion_tokens ?? null},
          ${model.description ?? null},
          ${model.architecture?.modality ?? null},
          ${model.architecture?.input_modalities ?? null},
          ${model.architecture?.output_modalities ?? null},
          ${model.supported_parameters ?? null},
          ${model.top_provider?.is_moderated ?? null},
          true,
          ${now.toISOString()},
          ${now.toISOString()}
        )
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
          is_active = true,
          last_seen_at = EXCLUDED.last_seen_at
      `;

      if (isNew) {
        result.inserted++;
      } else {
        result.updated++;
      }
    }

    // Mark missing models as inactive (safety: only if we got >50% of known models)
    const activeCount = existingIds.size;
    if (seenIds.length >= activeCount * 0.5 || activeCount === 0) {
      if (seenIds.length > 0) {
        const updateResult = (await sql`
          UPDATE free_models
          SET is_active = false
          WHERE is_active = true
          AND id != ALL(${seenIds})
        `) as unknown[];
        result.markedInactive = updateResult.length;
      }
    }

    // Update sync metadata
    await sql`
      INSERT INTO sync_meta (key, value, updated_at)
      VALUES ('models_last_updated', ${now.toISOString()}, ${now.toISOString()})
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = EXCLUDED.updated_at
    `;

    // Record daily availability snapshot
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dateString = today.toISOString().split('T')[0];

    for (const modelId of seenIds) {
      const snapshotId = `${modelId}_${dateString}`;
      await sql`
        INSERT INTO model_availability_snapshots (id, model_id, snapshot_date, is_available)
        VALUES (${snapshotId}, ${modelId}, ${today.toISOString()}, true)
        ON CONFLICT (id) DO UPDATE SET is_available = true
      `;
    }

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

    const sql = neon(env.DATABASE_URL_ADMIN);
    const result = await syncModels(sql);

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

    const sql = neon(env.DATABASE_URL_ADMIN);
    const result = await syncModels(sql);

    console.log('[SyncWorker] Sync result:', JSON.stringify(result));
  },
};
