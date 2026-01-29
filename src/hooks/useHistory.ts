import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface ApiRequestLog {
  id: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number | null;
  createdAt: string;
  apiKeyId: string | null;
  apiKeyName: string | null;
  apiKeyPrefix: string | null;
}

export interface FeedbackItem {
  id: string;
  modelId: string;
  isSuccess: boolean;
  issue: string | null;
  details: string | null;
  source: string | null;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

interface HistoryResponse<T> {
  items: T[];
  pagination: Pagination;
}

interface UseHistoryResult<T> {
  items: T[];
  pagination: Pagination;
  isLoading: boolean;
  error: string | null;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  refresh: () => void;
}

interface UseHistoryOptions {
  enabled?: boolean;
}

async function fetchHistory<T>(
  type: string,
  page: number,
  limit: number
): Promise<HistoryResponse<T>> {
  const response = await fetch(`/api/auth/history?type=${type}&page=${page}&limit=${limit}`, {
    credentials: 'include',
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      isJson && payload && typeof payload === 'object' && 'error' in payload
        ? String(payload.error)
        : `Failed to fetch history (${response.status})`;
    throw new Error(message);
  }

  if (!isJson || !payload || typeof payload !== 'object') {
    throw new Error('Unexpected response format from history endpoint');
  }

  return {
    items: payload.items ?? [],
    pagination: payload.pagination ?? { page, limit, total: 0, hasMore: false },
  };
}

export function useHistory<T extends ApiRequestLog | FeedbackItem>(
  type: 'requests' | 'feedback',
  limit = 20,
  options?: UseHistoryOptions
): UseHistoryResult<T> {
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['history', type, page, limit],
    queryFn: () => fetchHistory<T>(type, page, limit),
    enabled: options?.enabled ?? true,
  });

  const nextPage = useCallback(() => {
    if (data?.pagination.hasMore) {
      setPage((p) => p + 1);
    }
  }, [data?.pagination.hasMore]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, newPage));
  }, []);

  return {
    items: data?.items ?? [],
    pagination: data?.pagination ?? { page, limit, total: 0, hasMore: false },
    isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    nextPage,
    prevPage,
    goToPage,
    refresh: refetch,
  };
}
