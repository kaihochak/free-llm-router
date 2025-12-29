import { useState, useEffect, useMemo } from 'react';

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
}

export type FilterType = 'chat' | 'vision' | 'coding' | 'longContext' | 'reasoning';
export type SortType = 'contextLength' | 'maxOutput' | 'name' | 'provider' | 'capable';

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
];

const API_BASE = 'https://free-models-api.pages.dev';

function buildApiUrl(filters: FilterType[], sort: SortType): string {
  const params = new URLSearchParams();
  if (filters.length > 0) params.set('filter', filters.join(','));
  if (sort !== 'contextLength') params.set('sort', sort);
  const query = params.toString();
  return `/api/v1/models/openrouter${query ? `?${query}` : ''}`;
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
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<FilterType[]>([]);
  const [activeSort, setActiveSort] = useState<SortType>('contextLength');

  const apiUrl = useMemo(() => buildApiUrl(activeFilters, activeSort), [activeFilters, activeSort]);

  useEffect(() => {
    async function fetchModels() {
      setLoading(true);
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch models');
        }
        const data = await response.json();
        setModels(data.models);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchModels();
  }, [apiUrl]);

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
    error,
    activeFilters,
    activeSort,
    apiUrl,
    setActiveSort,
    toggleFilter,
  };
}
