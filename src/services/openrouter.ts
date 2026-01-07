import { eq, and, notInArray, gte, sql } from 'drizzle-orm';
import { freeModels, modelFeedback, syncMeta, type Database } from '../db';
import {
  type FilterType,
  type SortType,
  validateFilters,
  validateSort,
  filterModels,
  sortModels,
} from '../lib/model-types';

// Re-export types and validation functions for backwards compatibility
export { type FilterType, type SortType, validateFilters, validateSort };

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

export interface SyncResult {
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

export async function fetchFreeModelsFromOpenRouter(): Promise<OpenRouterApiModel[]> {
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const allModels: OpenRouterApiModel[] = data.data || [];

  return allModels.filter(isFreeModel);
}

export async function syncModels(db: Database): Promise<SyncResult> {
  const result: SyncResult = {
    totalApiModels: 0,
    freeModelsFound: 0,
    inserted: 0,
    updated: 0,
    markedInactive: 0,
  };

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const allModels: OpenRouterApiModel[] = data.data || [];
    result.totalApiModels = allModels.length;

    const freeModelsList = allModels.filter(isFreeModel);
    result.freeModelsFound = freeModelsList.length;

    // Get existing model IDs
    const existingModels = await db.select({ id: freeModels.id }).from(freeModels);
    const existingIds = new Set(existingModels.map((m) => m.id));

    const seenIds: string[] = [];

    // Upsert each model
    for (const model of freeModelsList) {
      seenIds.push(model.id);
      const isNew = !existingIds.has(model.id);

      const modelData = {
        id: model.id,
        name: model.name,
        contextLength: model.context_length,
        maxCompletionTokens: model.top_provider?.max_completion_tokens,
        description: model.description,
        modality: model.architecture?.modality,
        inputModalities: model.architecture?.input_modalities,
        outputModalities: model.architecture?.output_modalities,
        supportedParameters: model.supported_parameters,
        isModerated: model.top_provider?.is_moderated,
        isActive: true,
        lastSeenAt: new Date(),
      };

      await db
        .insert(freeModels)
        .values(modelData)
        .onConflictDoUpdate({
          target: freeModels.id,
          set: {
            name: modelData.name,
            contextLength: modelData.contextLength,
            maxCompletionTokens: modelData.maxCompletionTokens,
            description: modelData.description,
            modality: modelData.modality,
            inputModalities: modelData.inputModalities,
            outputModalities: modelData.outputModalities,
            supportedParameters: modelData.supportedParameters,
            isModerated: modelData.isModerated,
            isActive: true,
            lastSeenAt: new Date(),
          },
        });

      if (isNew) {
        result.inserted++;
      } else {
        result.updated++;
      }
    }

    // Mark missing models as inactive (safety: only if we got >50% of known models)
    const activeCount = existingModels.filter((m) => existingIds.has(m.id)).length;
    if (seenIds.length >= activeCount * 0.5 || activeCount === 0) {
      if (seenIds.length > 0) {
        const updateResult = await db
          .update(freeModels)
          .set({ isActive: false })
          .where(and(eq(freeModels.isActive, true), notInArray(freeModels.id, seenIds)));

        result.markedInactive = updateResult.rowCount ?? 0;
      }
    }

    // Update sync metadata
    await db
      .insert(syncMeta)
      .values({ key: 'models_last_updated', value: new Date().toISOString(), updatedAt: new Date() })
      .onConflictDoUpdate({
        target: syncMeta.key,
        set: { value: new Date().toISOString(), updatedAt: new Date() },
      });

    return result;
  } catch (error) {
    console.error('[OpenRouterSync] Sync failed:', error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

export async function getLastUpdated(db: Database): Promise<Date | null> {
  const result = await db
    .select({ value: syncMeta.value, updatedAt: syncMeta.updatedAt })
    .from(syncMeta)
    .where(eq(syncMeta.key, 'models_last_updated'))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return result[0].updatedAt;
}

export async function getActiveModels(db: Database) {
  return db
    .select({
      id: freeModels.id,
      name: freeModels.name,
      contextLength: freeModels.contextLength,
      maxCompletionTokens: freeModels.maxCompletionTokens,
      description: freeModels.description,
      modality: freeModels.modality,
      inputModalities: freeModels.inputModalities,
      outputModalities: freeModels.outputModalities,
      supportedParameters: freeModels.supportedParameters,
      isModerated: freeModels.isModerated,
      createdAt: freeModels.createdAt,
    })
    .from(freeModels)
    .where(eq(freeModels.isActive, true));
}

/**
 * Get all active models with issue counts attached.
 * Used by getFilteredModels to enable shared filtering/sorting logic.
 */
async function getActiveModelsWithFeedback(db: Database) {
  const models = await getActiveModels(db);
  const feedbackCounts = await getRecentFeedbackCounts(db);

  // Attach issueCount to each model (same logic as frontend)
  return models.map((model) => {
    const feedback = feedbackCounts[model.id];
    const issueCount = feedback ? feedback.rateLimited + feedback.unavailable + feedback.error : 0;
    return { ...model, issueCount };
  });
}

/**
 * Get filtered and sorted models using shared logic from model-types.ts.
 * Single source of truth - same functions used by frontend and backend.
 */
export async function getFilteredModels(db: Database, filters: FilterType[], sort: SortType) {
  const allModels = await getActiveModelsWithFeedback(db);
  const filtered = filterModels(allModels, filters);
  const sorted = sortModels(filtered, sort);
  return sorted;
}

const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
const FEEDBACK_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface FeedbackCounts {
  [modelId: string]: {
    rateLimited: number;
    unavailable: number;
    error: number;
  };
}

export async function getRecentFeedbackCounts(db: Database): Promise<FeedbackCounts> {
  const cutoff = new Date(Date.now() - FEEDBACK_WINDOW_MS);

  const results = await db
    .select({
      modelId: modelFeedback.modelId,
      issue: modelFeedback.issue,
      count: sql<number>`count(*)::int`,
    })
    .from(modelFeedback)
    .where(gte(modelFeedback.createdAt, cutoff))
    .groupBy(modelFeedback.modelId, modelFeedback.issue);

  const counts: FeedbackCounts = {};

  for (const row of results) {
    if (!counts[row.modelId]) {
      counts[row.modelId] = { rateLimited: 0, unavailable: 0, error: 0 };
    }
    if (row.issue === 'rate_limited') {
      counts[row.modelId].rateLimited = row.count;
    } else if (row.issue === 'unavailable') {
      counts[row.modelId].unavailable = row.count;
    } else if (row.issue === 'error') {
      counts[row.modelId].error = row.count;
    }
  }

  return counts;
}

export async function getModelsWithLazyRefresh(db: Database) {
  const lastUpdated = await getLastUpdated(db);

  // If no data or stale, sync first
  if (!lastUpdated || Date.now() - lastUpdated.getTime() > STALE_THRESHOLD_MS) {
    await syncModels(db);
  }

  const models = await getActiveModels(db);
  const updatedAt = await getLastUpdated(db);

  return {
    models,
    lastUpdated: updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

export async function ensureFreshModels(db: Database) {
  const lastUpdated = await getLastUpdated(db);

  if (!lastUpdated || Date.now() - lastUpdated.getTime() > STALE_THRESHOLD_MS) {
    await syncModels(db);
  }
}
