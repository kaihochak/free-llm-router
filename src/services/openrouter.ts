import { eq, and, notInArray, gte, sql, type SQL } from 'drizzle-orm';
import {
  freeModels,
  modelFeedback,
  syncMeta,
  modelAvailabilitySnapshots,
  type Database,
  getFeedbackCounts as getFeedbackCountsStats,
  getErrorTimeline as getErrorTimelineStats,
  createDb,
} from '../db';
import {
  type UseCaseType,
  type SortType,
  validateUseCases,
  validateSort,
  filterModelsByUseCase,
  sortModels,
} from '../lib/model-types';
import { type TimeRange, TIME_RANGE_MS, DEFAULT_TIME_RANGE } from '../lib/api-definitions';
import {
  isFreeModel,
  parseOpenRouterModelsResponse,
  type OpenRouterApiModel,
} from '../../shared/openrouter-models';

export { type UseCaseType, type SortType, validateUseCases, validateSort };
export { type TimeRange };

export interface SyncResult {
  totalApiModels: number;
  freeModelsFound: number;
  inserted: number;
  updated: number;
  markedInactive: number;
  error?: string;
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

  const { data: allModels } = parseOpenRouterModelsResponse(await response.json());

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

    const { data: allModels } = parseOpenRouterModelsResponse(await response.json());
    result.totalApiModels = allModels.length;

    const freeModelsList = allModels.filter(isFreeModel);
    result.freeModelsFound = freeModelsList.length;

    const existingModels = await db.select({ id: freeModels.id }).from(freeModels);
    const existingIds = new Set(existingModels.map((m) => m.id));

    const seenIds = freeModelsList.map((model) => model.id);
    const syncTime = new Date();

    result.markedInactive = await db.transaction(async (tx) => {
      for (const model of freeModelsList) {
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
          lastSeenAt: syncTime,
        };

        await tx
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
              lastSeenAt: syncTime,
            },
          });
      }

      const inactiveCondition =
        seenIds.length > 0
          ? and(eq(freeModels.isActive, true), notInArray(freeModels.id, seenIds))
          : eq(freeModels.isActive, true);
      const updateResult = await tx
        .update(freeModels)
        .set({ isActive: false })
        .where(inactiveCondition);

      await tx
        .insert(syncMeta)
        .values({
          key: 'models_last_updated',
          value: syncTime.toISOString(),
          updatedAt: syncTime,
        })
        .onConflictDoUpdate({
          target: syncMeta.key,
          set: { value: syncTime.toISOString(), updatedAt: syncTime },
        });

      return updateResult.rowCount ?? 0;
    });

    result.inserted = freeModelsList.filter((model) => !existingIds.has(model.id)).length;
    result.updated = freeModelsList.length - result.inserted;

    try {
      await recordDailyAvailabilitySnapshot(db, seenIds);
    } catch (snapshotError) {
      console.error('[OpenRouterSync] Snapshot write failed:', snapshotError);
    }

    return result;
  } catch (error) {
    console.error('[OpenRouterSync] Sync failed:', error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

export async function recordDailyAvailabilitySnapshot(
  db: Database,
  seenModelIds: string[]
): Promise<{ recorded: number }> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dateString = today.toISOString().split('T')[0];

  let recorded = 0;

  for (const modelId of seenModelIds) {
    const snapshotId = `${modelId}_${dateString}`;

    await db
      .insert(modelAvailabilitySnapshots)
      .values({
        id: snapshotId,
        modelId,
        snapshotDate: today,
        isAvailable: true,
      })
      .onConflictDoUpdate({
        target: modelAvailabilitySnapshots.id,
        set: { isAvailable: true },
      });

    recorded++;
  }

  return { recorded };
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
      lastSeenAt: freeModels.lastSeenAt,
      createdAt: freeModels.createdAt,
    })
    .from(freeModels)
    .where(eq(freeModels.isActive, true));
}

