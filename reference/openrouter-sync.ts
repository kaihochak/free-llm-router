/**
 * REFERENCE FILE - Adapted from CourseRater
 *
 * This file shows the sync logic pattern. Adapt for Drizzle + Neon.
 * Original uses Supabase - replace with Drizzle ORM calls.
 */

/**
 * OpenRouter API model structure
 */
interface OpenRouterApiModel {
  id: string;
  name: string;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  context_length?: number;
  description?: string;
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  totalApiModels: number;
  freeModelsFound: number;
  inserted: number;
  updated: number;
  markedInactive: number;
  newModels: string[];
  inactiveModels: string[];
  error?: string;
}

/**
 * Check if a model is free (pricing.prompt = 0 AND pricing.completion = 0)
 * Uses numeric comparison to handle "0", "0.0", etc.
 */
function isFreeModel(model: OpenRouterApiModel): boolean {
  const promptCost = parseFloat(model.pricing?.prompt || '999');
  const completionCost = parseFloat(model.pricing?.completion || '999');
  return promptCost === 0 && completionCost === 0;
}

/**
 * Fetch free models from OpenRouter API
 *
 * This is the core logic to adapt - fetches from OpenRouter and filters for free models
 */
export async function fetchFreeModels(): Promise<OpenRouterApiModel[]> {
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

  // Filter for free models only
  return allModels.filter(isFreeModel);
}

/**
 * Sync OpenRouter free models to database
 *
 * ADAPT THIS: Replace upsertModelsFromSync and markMissingModelsInactive
 * with Drizzle equivalents
 */
export async function syncOpenRouterModels(): Promise<SyncResult> {
  const result: SyncResult = {
    totalApiModels: 0,
    freeModelsFound: 0,
    inserted: 0,
    updated: 0,
    markedInactive: 0,
    newModels: [],
    inactiveModels: [],
  };

  try {
    // 1. Fetch models from OpenRouter API
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
    result.totalApiModels = allModels.length;

    // 2. Filter for free models
    const freeModels = allModels.filter(isFreeModel);
    result.freeModelsFound = freeModels.length;

    // 3. Prepare models for upsert
    const modelsToSync = freeModels.map((model) => ({
      id: model.id,
      name: model.name,
      context_length: model.context_length,
      description: model.description,
    }));

    // 4. TODO: Upsert to database using Drizzle
    // Example Drizzle pattern:
    // for (const model of modelsToSync) {
    //   await db
    //     .insert(freeModels)
    //     .values({ ...model, lastSeenAt: new Date() })
    //     .onConflictDoUpdate({
    //       target: freeModels.id,
    //       set: { name: model.name, contextLength: model.context_length, lastSeenAt: new Date() },
    //     });
    // }

    // 5. TODO: Mark missing models as inactive
    // Safety check: only deactivate if we received at least 50% of known models

    return result;
  } catch (error) {
    console.error('[OpenRouterSync] Sync failed:', error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}
