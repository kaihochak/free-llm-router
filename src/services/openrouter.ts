import { eq, and, notInArray, gte, sql } from 'drizzle-orm';
import { freeModels, modelFeedback, syncMeta, type Database } from '../db';
import {
  type UseCaseType,
  type SortType,
  validateUseCases,
  validateSort,
  filterModelsByUseCase,
  sortModels,
} from '../lib/model-types';
import { type TimeRange, TIME_RANGE_MS } from '../lib/api-definitions';

// Re-export types and validation functions for backwards compatibility
export { type UseCaseType, type SortType, validateUseCases, validateSort };
export { type TimeRange };

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
      .values({
        key: 'models_last_updated',
        value: new Date().toISOString(),
        updatedAt: new Date(),
      })
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
async function getActiveModelsWithFeedback(
  db: Database,
  timeRange: TimeRange = '24h',
  userId?: string
) {
  const models = await getActiveModels(db);
  const feedbackCounts = await getRecentFeedbackCounts(db, timeRange, userId);

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
 * Optionally filters out models with error rate above the threshold.
 *
 * @param useCases - Use cases to filter by (chat, vision, tools, etc.)
 * @param sort - Sort order
 * @param maxErrorRate - Maximum error rate percentage (0-100). Models with higher error rate are excluded.
 * @param timeRange - Time range for calculating error rates
 */
export async function getFilteredModels(
  db: Database,
  useCases: UseCaseType[],
  sort: SortType,
  maxErrorRate?: number,
  timeRange: TimeRange = '24h',
  userId?: string
) {
  const allModels = await getActiveModelsWithFeedback(db, timeRange, userId);
  const filtered = filterModelsByUseCase(allModels, useCases);
  const sorted = sortModels(filtered, sort);

  // Apply error rate threshold filtering if specified
  if (maxErrorRate !== undefined) {
    const feedbackCounts = await getRecentFeedbackCounts(db, timeRange, userId);
    return sorted.filter((model) => {
      const feedback = feedbackCounts[model.id];
      if (!feedback) return true; // No feedback = keep model (0% error rate)
      return feedback.errorRate <= maxErrorRate;
    });
  }

  return sorted;
}

const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
const FEEDBACK_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface FeedbackCounts {
  [modelId: string]: {
    rateLimited: number;
    unavailable: number;
    error: number;
    successCount: number;
    errorRate: number;
  };
}

export async function getRecentFeedbackCounts(
  db: Database,
  timeRange: TimeRange = '24h',
  userId?: string
): Promise<FeedbackCounts> {
  const windowMs = TIME_RANGE_MS[timeRange];
  const cutoff = windowMs !== null ? new Date(Date.now() - windowMs) : new Date(0);

  const whereConditions = [gte(modelFeedback.createdAt, cutoff)];
  if (userId) {
    whereConditions.push(eq(modelFeedback.source, userId));
  }

  const results = await db
    .select({
      modelId: modelFeedback.modelId,
      issue: modelFeedback.issue,
      isSuccess: modelFeedback.isSuccess,
      count: sql<number>`count(*)::int`,
    })
    .from(modelFeedback)
    .where(and(...whereConditions))
    .groupBy(modelFeedback.modelId, modelFeedback.issue, modelFeedback.isSuccess);

  const counts: FeedbackCounts = {};

  for (const row of results) {
    if (!counts[row.modelId]) {
      counts[row.modelId] = {
        rateLimited: 0,
        unavailable: 0,
        error: 0,
        successCount: 0,
        errorRate: 0,
      };
    }

    if (row.isSuccess) {
      counts[row.modelId].successCount += row.count;
    } else if (row.issue === 'rate_limited') {
      counts[row.modelId].rateLimited += row.count;
    } else if (row.issue === 'unavailable') {
      counts[row.modelId].unavailable += row.count;
    } else if (row.issue === 'error') {
      counts[row.modelId].error += row.count;
    }
  }

  // Calculate error rates
  for (const modelId in counts) {
    const c = counts[modelId];
    const errorCount = c.rateLimited + c.unavailable + c.error;
    const total = c.successCount + errorCount;
    c.errorRate = total > 0 ? Math.round((errorCount / total) * 10000) / 100 : 0;
  }

  return counts;
}

export interface IssueSummary {
  modelId: string;
  modelName: string;
  rateLimited: number;
  unavailable: number;
  error: number;
  total: number;
  successCount: number;
  errorRate: number; // percentage 0-100
}

export async function getFeedbackCountsByRange(
  db: Database,
  range: TimeRange,
  userId?: string
): Promise<IssueSummary[]> {
  const windowMs = TIME_RANGE_MS[range];

  // Build where conditions
  const whereConditions: any[] = [];
  if (windowMs !== null) {
    whereConditions.push(gte(modelFeedback.createdAt, new Date(Date.now() - windowMs)));
  }
  if (userId) {
    whereConditions.push(eq(modelFeedback.source, userId));
  }

  const baseQuery = db
    .select({
      modelId: modelFeedback.modelId,
      modelName: freeModels.name,
      issue: modelFeedback.issue,
      isSuccess: modelFeedback.isSuccess,
      count: sql<number>`count(*)::int`,
    })
    .from(modelFeedback)
    .leftJoin(freeModels, eq(modelFeedback.modelId, freeModels.id))
    .groupBy(modelFeedback.modelId, freeModels.name, modelFeedback.issue, modelFeedback.isSuccess);

  const query = whereConditions.length > 0 ? baseQuery.where(and(...whereConditions)) : baseQuery;
  const results = await query;

  // Aggregate into IssueSummary array
  const summaryMap: Record<string, IssueSummary> = {};

  for (const row of results) {
    if (!summaryMap[row.modelId]) {
      summaryMap[row.modelId] = {
        modelId: row.modelId,
        modelName: row.modelName ?? row.modelId,
        rateLimited: 0,
        unavailable: 0,
        error: 0,
        total: 0,
        successCount: 0,
        errorRate: 0,
      };
    }

    if (row.isSuccess) {
      summaryMap[row.modelId].successCount += row.count;
    } else if (row.issue === 'rate_limited') {
      summaryMap[row.modelId].rateLimited += row.count;
      summaryMap[row.modelId].total += row.count;
    } else if (row.issue === 'unavailable') {
      summaryMap[row.modelId].unavailable += row.count;
      summaryMap[row.modelId].total += row.count;
    } else if (row.issue === 'error') {
      summaryMap[row.modelId].error += row.count;
      summaryMap[row.modelId].total += row.count;
    }
  }

  // Calculate error rates
  for (const modelId in summaryMap) {
    const summary = summaryMap[modelId];
    const totalReports = summary.successCount + summary.total;
    summary.errorRate =
      totalReports > 0 ? Math.round((summary.total / totalReports) * 10000) / 100 : 0;
  }

  // Sort by total issues descending
  return Object.values(summaryMap).sort((a, b) => b.total - a.total);
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

// Timeline data point for charts
export interface TimelinePoint {
  date: string;
  [modelId: string]: number | string;
}

/**
 * Generate all time buckets for a given range, even if empty.
 * Uses UTC dates to match PostgreSQL date_trunc output.
 */
function generateTimeBuckets(range: TimeRange): string[] {
  const now = new Date();
  const buckets: string[] = [];

  if (range === '15m') {
    // 15 minute window (minute buckets)
    for (let i = 14; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCSeconds(0, 0);
      d.setUTCMinutes(d.getUTCMinutes() - i);
      buckets.push(d.toISOString().replace('T', ' ').slice(0, 19));
    }
  } else if (range === '1h') {
    // 60 minute window (minute buckets)
    for (let i = 59; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCSeconds(0, 0);
      d.setUTCMinutes(d.getUTCMinutes() - i);
      buckets.push(d.toISOString().replace('T', ' ').slice(0, 19));
    }
  } else if (range === '6h') {
    // 6 hourly buckets
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCMinutes(0, 0, 0);
      d.setUTCHours(d.getUTCHours() - i);
      buckets.push(d.toISOString().replace('T', ' ').slice(0, 19));
    }
  } else if (range === '24h') {
    // 24 hourly buckets
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCMinutes(0, 0, 0);
      d.setUTCHours(d.getUTCHours() - i);
      buckets.push(d.toISOString().replace('T', ' ').slice(0, 19));
    }
  } else if (range === '7d') {
    // 7 daily buckets
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - i);
      buckets.push(d.toISOString().replace('T', ' ').slice(0, 19));
    }
  } else {
    // 30d - 30 daily buckets
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - i);
      buckets.push(d.toISOString().replace('T', ' ').slice(0, 19));
    }
  }

  return buckets;
}