async function getActiveModelsWithFeedback(
  db: Database,
  timeRange: TimeRange = DEFAULT_TIME_RANGE,
  userId?: string,
  statsDbUrl?: string
) {
  const models = await getActiveModels(db);
  const feedbackCounts = await getRecentFeedbackCounts(db, timeRange, userId, statsDbUrl);

  return models.map((model) => {
    const feedback = feedbackCounts[model.id];
    const issueCount = feedback ? feedback.rateLimited + feedback.unavailable + feedback.error : 0;
    const errorRate = feedback ? feedback.errorRate : 0;
    return { ...model, issueCount, errorRate };
  });
}

export async function getFilteredModels(
  db: Database,
  useCases: UseCaseType[],
  sort: SortType,
  maxErrorRate?: number,
  timeRange: TimeRange = DEFAULT_TIME_RANGE,
  userId?: string,
  statsDbUrl?: string
) {
  const allModels = await getActiveModelsWithFeedback(db, timeRange, userId, statsDbUrl);
  const filtered = filterModelsByUseCase(allModels, useCases);
  const sorted = sortModels(filtered, sort);

  if (maxErrorRate !== undefined) {
    const feedbackCounts = await getRecentFeedbackCounts(db, timeRange, userId, statsDbUrl);
    return sorted.filter((model) => {
      const feedback = feedbackCounts[model.id];
      if (!feedback) return true;
      return feedback.errorRate <= maxErrorRate;
    });
  }

  return sorted;
}

const STALE_THRESHOLD_MS = 60 * 60 * 1000;
const CRITICAL_STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000;
const SYNC_LOCK_DURATION_MS = 5 * 60 * 1000;

