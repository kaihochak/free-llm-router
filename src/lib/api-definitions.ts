/**
 * Single source of truth for all API parameter definitions.
 * All UI components, documentation, and examples import from this file.
 *
 * Separates parameter DEFINITIONS (this file) from business logic (model-types.ts)
 */

// ==================== FILTER PARAMETER ====================

export type FilterType = 'chat' | 'vision' | 'tools' | 'longContext' | 'reasoning';

export const VALID_FILTERS: FilterType[] = ['chat', 'vision', 'tools', 'longContext', 'reasoning'];

export interface FilterDefinition {
  key: FilterType | 'all';
  label: string;
  description: string;
  docDescription?: string; // For detailed documentation
}

export const FILTER_DEFINITIONS: FilterDefinition[] = [
  {
    key: 'all',
    label: 'All',
    description: 'Show all available free models',
    docDescription: 'All available free models without filtering'
  },
  {
    key: 'chat',
    label: 'Chat',
    description: 'Models optimized for conversation',
    docDescription: 'Text-to-text models optimized for conversation'
  },
  {
    key: 'vision',
    label: 'Vision',
    description: 'Models that can analyze images',
    docDescription: 'Models that accept image inputs'
  },
  {
    key: 'tools',
    label: 'Tools',
    description: 'Models that support function/tool calling',
    docDescription: 'Models that support function/tool calling'
  },
  {
    key: 'longContext',
    label: 'Long Context',
    description: 'Models with 100k+ token context windows',
    docDescription: 'Models with 100k+ token context windows'
  },
  {
    key: 'reasoning',
    label: 'Reasoning',
    description: 'Models with advanced reasoning capabilities',
    docDescription: 'Models with advanced reasoning capabilities (e.g., o1, QwQ, DeepSeek R1)'
  },
];

// ==================== SORT PARAMETER ====================

export type SortType = 'contextLength' | 'maxOutput' | 'capable' | 'leastIssues' | 'newest';

export const VALID_SORTS: SortType[] = ['contextLength', 'maxOutput', 'capable', 'leastIssues', 'newest'];

export interface SortDefinition {
  key: SortType;
  label: string;
  description: string;
  docDescription?: string;
}

export const SORT_DEFINITIONS: SortDefinition[] = [
  {
    key: 'contextLength',
    label: 'Context Length',
    description: 'Sort by maximum input tokens',
    docDescription: 'Largest context window first - best for long documents'
  },
  {
    key: 'maxOutput',
    label: 'Max Output',
    description: 'Sort by maximum output tokens',
    docDescription: 'Highest output token limit first - best for long-form generation'
  },
  {
    key: 'capable',
    label: 'Most Capable',
    description: 'Sort by most supported features',
    docDescription: 'Most supported features first - good default'
  },
  {
    key: 'leastIssues',
    label: 'Least Reported Issues',
    description: 'Sort by fewest reported issues',
    docDescription: 'Fewest user-reported issues first - best for stability'
  },
  {
    key: 'newest',
    label: 'Newest First',
    description: 'Sort by when model was added',
    docDescription: 'Most recently added models first - best for trying new models'
  },
];

// ==================== TIME WINDOW PARAMETER ====================

export type TimeRange = '15m' | '30m' | '1h' | '6h' | '24h' | '7d' | '30d' | 'all';

export const VALID_TIME_WINDOWS: TimeRange[] = ['15m', '30m', '1h', '6h', '24h', '7d', '30d', 'all'];

// Time windows with labels (for UI display - used in useIssues.ts)
export const VALID_TIME_WINDOWS_WITH_LABELS: TimeRange[] = ['15m', '30m', '1h', '6h', '24h', '7d', '30d'];

export interface TimeWindowDefinition {
  value: TimeRange;
  label: string;
  useCase: string;
}