/**
 * Get feedback counts grouped by time bucket and model for charting.
 * Returns array of { date, modelId1: count, modelId2: count, ... }
 * Includes all time buckets even if empty.
 */
export async function getFeedbackTimeline(
  db: Database,
  range: TimeRange,
  userId?: string
): Promise<TimelinePoint[]> {
  const windowMs = TIME_RANGE_MS[range];
  // Use hourly buckets for 24h, daily for 7d/30d
  const truncUnit =
    range === '15m' || range === '1h'
      ? 'minute'
      : range === '6h' || range === '24h'
        ? 'hour'
        : 'day';
  const dateTrunc = sql.raw(`date_trunc('${truncUnit}', ${modelFeedback.createdAt.name})`);

  const conditions = [
    windowMs !== null ? gte(modelFeedback.createdAt, new Date(Date.now() - windowMs)) : undefined,
    ...(userId ? [eq(modelFeedback.source, userId)] : []),
  ].filter(Boolean) as Parameters<typeof db.select>[0][];

  const results = await db
    .select({
      bucket: sql<string>`${dateTrunc}::text`,
      modelId: modelFeedback.modelId,
      count: sql<number>`count(*)::int`,
    })
    .from(modelFeedback)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(dateTrunc, modelFeedback.modelId)
    .orderBy(dateTrunc);

  // Build map of actual data
  const dataMap: Record<string, Record<string, number>> = {};
  for (const row of results) {
    if (!dataMap[row.bucket]) {
      dataMap[row.bucket] = {};
    }
    dataMap[row.bucket][row.modelId] = row.count;
  }

  // Generate all buckets and fill with data (or empty)
  const allBuckets = generateTimeBuckets(range);
  const timeline: TimelinePoint[] = [];

  for (const bucket of allBuckets) {
    const point: TimelinePoint = { date: bucket };
    const bucketData = dataMap[bucket];
    if (bucketData) {
      Object.assign(point, bucketData);
    }
    timeline.push(point);
  }

  return timeline;
}