const FEEDBACK_WINDOW_MS = 24 * 60 * 60 * 1000;

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
  timeRange: TimeRange = DEFAULT_TIME_RANGE,
  userId?: string,
  statsDbUrl?: string
): Promise<FeedbackCounts> {
  const windowMs = TIME_RANGE_MS[timeRange];
  const cutoff = windowMs !== null ? new Date(Date.now() - windowMs) : new Date(0);

  if (!userId && statsDbUrl) {
    const endTs = new Date();
    const startTs = windowMs !== null ? new Date(Date.now() - windowMs) : new Date(0);
    const rows = await getFeedbackCountsStats(statsDbUrl, startTs, endTs);

    const counts: FeedbackCounts = {};
    for (const row of rows) {
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

    for (const modelId in counts) {
      const c = counts[modelId];
      const errorCount = c.rateLimited + c.unavailable + c.error;
      const total = c.successCount + errorCount;
      c.errorRate = total > 0 ? Math.round((errorCount / total) * 10000) / 100 : 0;
    }

    return counts;
  }

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
  errorRate: number;
  modality: string | null;
  inputModalities: string[] | null;
  outputModalities: string[] | null;
  supportedParameters: string[] | null;
  contextLength: number | null;
  maxCompletionTokens: number | null;
}

export interface HealthFilterOptions {
  range: TimeRange;
  userId?: string;
  statsDbUrl?: string;
  useCases?: UseCaseType[];
  sort?: SortType;
  topN?: number;
  maxErrorRate?: number;
}

export async function getFeedbackCountsByRange(
  db: Database,
  options: HealthFilterOptions
): Promise<IssueSummary[]> {
  const { range, userId, statsDbUrl, useCases, sort, topN, maxErrorRate } = options;
  const windowMs = TIME_RANGE_MS[range];

  if (!userId && statsDbUrl) {
    const endTs = new Date();
    const startTs = windowMs !== null ? new Date(Date.now() - windowMs) : new Date(0);
    const rows = await getFeedbackCountsStats(statsDbUrl, startTs, endTs);
    const statsDb = createDb(statsDbUrl);
    const modelRows = await statsDb
      .select({
        id: freeModels.id,
        name: freeModels.name,
        modality: freeModels.modality,
        inputModalities: freeModels.inputModalities,
        outputModalities: freeModels.outputModalities,
        supportedParameters: freeModels.supportedParameters,
        contextLength: freeModels.contextLength,
        maxCompletionTokens: freeModels.maxCompletionTokens,
      })
      .from(freeModels)
      .where(eq(freeModels.isActive, true));

    const modelMap = new Map<string, (typeof modelRows)[number]>();
    for (const model of modelRows) {
      modelMap.set(model.id, model);
    }

    const summaryMap: Record<string, IssueSummary> = {};
    for (const row of rows) {
      const model = modelMap.get(row.modelId);
      if (!model) continue;

      if (!summaryMap[row.modelId]) {
        summaryMap[row.modelId] = {
          modelId: row.modelId,
          modelName: model.name,
          rateLimited: 0,
          unavailable: 0,
          error: 0,
          total: 0,
          successCount: 0,
          errorRate: 0,
          modality: model.modality,
          inputModalities: model.inputModalities,
          outputModalities: model.outputModalities,
          supportedParameters: model.supportedParameters,
          contextLength: model.contextLength,
          maxCompletionTokens: model.maxCompletionTokens,
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

    for (const modelId in summaryMap) {
      const summary = summaryMap[modelId];
      const totalReports = summary.successCount + summary.total;
      summary.errorRate =
        totalReports > 0 ? Math.round((summary.total / totalReports) * 10000) / 100 : 0;
    }

    let summaries = Object.values(summaryMap);
    if (useCases && useCases.length > 0) {
      summaries = filterModelsByUseCase(summaries, useCases);
    }
    if (maxErrorRate !== undefined) {
      summaries = summaries.filter((s) => s.errorRate <= maxErrorRate);
    }
    if (sort) {
      summaries = sortModels(summaries, sort);
    } else {
      summaries.sort((a, b) => b.total - a.total);
    }
    if (topN !== undefined && topN > 0) {
      summaries = summaries.slice(0, topN);
    }

    return summaries;
  }

  const whereConditions: SQL[] = [eq(freeModels.isActive, true)];
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
      modality: freeModels.modality,
      inputModalities: freeModels.inputModalities,
      outputModalities: freeModels.outputModalities,
      supportedParameters: freeModels.supportedParameters,
      contextLength: freeModels.contextLength,
      maxCompletionTokens: freeModels.maxCompletionTokens,
    })
    .from(modelFeedback)
    .leftJoin(freeModels, eq(modelFeedback.modelId, freeModels.id))
    .groupBy(
      modelFeedback.modelId,
      freeModels.name,
      modelFeedback.issue,
      modelFeedback.isSuccess,
      freeModels.modality,
      freeModels.inputModalities,
      freeModels.outputModalities,
      freeModels.supportedParameters,
      freeModels.contextLength,
      freeModels.maxCompletionTokens
    );

  const query = whereConditions.length > 0 ? baseQuery.where(and(...whereConditions)) : baseQuery;
  const results = await query;

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
        modality: row.modality,
        inputModalities: row.inputModalities,
        outputModalities: row.outputModalities,
        supportedParameters: row.supportedParameters,
        contextLength: row.contextLength,
        maxCompletionTokens: row.maxCompletionTokens,
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

  for (const modelId in summaryMap) {
    const summary = summaryMap[modelId];
    const totalReports = summary.successCount + summary.total;
    summary.errorRate =
      totalReports > 0 ? Math.round((summary.total / totalReports) * 10000) / 100 : 0;
  }

  let summaries = Object.values(summaryMap);

  if (useCases && useCases.length > 0) {
    summaries = filterModelsByUseCase(summaries, useCases);
  }

  if (maxErrorRate !== undefined) {
    summaries = summaries.filter((s) => s.errorRate <= maxErrorRate);
  }

  if (sort) {
    summaries = sortModels(summaries, sort);
  } else {
    summaries.sort((a, b) => b.total - a.total);
  }

  if (topN !== undefined && topN > 0) {
    summaries = summaries.slice(0, topN);
  }

  return summaries;
}

export async function getModelsWithLazyRefresh(db: Database) {
  const lastUpdated = await getLastUpdated(db);

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

export async function checkModelsFreshness(db: Database): Promise<{
  isFresh: boolean;
  isCriticallyStale: boolean;
  lastUpdated: Date | null;
  ageMs: number;
}> {
  const lastUpdated = await getLastUpdated(db);

  if (!lastUpdated) {
    return { isFresh: false, isCriticallyStale: true, lastUpdated: null, ageMs: Infinity };
  }

  const ageMs = Date.now() - lastUpdated.getTime();
  return {
    isFresh: ageMs <= STALE_THRESHOLD_MS,
    isCriticallyStale: ageMs > CRITICAL_STALE_THRESHOLD_MS,
    lastUpdated,
    ageMs,
  };
}

async function tryAcquireSyncLock(db: Database): Promise<boolean> {
  const now = new Date();

  const [lockRow] = await db
    .select()
    .from(syncMeta)
    .where(eq(syncMeta.key, 'sync_in_progress'))
    .limit(1);

  if (lockRow?.value === 'true' && lockRow.updatedAt) {
    const lockAge = now.getTime() - lockRow.updatedAt.getTime();
    if (lockAge < SYNC_LOCK_DURATION_MS) {
      return false;
    }
  }

  await db
    .insert(syncMeta)
    .values({
      key: 'sync_in_progress',
      value: 'true',
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: syncMeta.key,
      set: { value: 'true', updatedAt: now },
    });

  return true;
}

async function releaseSyncLock(db: Database): Promise<void> {
  await db
    .update(syncMeta)
    .set({ value: 'false', updatedAt: new Date() })
    .where(eq(syncMeta.key, 'sync_in_progress'));
}

export async function ensureFreshModels(db: Database): Promise<boolean> {
  const freshness = await checkModelsFreshness(db);

  if (!freshness.isCriticallyStale) {
    return false;
  }

  const lockAcquired = await tryAcquireSyncLock(db);
  if (!lockAcquired) {
    return false;
  }

  try {
    await syncModels(db);
    return true;
  } finally {
    await releaseSyncLock(db);
  }
}

export interface TimelineModelData {
  errorRate: number;
  errorCount: number;
  totalCount: number;
}

export interface TimelinePoint {
  date: string;
  [modelId: string]: number | string | TimelineModelData;
}

function generateTimeBuckets(range: TimeRange): string[] {
  const now = new Date();
  const buckets: string[] = [];

  if (range === '15m') {
    for (let i = 14; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCSeconds(0, 0);
      d.setUTCMinutes(d.getUTCMinutes() - i);
      buckets.push(d.toISOString().replace('T', ' ').slice(0, 19));
    }
  } else if (range === '1h') {
    for (let i = 59; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCSeconds(0, 0);
      d.setUTCMinutes(d.getUTCMinutes() - i);
      buckets.push(d.toISOString().replace('T', ' ').slice(0, 19));
    }
  } else if (range === '6h') {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCMinutes(0, 0, 0);
      d.setUTCHours(d.getUTCHours() - i);
      buckets.push(d.toISOString().replace('T', ' ').slice(0, 19));
    }
  } else if (range === '24h') {
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCMinutes(0, 0, 0);
      d.setUTCHours(d.getUTCHours() - i);
      buckets.push(d.toISOString().replace('T', ' ').slice(0, 19));
    }
  } else if (range === '3d' || range === '7d') {
    const dayCount = range === '3d' ? 3 : 7;
    for (let i = dayCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - i);
      buckets.push(d.toISOString().replace('T', ' ').slice(0, 19));
    }
  } else {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - i);
      buckets.push(d.toISOString().replace('T', ' ').slice(0, 19));
    }
  }

  return buckets;
}

