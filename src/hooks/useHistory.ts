import { useState, useEffect, useCallback } from 'react';

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

export function useHistory<T extends ApiRequestLog | FeedbackItem>(
  type: 'requests' | 'feedback',
  limit = 20
): UseHistoryResult<T> {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<T[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit,
    total: 0,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/auth/history?type=${type}&page=${page}&limit=${limit}`);
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

      setItems(payload.items ?? []);
      setPagination(payload.pagination ?? { page, limit, total: 0, hasMore: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [type, page, limit]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const nextPage = useCallback(() => {
    if (pagination.hasMore) {
      setPage((p) => p + 1);
    }
  }, [pagination.hasMore]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, newPage));
  }, []);

  return {
    items,
    pagination,
    isLoading,
    error,
    nextPage,
    prevPage,
    goToPage,
    refresh: fetchHistory,
  };
}
