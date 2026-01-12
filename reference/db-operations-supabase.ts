/**
 * REFERENCE FILE - From CourseRater (Supabase version)
 *
 * This shows the database operations pattern using Supabase.
 * Adapt to Drizzle + Neon for free-LLM-router.
 *
 * Key operations to implement:
 * 1. getActiveModels() - Get list of active model IDs
 * 2. upsertModelsFromSync() - Upsert models preserving status
 * 3. markMissingModelsInactive() - Mark models not in API as inactive
 */

/**
 * Model stored in database
 */
export interface FreeModel {
  id: string;                    // Primary key (model ID from OpenRouter)
  name: string;
  context_length: number | null;
  description: string | null;
  priority: number;
  is_active: boolean;
  last_seen_at: Date;
  created_at: Date;
}

// ============================================================================
// DRIZZLE EQUIVALENTS (what you'll implement)
// ============================================================================

/**
 * Drizzle schema example:
 *
 * export const freeModels = pgTable('free_models', {
 *   id: text('id').primaryKey(),
 *   name: text('name').notNull(),
 *   contextLength: integer('context_length'),
 *   description: text('description'),
 *   priority: integer('priority').default(100),
 *   isActive: boolean('is_active').default(true),
 *   lastSeenAt: timestamp('last_seen_at').defaultNow(),
 *   createdAt: timestamp('created_at').defaultNow(),
 * });
 */

/**
 * Get active models (Drizzle version):
 *
 * export async function getActiveModels(): Promise<string[]> {
 *   const models = await db
 *     .select({ id: freeModels.id })
 *     .from(freeModels)
 *     .where(eq(freeModels.isActive, true))
 *     .orderBy(freeModels.priority);
 *
 *   return models.map(m => m.id);
 * }
 */

/**
 * Upsert models (Drizzle version):
 *
 * export async function upsertModels(models: { id: string; name: string; contextLength?: number }[]) {
 *   for (const model of models) {
 *     await db
 *       .insert(freeModels)
 *       .values({
 *         id: model.id,
 *         name: model.name,
 *         contextLength: model.contextLength,
 *         lastSeenAt: new Date(),
 *       })
 *       .onConflictDoUpdate({
 *         target: freeModels.id,
 *         set: {
 *           name: model.name,
 *           contextLength: model.contextLength,
 *           lastSeenAt: new Date(),
 *         },
 *       });
 *   }
 * }
 */

/**
 * Mark missing models inactive (Drizzle version):
 *
 * export async function markMissingModelsInactive(seenIds: string[]) {
 *   await db
 *     .update(freeModels)
 *     .set({ isActive: false })
 *     .where(
 *       and(
 *         eq(freeModels.isActive, true),
 *         notInArray(freeModels.id, seenIds)
 *       )
 *     );
 * }
 */

// ============================================================================
// ORIGINAL SUPABASE VERSION (for reference)
// ============================================================================

/*
import { createRawServiceRoleClient } from '@/utils/supabase/server';

export async function getActiveModels(): Promise<string[]> {
  const supabase = await createRawServiceRoleClient();

  const { data, error } = await supabase
    .from('openrouter_models')
    .select('model_id')
    .eq('status', 'active')
    .order('priority', { ascending: true });

  if (error) {
    console.error('[OpenRouterModels] Error fetching active models:', error);
    return [];
  }

  return (data || []).map((row) => row.model_id);
}

export async function upsertModelsFromSync(
  models: ModelSyncData[]
): Promise<{ inserted: number; updated: number; newModels: string[] }> {
  const supabase = await createRawServiceRoleClient();

  if (models.length === 0) {
    return { inserted: 0, updated: 0, newModels: [] };
  }

  // First, get all existing model_ids to determine which are new
  const { data: existingModels, error: fetchError } = await supabase
    .from('openrouter_models')
    .select('model_id');

  const existingModelIds = new Set((existingModels || []).map((m) => m.model_id));
  const newModels = fetchError
    ? []
    : models.filter((m) => !existingModelIds.has(m.model_id)).map((m) => m.model_id);

  const now = new Date().toISOString();

  // Bulk upsert
  const { error } = await supabase.from('openrouter_models').upsert(
    models.map((model) => ({
      model_id: model.model_id,
      name: model.name,
      context_length: model.context_length ?? null,
      description: model.description ?? null,
      last_seen_at: now,
      updated_at: now,
    })),
    {
      onConflict: 'model_id',
      ignoreDuplicates: false,
    }
  );

  if (error) {
    console.error('[OpenRouterModels] Bulk upsert error:', error);
    return { inserted: 0, updated: 0, newModels: [] };
  }

  return {
    inserted: newModels.length,
    updated: models.length - newModels.length,
    newModels,
  };
}
*/