export async function getFeedbackTimeline(
  db: Database,
  range: TimeRange,
  userId?: string,
  statsDbUrl?: string,
  modelIds?: string[]
): Promise<TimelinePoint[]> {
  const windowMs = TIME_RANGE_MS[range];
  const truncUnit =
    range === '15m' || range === '1h'
      ? 'minute'
      : range === '6h' || range === '24h'
        ? 'hour'
        : 'day';
  const dateTrunc = sql.raw(`date_trunc('${truncUnit}', ${modelFeedback.createdAt.name})`);

  const normalizeModelId = (modelId: string) => modelId.replace(/:free$/, '');
  const modelIdMap = modelIds ? new Map(modelIds.map((id) => [normalizeModelId(id), id])) : null;
  const normalizeBucket = (bucket: string) =>
    bucket
      .replace('T', ' ')
      .replace(/([+-].*|Z)$/, '')
      .slice(0, 19);

  const bucketForRange = (bucket: string): string => {
    const d = new Date(bucket);
    if (range === '15m' || range === '1h') {
      d.setUTCSeconds(0, 0);
    } else if (range === '6h' || range === '24h') {
      d.setUTCMinutes(0, 0, 0);
    } else {
      d.setUTCHours(0, 0, 0, 0);
    }
    return d.toISOString().replace('T', ' ').slice(0, 19);
  };

  if (!userId && statsDbUrl) {
    const endTs = new Date();
    const startTs = windowMs !== null ? new Date(Date.now() - windowMs) : new Date(0);
    const rows = await getErrorTimelineStats(statsDbUrl, startTs, endTs);

    const dataMap: Record<string, Record<string, { errorCount: number; totalCount: number }>> = {};
    for (const row of rows) {
      const normalizedId = normalizeModelId(row.modelId);
      const targetModelId = modelIdMap?.get(normalizedId) ?? row.modelId;
      if (modelIdMap && !modelIdMap.has(normalizedId)) continue;

      const bucket = bucketForRange(row.bucket);
      if (!dataMap[bucket]) {
        dataMap[bucket] = {};
      }
      if (!dataMap[bucket][targetModelId]) {
        dataMap[bucket][targetModelId] = { errorCount: 0, totalCount: 0 };
      }
      dataMap[bucket][targetModelId].errorCount += row.errorCount;
      dataMap[bucket][targetModelId].totalCount += row.totalCount;
    }

    const allBuckets = Object.keys(dataMap).sort();
    return allBuckets.map((bucket) => {
      const point: Record<string, string | number | TimelineModelData> = { date: bucket };
      const bucketData = dataMap[bucket];
      for (const modelId in bucketData) {
        const { errorCount, totalCount } = bucketData[modelId];
        const errorRate = totalCount > 0 ? Math.round((errorCount / totalCount) * 10000) / 100 : 0;
        const obj = { errorRate, errorCount, totalCount };
        point[modelId] = obj;
        point[`${modelId}_meta`] = obj;
      }
      return point as TimelinePoint;
    });
  }

  const conditions: SQL<unknown>[] = [
    windowMs !== null ? gte(modelFeedback.createdAt, new Date(Date.now() - windowMs)) : undefined,
    userId ? eq(modelFeedback.source, userId) : undefined,
  ].filter((c): c is SQL<unknown> => Boolean(c));

  const results = await db
    .select({
      bucket: sql<string>`${dateTrunc}::text`,
      modelId: modelFeedback.modelId,
      errorCount: sql<number>`count(*) filter (where ${modelFeedback.isSuccess} = false)::int`,
      totalCount: sql<number>`count(*)::int`,
    })
    .from(modelFeedback)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(dateTrunc, modelFeedback.modelId)
    .orderBy(dateTrunc);

  const dataMap: Record<string, Record<string, { errorCount: number; totalCount: number }>> = {};
  for (const row of results) {
    const normalizedId = normalizeModelId(row.modelId);
    const targetModelId = modelIdMap?.get(normalizedId) ?? row.modelId;
    if (modelIdMap && !modelIdMap.has(normalizedId)) continue;

    if (!dataMap[row.bucket]) {
      dataMap[row.bucket] = {};
    }
    if (!dataMap[row.bucket][targetModelId]) {
      dataMap[row.bucket][targetModelId] = { errorCount: 0, totalCount: 0 };
    }
    dataMap[row.bucket][targetModelId].errorCount += row.errorCount;
    dataMap[row.bucket][targetModelId].totalCount += row.totalCount;
  }

  const allBuckets = generateTimeBuckets(range);
  const timeline: TimelinePoint[] = [];

  for (const bucket of allBuckets) {
    const point: TimelinePoint = { date: bucket };
    const bucketData = dataMap[bucket];
    if (bucketData) {
      for (const modelId in bucketData) {
        const { errorCount, totalCount } = bucketData[modelId];
        const errorRate = totalCount > 0 ? Math.round((errorCount / totalCount) * 10000) / 100 : 0;
        const obj = { errorRate, errorCount, totalCount };
        (point as Record<string, string | number | TimelineModelData>)[modelId] = obj;
        (point as Record<string, string | number | TimelineModelData>)[`${modelId}_meta`] = obj;
      }
    }
    timeline.push(point);
  }

  return timeline;
}

