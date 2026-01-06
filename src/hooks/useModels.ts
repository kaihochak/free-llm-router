import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
// Re-export from code-examples (single source of truth for all code snippets)
import { FREE_MODELS_SDK as FREE_MODELS_FILE } from '@/lib/code-examples/index';
import { useLocalStorage } from './useLocalStorage';

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

export type FilterType = 'chat' | 'vision' | 'tools' | 'longContext' | 'reasoning';
export type SortType = 'contextLength' | 'maxOutput' | 'capable' | 'leastIssues' | 'reliable' | 'newest';

export const FILTERS: { key: FilterType | 'all'; label: string; description: string }[] = [
  { key: 'all', label: 'All', description: 'Show all available free models' },
  { key: 'chat', label: 'Chat', description: 'Models optimized for conversation' },
  { key: 'vision', label: 'Vision', description: 'Models that can analyze images' },
  { key: 'tools', label: 'Tools', description: 'Models that support function/tool calling' },
  { key: 'longContext', label: 'Long Context', description: 'Models with 100k+ token context windows' },
  { key: 'reasoning', label: 'Reasoning', description: 'Models with advanced reasoning capabilities' },
];

export const SORT_OPTIONS: { key: SortType; label: string; description: string }[] = [
  { key: 'contextLength', label: 'Context Length', description: 'Sort by maximum input tokens' },
  { key: 'maxOutput', label: 'Max Output', description: 'Sort by maximum output tokens' },
  { key: 'capable', label: 'Most Capable', description: 'Sort by overall model capability' },
  { key: 'leastIssues', label: 'Least Reported Issues', description: 'Sort by fewest reported issues' },
  { key: 'reliable', label: 'Most Reliable', description: 'Balanced score of capability and low issues' },
  { key: 'newest', label: 'Newest First', description: 'Sort by when model was added' },
];

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

// Frontend filtering logic
function filterModels(models: Model[], filters: FilterType[]): Model[] {
  if (filters.length === 0) return models;

  return models.filter((model) => {
    return filters.every((filter) => {
      switch (filter) {
        case 'chat':
          return model.modality === 'text->text' || model.outputModalities?.includes('text');
        case 'vision':
          return model.inputModalities?.includes('image');
        case 'tools':
          return model.supportedParameters?.includes('tools') ?? false;
        case 'longContext':
          return model.contextLength !== null && model.contextLength >= 100000;
        case 'reasoning':
          // Check for reasoning capability via supported parameters
          return (
            model.supportedParameters?.includes('reasoning') ||
            model.supportedParameters?.includes('include_reasoning')
          ) ?? false;
        default:
          return true;
      }
    });
  });
}

// Frontend sorting logic
function sortModels(models: Model[], sort: SortType): Model[] {
  const sorted = [...models];

  switch (sort) {
    case 'contextLength':
      return sorted.sort((a, b) => (b.contextLength ?? 0) - (a.contextLength ?? 0));
    case 'maxOutput':
      return sorted.sort((a, b) => (b.maxCompletionTokens ?? 0) - (a.maxCompletionTokens ?? 0));
    case 'capable':
      // Capability score based on context + output tokens
      return sorted.sort((a, b) => {
        const scoreA = (a.contextLength ?? 0) + (a.maxCompletionTokens ?? 0) * 2;
        const scoreB = (b.contextLength ?? 0) + (b.maxCompletionTokens ?? 0) * 2;
        return scoreB - scoreA;
      });
    case 'leastIssues':
      // Sort by fewest issues first
      return sorted.sort((a, b) => (a.issueCount ?? 0) - (b.issueCount ?? 0));
    case 'reliable':
      // Composite: high capability + low issues
      return sorted.sort((a, b) => {
        const capabilityA = (a.contextLength ?? 0) + (a.maxCompletionTokens ?? 0) * 2;
        const capabilityB = (b.contextLength ?? 0) + (b.maxCompletionTokens ?? 0) * 2;
        const issuesPenaltyA = (a.issueCount ?? 0) * 10000;
        const issuesPenaltyB = (b.issueCount ?? 0) * 10000;
        return (capabilityB - issuesPenaltyB) - (capabilityA - issuesPenaltyA);
      });
    case 'newest':
      // Sort by createdAt descending (newest first)
      return sorted.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    default:
      return sorted;
  }
}

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
