import { pgTable, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const freeModels = pgTable('free_models', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  contextLength: integer('context_length'),
  maxCompletionTokens: integer('max_completion_tokens'),
  description: text('description'),
  modality: text('modality'), // e.g., "text->text", "text+image->text"
  inputModalities: text('input_modalities').array(), // e.g., ["text", "image"]
  outputModalities: text('output_modalities').array(), // e.g., ["text"]
  supportedParameters: text('supported_parameters').array(), // e.g., ["tools", "reasoning"]
  isModerated: boolean('is_moderated'),
  priority: integer('priority').default(100),
  isActive: boolean('is_active').default(true),
  lastSeenAt: timestamp('last_seen_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const modelFeedback = pgTable('model_feedback', {
  id: text('id').primaryKey(),
  modelId: text('model_id').notNull(),
  issue: text('issue').notNull(), // 'rate_limited' | 'unavailable' | 'error'
  details: text('details'),
  source: text('source'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const syncMeta = pgTable('sync_meta', {
  key: text('key').primaryKey(),
  value: text('value'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type FreeModel = typeof freeModels.$inferSelect;
export type NewFreeModel = typeof freeModels.$inferInsert;
export type ModelFeedback = typeof modelFeedback.$inferSelect;
export type NewModelFeedback = typeof modelFeedback.$inferInsert;