export interface AvailabilityData {
  modelId: string;
  modelName: string;
  isActive: boolean | null;
  modality: string | null;
  inputModalities: string[] | null;
  outputModalities: string[] | null;
  supportedParameters: string[] | null;
  contextLength: number | null;
  maxCompletionTokens: number | null;
  availability: Record<string, boolean>;
}

export interface AvailabilityFilterOptions {
  days?: number;
  useCases?: UseCaseType[];
  sort?: SortType;
}

export async function getModelAvailability(
  db: Database,
  options: AvailabilityFilterOptions = {}
): Promise<{ models: AvailabilityData[]; dates: string[] }> {
  const days = Math.min(options.days ?? 180, 180);
  const cutoffDate = new Date();
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - days);
  cutoffDate.setUTCHours(0, 0, 0, 0);

  const snapshots = await db
    .select({
      modelId: modelAvailabilitySnapshots.modelId,
      snapshotDate: modelAvailabilitySnapshots.snapshotDate,
      isAvailable: modelAvailabilitySnapshots.isAvailable,
    })
    .from(modelAvailabilitySnapshots)
    .where(gte(modelAvailabilitySnapshots.snapshotDate, cutoffDate));

  const models = await db
    .select({
      id: freeModels.id,
      name: freeModels.name,
      isActive: freeModels.isActive,
      modality: freeModels.modality,
      inputModalities: freeModels.inputModalities,
      outputModalities: freeModels.outputModalities,
      supportedParameters: freeModels.supportedParameters,
      contextLength: freeModels.contextLength,
      maxCompletionTokens: freeModels.maxCompletionTokens,
    })
    .from(freeModels);

  const availabilityMap: Record<string, Record<string, boolean>> = {};

  for (const snapshot of snapshots) {
    const dateStr = snapshot.snapshotDate.toISOString().split('T')[0];

    if (!availabilityMap[snapshot.modelId]) {
      availabilityMap[snapshot.modelId] = {};
    }
    availabilityMap[snapshot.modelId][dateStr] = snapshot.isAvailable;
  }

  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  const modelsWithAvailability = models.filter((model) => availabilityMap[model.id]);

  let result: AvailabilityData[] = modelsWithAvailability.map((model) => ({
    modelId: model.id,
    modelName: model.name,
    isActive: model.isActive,
    modality: model.modality,
    inputModalities: model.inputModalities,
    outputModalities: model.outputModalities,
    supportedParameters: model.supportedParameters,
    contextLength: model.contextLength,
    maxCompletionTokens: model.maxCompletionTokens,
    availability: availabilityMap[model.id] ?? {},
  }));

  if (options.useCases && options.useCases.length > 0) {
    result = filterModelsByUseCase(result, options.useCases);
  }

  if (options.sort) {
    result = sortModels(result, options.sort);
  }

  return { models: result, dates };
}

