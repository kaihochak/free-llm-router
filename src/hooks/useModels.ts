import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
// Re-export from code-examples (single source of truth for all code snippets)
import { FREE_MODELS_SDK as FREE_MODELS_FILE } from '@/lib/code-examples/index';
import { useLocalStorage } from './useLocalStorage';
import {
  type FilterType as ApiFilterType,
  type SortType as ApiSortType,
  FILTER_DEFINITIONS,
  SORT_DEFINITIONS,
  filterModels,
  sortModels,
} from '@/lib/model-types';

export interface Model {
  id: string;
  name: string;
  contextLength: number | null;
  maxCompletionTokens: number | null;
  description: string | null;
  modality: string | null;
  inputModalities: string[] | null;
  outputModalities: string[] | null;
  supportedParameters: string[] | null;
  isModerated: boolean | null;
  createdAt?: string | null;
  issueCount?: number;
}

interface FeedbackCounts {
  [modelId: string]: {
    rateLimited: number;
    unavailable: number;
    error: number;
  };
}

interface ApiResponse {
  models: Omit<Model, 'issueCount'>[];
  feedbackCounts: FeedbackCounts;
  lastUpdated?: string;
}

// Use shared types from model-types.ts (single source of truth)
export type FilterType = ApiFilterType;
export type SortType = ApiSortType;

// Re-export filter and sort definitions for UI components
export const FILTERS = FILTER_DEFINITIONS;
export const SORT_OPTIONS = SORT_DEFINITIONS;

const API_BASE = 'https://free-models-api.pages.dev';

export const modelKeys = {
  all: ['models'] as const,
  count: () => [...modelKeys.all, 'count'] as const,
};

// Build API URL for the code snippet (what users will copy)
function buildApiUrl(filters: FilterType[], sort: SortType): string {
  const params = new URLSearchParams();
  if (filters.length > 0) params.set('filter', filters.join(','));
  params.set('sort', sort); // Always include sort
  return `/api/v1/models/ids?${params.toString()}`;
}

interface ModelsResponse {
  models: Model[];
  lastUpdated: string | null;
}

async function fetchAllModels(): Promise<ModelsResponse> {
  const response = await fetch('/api/demo/models');
  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }
  const data: ApiResponse = await response.json();

  // Attach issue counts to each model
  const models = data.models.map((model) => {
    const feedback = data.feedbackCounts[model.id];
    const issueCount = feedback
      ? feedback.rateLimited + feedback.unavailable + feedback.error
      : 0;
    return { ...model, issueCount };
  });

  return {
    models,
    lastUpdated: data.lastUpdated ?? null,
  };
}

// filterModels and sortModels are imported from @/lib/model-types (single source of truth)

// FREE_MODELS_FILE is imported from /public/free-models.ts at build time (see top of file)
// This ensures users always get the latest SDK with caching built-in
export { FREE_MODELS_FILE };

export function generateSnippet(_apiUrl?: string): string {
  return FREE_MODELS_FILE;
}

export function getFullApiUrl(apiUrl: string): string {
  return `${API_BASE}${apiUrl}`;
}

export function useModels() {
  const [activeFilters, setActiveFilters] = useLocalStorage<FilterType[]>('freeModels:filters', []);
  const [activeSort, setActiveSort] = useLocalStorage<SortType>('freeModels:sort', 'contextLength');
  const [activeLimit, setActiveLimit] = useLocalStorage<number | undefined>('freeModels:limit', 5);

  // Fetch all models once
  const {
    data: modelsResponse = { models: [], lastUpdated: null },
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: modelKeys.all,
    queryFn: fetchAllModels,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter and sort on frontend
  const models = useMemo(() => {
    const filtered = filterModels(modelsResponse.models, activeFilters);
    return sortModels(filtered, activeSort);
  }, [modelsResponse.models, activeFilters, activeSort]);

  // API URL for the code snippet (reflects current filters/sort)
  const apiUrl = useMemo(() => buildApiUrl(activeFilters, activeSort), [activeFilters, activeSort]);

  const toggleFilter = (filter: FilterType | 'all') => {
    if (filter === 'all') {
      setActiveFilters([]);
    } else {
      const newFilters = activeFilters.includes(filter)
        ? activeFilters.filter((f) => f !== filter)
        : [...activeFilters, filter];
      setActiveFilters(newFilters);
    }
  };

  return {
    models,
    loading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    activeFilters,
    activeSort,
    activeLimit,
    lastUpdated: modelsResponse.lastUpdated,
    apiUrl,
    setActiveSort,
    setActiveLimit,
    toggleFilter,
  };
}
