import { useQuery } from '@tanstack/react-query';
import { modelKeys } from './useModels';

async function fetchModelCount(): Promise<number> {
  const response = await fetch('/api/v1/models/ids');
  if (!response.ok) {
    throw new Error('Failed to fetch model count');
  }
  const data = await response.json();
  return data.count;
}

export function useModelCount() {
  const { data: count, isLoading, error } = useQuery({
    queryKey: modelKeys.count(),
    queryFn: fetchModelCount,
  });

  return {
    count: count ?? null,
    isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
  };
}