export async function getModelAvailabilityById(
  db: Database,
  modelId: string,
  days = 90
): Promise<{ dates: string[]; availability: Record<string, boolean> }> {
  const cutoffDate = new Date();
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - days);
  cutoffDate.setUTCHours(0, 0, 0, 0);

  const snapshots = await db
    .select({
      snapshotDate: modelAvailabilitySnapshots.snapshotDate,
      isAvailable: modelAvailabilitySnapshots.isAvailable,
    })
    .from(modelAvailabilitySnapshots)
    .where(
      and(
        eq(modelAvailabilitySnapshots.modelId, modelId),
        gte(modelAvailabilitySnapshots.snapshotDate, cutoffDate)
      )
    );

  const availability: Record<string, boolean> = {};
  for (const s of snapshots) {
    availability[s.snapshotDate.toISOString().split('T')[0]] = s.isAvailable;
  }

  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  return { dates, availability };
}

export interface ModelFeedbackSummary {
  errorRate: number;
  successCount: number;
  rateLimited: number;
  unavailable: number;
  error: number;
}

export async function getModelById(db: Database, modelId: string) {
  const rows = await db.select().from(freeModels).where(eq(freeModels.id, modelId)).limit(1);

  return rows[0] ?? null;
}

export async function getRelatedModels(db: Database, model: { id: string }, limit = 5) {
  const provider = model.id.split('/')[0];
  if (!provider) return [];

  const likePattern = `${provider}/%`;
  return db
    .select({
      id: freeModels.id,
      name: freeModels.name,
      contextLength: freeModels.contextLength,
      maxCompletionTokens: freeModels.maxCompletionTokens,
      modality: freeModels.modality,
      inputModalities: freeModels.inputModalities,
      supportedParameters: freeModels.supportedParameters,
    })
    .from(freeModels)
    .where(
      and(
        eq(freeModels.isActive, true),
        sql`${freeModels.id} LIKE ${likePattern}`,
        sql`${freeModels.id} != ${model.id}`
      )
    )
    .limit(limit);
}

