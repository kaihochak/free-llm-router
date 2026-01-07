/**
 * Shared types and logic for model filtering and sorting.
 * Single source of truth for both frontend and backend.
 */

// Filter types supported by the API
export type FilterType = 'chat' | 'vision' | 'coding' | 'longContext' | 'reasoning';

// Sort types supported by the API
export type SortType = 'contextLength' | 'maxOutput' | 'capable' | 'leastIssues' | 'newest';

// Valid filter values (for runtime validation)
export const VALID_FILTERS: FilterType[] = ['chat', 'vision', 'coding', 'longContext', 'reasoning'];

// Valid sort values (for runtime validation)
export const VALID_SORTS: SortType[] = ['contextLength', 'maxOutput', 'capable', 'leastIssues', 'newest'];

// Filter definitions with labels and descriptions (for UI)
export const FILTER_DEFINITIONS: { key: FilterType | 'all'; label: string; description: string }[] = [
  { key: 'all', label: 'All', description: 'Show all available free models' },
  { key: 'chat', label: 'Chat', description: 'Models optimized for conversation' },
  { key: 'vision', label: 'Vision', description: 'Models that can analyze images' },
  { key: 'coding', label: 'Tools', description: 'Models that support function/tool calling' },
  { key: 'longContext', label: 'Long Context', description: 'Models with 100k+ token context windows' },
  { key: 'reasoning', label: 'Reasoning', description: 'Models with advanced reasoning capabilities' },
];

// Sort definitions with labels and descriptions (for UI)
export const SORT_DEFINITIONS: { key: SortType; label: string; description: string }[] = [
  { key: 'contextLength', label: 'Context Length', description: 'Sort by maximum input tokens' },
  { key: 'maxOutput', label: 'Max Output', description: 'Sort by maximum output tokens' },
  { key: 'capable', label: 'Most Capable', description: 'Sort by most supported features' },
  { key: 'leastIssues', label: 'Least Reported Issues', description: 'Sort by fewest reported issues' },
  { key: 'newest', label: 'Newest First', description: 'Sort by when model was added' },
];

// Validation helpers
export function validateFilters(value: string | null): FilterType[] {
  if (!value) return [];
  const filters = value.split(',').map((f) => f.trim());
  return filters.filter((f) => VALID_FILTERS.includes(f as FilterType)) as FilterType[];
}

export function validateSort(value: string | null): SortType {
  if (value && VALID_SORTS.includes(value as SortType)) {
    return value as SortType;
  }
  return 'contextLength';
}

/**
 * Filter criteria constants - defines what each filter checks.
 * Used by both frontend (JS) and backend (SQL) implementations.
 */
export const FILTER_CRITERIA = {
  chat: {
    // Check modality is text->text OR outputModalities includes 'text'
    field: 'modality',
    value: 'text->text',
    altField: 'outputModalities',
    altIncludes: 'text',
  },
  vision: {
    // Check inputModalities includes 'image'
    field: 'inputModalities',
    includes: 'image',
  },
  coding: {
    // Check supportedParameters includes 'tools'
    field: 'supportedParameters',
    includes: 'tools',
  },
  longContext: {
    // Check contextLength >= 100000
    field: 'contextLength',
    gte: 100000,
  },
  reasoning: {
    // Check supportedParameters includes 'reasoning' OR 'include_reasoning'
    field: 'supportedParameters',
    includesAny: ['reasoning', 'include_reasoning'],
  },
} as const;

/**
 * Sort criteria constants - defines what each sort orders by.
 * Used by both frontend (JS) and backend (SQL) implementations.
 */
export const SORT_CRITERIA = {
  contextLength: { field: 'contextLength', direction: 'desc' },
  maxOutput: { field: 'maxCompletionTokens', direction: 'desc' },
  capable: { field: 'supportedParameters', aggregation: 'length', direction: 'desc' },
  leastIssues: { field: 'issueCount', direction: 'asc' },
  newest: { field: 'createdAt', direction: 'desc' },
} as const;

// Common model interface for filtering/sorting (subset of full model)
export interface FilterableModel {
  modality: string | null;
  inputModalities: string[] | null;
  outputModalities: string[] | null;
  supportedParameters: string[] | null;
  contextLength: number | null;
  maxCompletionTokens: number | null;
  createdAt?: string | Date | null;
  issueCount?: number;
}

/**
 * Check if a model matches a single filter criteria.
 * Single source of truth for filter logic - used by frontend.
 */
export function matchesFilter<T extends FilterableModel>(model: T, filter: FilterType): boolean {
  switch (filter) {
    case 'chat':
      return model.modality === 'text->text' || (model.outputModalities?.includes('text') ?? false);
    case 'vision':
      return model.inputModalities?.includes('image') ?? false;
    case 'coding':
      return model.supportedParameters?.includes('tools') ?? false;
    case 'longContext':
      return model.contextLength !== null && model.contextLength >= 100000;
    case 'reasoning':
      return (
        (model.supportedParameters?.includes('reasoning') ||
          model.supportedParameters?.includes('include_reasoning')) ??
        false
      );
    default:
      return true;
  }
}

/**
 * Filter models by multiple criteria (AND logic).
 * Single source of truth for filtering - used by frontend.
 */
export function filterModels<T extends FilterableModel>(models: T[], filters: FilterType[]): T[] {
  if (filters.length === 0) return models;
  return models.filter((model) => filters.every((filter) => matchesFilter(model, filter)));
}

/**
 * Get sort value for a model based on sort type.
 * Single source of truth for sort logic - used by frontend.
 */
export function getSortValue<T extends FilterableModel>(model: T, sort: SortType): number {
  switch (sort) {
    case 'contextLength':
      return model.contextLength ?? 0;
    case 'maxOutput':
      return model.maxCompletionTokens ?? 0;
    case 'capable':
      return model.supportedParameters?.length ?? 0;
    case 'leastIssues':
      return model.issueCount ?? 0;
    case 'newest':
      return model.createdAt ? new Date(model.createdAt).getTime() : 0;
    default:
      return 0;
  }
}

/**
 * Sort models by criteria.
 * Single source of truth for sorting - used by frontend.
 */
export function sortModels<T extends FilterableModel>(models: T[], sort: SortType): T[] {
  const sorted = [...models];
  const direction = SORT_CRITERIA[sort].direction;

  return sorted.sort((a, b) => {
    const valueA = getSortValue(a, sort);
    const valueB = getSortValue(b, sort);
    return direction === 'desc' ? valueB - valueA : valueA - valueB;
  });
}