export const TIME_WINDOW_DEFINITIONS: TimeWindowDefinition[] = [
  { value: '15m', label: '15m', useCase: 'Real-time incident detection' },
  { value: '30m', label: '30m', useCase: 'Short-term monitoring' },
  { value: '1h', label: '1h', useCase: 'Hourly trends' },
  { value: '6h', label: '6h', useCase: 'Short-term trending' },
  { value: '24h', label: '24h', useCase: 'Daily reliability (recommended)' },
  { value: '7d', label: '7d', useCase: 'Weekly patterns' },
  { value: '30d', label: '30d', useCase: 'Long-term stability' },
  { value: 'all', label: 'All', useCase: 'Complete history (all-time)' },
];

// Time range to milliseconds conversion
// 'all' maps to null to indicate no time limit (fetch all data)
export const TIME_RANGE_MS: Record<TimeRange, number | null> = {
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  'all': null,
};

// ==================== LIMIT PARAMETER ====================

export type LimitOption = 3 | 5 | 10 | undefined;

export interface LimitDefinition {
  value: string; // "3", "5", "10", "all"
  label: string;
  numeric: number | undefined; // 3, 5, 10, undefined
}

export const LIMIT_DEFINITIONS: LimitDefinition[] = [
  { value: '3', label: '3', numeric: 3 },
  { value: '5', label: '5', numeric: 5 },
  { value: '10', label: '10', numeric: 10 },
  { value: 'all', label: 'All', numeric: undefined },
];

export const LIMIT_MIN = 1;
export const LIMIT_MAX = 100;

// ==================== EXCLUDE WITH ISSUES PARAMETER ====================

export type ExcludeWithIssuesOption = 0 | 3 | 5 | 10;

export interface ExcludeWithIssuesDefinition {
  value: string;
  label: string;
  numeric: number;
}

export const EXCLUDE_WITH_ISSUES_DEFINITIONS: ExcludeWithIssuesDefinition[] = [
  { value: '0', label: 'All', numeric: 0 },
  { value: '3', label: '3', numeric: 3 },
  { value: '5', label: '5', numeric: 5 },
  { value: '10', label: '10', numeric: 10 },
];

// ==================== DEFAULT VALUES ====================

export const DEFAULT_FILTER: FilterType[] = [];
export const DEFAULT_SORT: SortType = 'contextLength';
export const DEFAULT_LIMIT: number = 5;
export const DEFAULT_EXCLUDE_WITH_ISSUES: number = 5;
export const DEFAULT_TIME_WINDOW: TimeRange = '15m';
export const DEFAULT_USER_ONLY: boolean = false;

// ==================== VALIDATION UTILITIES ====================

export function validateFilters(value: string | null): FilterType[] {
  if (!value) return [];
  const filters = value.split(',').map((f) => f.trim());
  return filters.filter((f) => VALID_FILTERS.includes(f as FilterType)) as FilterType[];
}

export function validateSort(value: string | null): SortType {
  if (value && VALID_SORTS.includes(value as SortType)) {
    return value as SortType;
  }
  return DEFAULT_SORT;
}

export function validateTimeWindow(value: string | null): TimeRange {
  if (value && VALID_TIME_WINDOWS.includes(value as TimeRange)) {
    return value as TimeRange;
  }
  return DEFAULT_TIME_WINDOW;
}

export function validateLimit(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return undefined;
  return Math.min(Math.max(LIMIT_MIN, parsed), LIMIT_MAX);
}

export function validateExcludeWithIssues(value: string | null): number {
  if (value === null) return DEFAULT_EXCLUDE_WITH_ISSUES;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return DEFAULT_EXCLUDE_WITH_ISSUES;
  return Math.max(0, parsed);
}

// ==================== HELPER UTILITIES ====================

/** Convert TimeRange to cutoff Date */
export function getCutoffDate(range: TimeRange): Date {
  if (range === 'all') return new Date(0);
  const ms = TIME_RANGE_MS[range];
  return new Date(Date.now() - (ms as number));
}
