import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

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
}

export type FilterType = 'chat' | 'vision' | 'coding' | 'longContext' | 'reasoning';
export type SortType = 'contextLength' | 'maxOutput' | 'name' | 'provider' | 'capable' | 'leastIssues';

export const FILTERS: { key: FilterType | 'all'; label: string; description: string }[] = [
  { key: 'all', label: 'All', description: 'Show all available free models' },
  { key: 'chat', label: 'Chat', description: 'Models optimized for conversation' },
  { key: 'vision', label: 'Vision', description: 'Models that can analyze images' },
  { key: 'coding', label: 'Coding', description: 'Models specialized for code generation' },
  { key: 'longContext', label: 'Long Context', description: 'Models with 100k+ token context windows' },
  { key: 'reasoning', label: 'Reasoning', description: 'Models with advanced reasoning capabilities' },
];

export const SORT_OPTIONS: { key: SortType; label: string; description: string }[] = [
  { key: 'contextLength', label: 'Context Length', description: 'Sort by maximum input tokens' },
  { key: 'maxOutput', label: 'Max Output', description: 'Sort by maximum output tokens' },
  { key: 'name', label: 'Name (A-Z)', description: 'Sort alphabetically by model name' },
  { key: 'provider', label: 'Provider (A-Z)', description: 'Sort alphabetically by provider' },
  { key: 'capable', label: 'Most Capable', description: 'Sort by overall model capability' },
  { key: 'leastIssues', label: 'Least Issues', description: 'Sort by fewest reported issues' },
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
  if (sort !== 'contextLength') params.set('sort', sort);
  const query = params.toString();
  return `/api/v1/models/openrouter${query ? `?${query}` : ''}`;
}

async function fetchAllModels(): Promise<Model[]> {
  const response = await fetch('/api/v1/models/openrouter');
  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }
  const data: ApiResponse = await response.json();

  // Attach issue counts to each model
  return data.models.map((model) => {
    const feedback = data.feedbackCounts[model.id];
    const issueCount = feedback
      ? feedback.rateLimited + feedback.unavailable + feedback.error
      : 0;
    return { ...model, issueCount };
  });
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
        case 'coding':
          // Check if model name/id suggests coding capability
          const codingKeywords = ['code', 'coder', 'codestral', 'deepseek', 'qwen2.5-coder'];
          const modelIdLower = model.id.toLowerCase();
          return codingKeywords.some((kw) => modelIdLower.includes(kw));
        case 'longContext':
          return model.contextLength !== null && model.contextLength >= 100000;
        case 'reasoning':
          // Check for reasoning model indicators
          const reasoningKeywords = ['reasoning', 'think', 'o1', 'o3', 'r1', 'qwq'];
          const idLower = model.id.toLowerCase();
          return reasoningKeywords.some((kw) => idLower.includes(kw));
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
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'provider':
      // Extract provider from model ID (format: provider/model-name)
      return sorted.sort((a, b) => {
        const providerA = a.id.split('/')[0] ?? '';
        const providerB = b.id.split('/')[0] ?? '';
        return providerA.localeCompare(providerB);
      });
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
    default:
      return sorted;
  }
}

export function generateSnippet(apiUrl: string): string {
  return `const res = await fetch('${API_BASE}${apiUrl}');
const { models } = await res.json();

// Use the first matching model with OpenRouter
const model = models[0];
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${OPENROUTER_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: model.id,
    messages: [{ role: 'user', content: 'Hello!' }],
  }),
});`;
}

export function getFullApiUrl(apiUrl: string): string {
  return `${API_BASE}${apiUrl}`;
}

export function useModels() {
  const [activeFilters, setActiveFilters] = useState<FilterType[]>([]);
  const [activeSort, setActiveSort] = useState<SortType>('contextLength');

  // Fetch all models once
  const {
    data: allModels = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: modelKeys.all,
    queryFn: fetchAllModels,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter and sort on frontend
  const models = useMemo(() => {
    const filtered = filterModels(allModels, activeFilters);
    return sortModels(filtered, activeSort);
  }, [allModels, activeFilters, activeSort]);

  // API URL for the code snippet (reflects current filters/sort)
  const apiUrl = useMemo(() => buildApiUrl(activeFilters, activeSort), [activeFilters, activeSort]);

  const toggleFilter = (filter: FilterType | 'all') => {
    if (filter === 'all') {
      setActiveFilters([]);
    } else {
      setActiveFilters((prev) =>
        prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
      );
    }
  };

  return {
    models,
    loading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    activeFilters,
    activeSort,
    apiUrl,
    setActiveSort,
    toggleFilter,
  };
}