export async function getSimilarModels(
  db: Database,
  model: {
    id: string;
    inputModalities?: string[] | null;
    supportedParameters?: string[] | null;
    contextLength?: number | null;
  },
  limit = 5
) {
  const provider = model.id.split('/')[0];

  const conditions: SQL<unknown>[] = [
    eq(freeModels.isActive, true),
    sql`${freeModels.id} != ${model.id}`,
  ];

  if (provider) {
    conditions.push(sql`${freeModels.id} NOT LIKE ${`${provider}/%`}`);
  }

  const scoreParts: string[] = [];

  if (model.inputModalities?.includes('image')) {
    scoreParts.push(
      `CASE WHEN 'image' = ANY(${freeModels.inputModalities.name}) THEN 1 ELSE 0 END`
    );
  }
  if (model.supportedParameters?.includes('tools')) {
    scoreParts.push(
      `CASE WHEN 'tools' = ANY(${freeModels.supportedParameters.name}) THEN 1 ELSE 0 END`
    );
  }
  if (
    model.supportedParameters?.includes('reasoning') ||
    model.supportedParameters?.includes('include_reasoning')
  ) {
    scoreParts.push(
      `CASE WHEN 'reasoning' = ANY(${freeModels.supportedParameters.name}) OR 'include_reasoning' = ANY(${freeModels.supportedParameters.name}) THEN 1 ELSE 0 END`
    );
  }
  if ((model.contextLength ?? 0) >= 100000) {
    scoreParts.push(`CASE WHEN ${freeModels.contextLength.name} >= 100000 THEN 1 ELSE 0 END`);
  }

  if (scoreParts.length === 0) return [];

  const scoreExpr = sql.raw(`(${scoreParts.join(' + ')})`);

  return db
    .select({
      id: freeModels.id,
      name: freeModels.name,
      contextLength: freeModels.contextLength,
      maxCompletionTokens: freeModels.maxCompletionTokens,
      modality: freeModels.modality,
      inputModalities: freeModels.inputModalities,
      supportedParameters: freeModels.supportedParameters,
    })
    .from(freeModels)
    .where(and(...conditions))
    .orderBy(sql`${scoreExpr} DESC`)
    .limit(limit);
}

