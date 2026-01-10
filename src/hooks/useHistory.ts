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
      const response = await fetch(
        `/api/auth/history?type=${type}&page=${page}&limit=${limit}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch history');
      }

      const data = await response.json();
      setItems(data.items);
      setPagination(data.pagination);
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