export async function getModelFeedbackById(
  db: Database,
  modelId: string,
  windowMs: number = 7 * 24 * 60 * 60 * 1000
): Promise<ModelFeedbackSummary | null> {
  const cutoff = new Date(Date.now() - windowMs);

  const results = await db
    .select({
      issue: modelFeedback.issue,
      isSuccess: modelFeedback.isSuccess,
      count: sql<number>`count(*)::int`,
    })
    .from(modelFeedback)
    .where(and(eq(modelFeedback.modelId, modelId), gte(modelFeedback.createdAt, cutoff)))
    .groupBy(modelFeedback.issue, modelFeedback.isSuccess);

  if (results.length === 0) return null;

  const summary: ModelFeedbackSummary = {
    errorRate: 0,
    successCount: 0,
    rateLimited: 0,
    unavailable: 0,
    error: 0,
  };

  for (const row of results) {
    if (row.isSuccess) {
      summary.successCount += row.count;
    } else if (row.issue === 'rate_limited') {
      summary.rateLimited += row.count;
    } else if (row.issue === 'unavailable') {
      summary.unavailable += row.count;
    } else if (row.issue === 'error') {
      summary.error += row.count;
    }
  }

  const errorCount = summary.rateLimited + summary.unavailable + summary.error;
  const total = summary.successCount + errorCount;
  summary.errorRate = total > 0 ? Math.round((errorCount / total) * 10000) / 100 : 0;

  return summary;
}

export async function getModelsByProvider(db: Database, provider: string) {
  const likePattern = `${provider}/%`;
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
    .where(and(eq(freeModels.isActive, true), sql`${freeModels.id} LIKE ${likePattern}`));
}

export async function getProviderAvailability(db: Database, provider: string, days = 90) {
  const likePattern = `${provider}/%`;
  const cutoffDate = new Date();
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - days);
  cutoffDate.setUTCHours(0, 0, 0, 0);

  const snapshots = await db
    .select({
      modelId: modelAvailabilitySnapshots.modelId,
      snapshotDate: modelAvailabilitySnapshots.snapshotDate,
      isAvailable: modelAvailabilitySnapshots.isAvailable,
    })
    .from(modelAvailabilitySnapshots)
    .where(
      and(
        sql`${modelAvailabilitySnapshots.modelId} LIKE ${likePattern}`,
        gte(modelAvailabilitySnapshots.snapshotDate, cutoffDate)
      )
    );

  const models = await db
    .select({
      id: freeModels.id,
      name: freeModels.name,
      modality: freeModels.modality,
      inputModalities: freeModels.inputModalities,
      outputModalities: freeModels.outputModalities,
      supportedParameters: freeModels.supportedParameters,
      isActive: freeModels.isActive,
      contextLength: freeModels.contextLength,
      maxCompletionTokens: freeModels.maxCompletionTokens,
    })
    .from(freeModels)
    .where(sql`${freeModels.id} LIKE ${likePattern}`);

  const availabilityMap: Record<string, Record<string, boolean>> = {};
  for (const s of snapshots) {
    const dateStr = s.snapshotDate.toISOString().split('T')[0];
    if (!availabilityMap[s.modelId]) availabilityMap[s.modelId] = {};
    availabilityMap[s.modelId][dateStr] = s.isAvailable;
  }

  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  const modelMap = new Map(models.map((m) => [m.id, m]));
  const result = Object.entries(availabilityMap)
    .filter(([modelId]) => modelMap.has(modelId))
    .map(([modelId, availability]) => {
      const m = modelMap.get(modelId)!;
      return {
        modelId: m.id,
        modelName: m.name,
        modality: m.modality,
        inputModalities: m.inputModalities,
        outputModalities: m.outputModalities,
        supportedParameters: m.supportedParameters,
        isActive: m.isActive,
        contextLength: m.contextLength,
        maxCompletionTokens: m.maxCompletionTokens,
        availability,
      };
    });

  return { models: result, dates };
}

export async function getDistinctProviders(db: Database): Promise<string[]> {
  const rows = await db
    .selectDistinct({
      id: freeModels.id,
    })
    .from(freeModels)
    .where(eq(freeModels.isActive, true));

  const providers = new Set<string>();
  for (const row of rows) {
    const p = row.id.split('/')[0];
    if (p) providers.add(p);
  }

  return [...providers].sort();
}
