import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export type TimeRange = '15m' | '1h' | '6h' | '24h' | '7d' | '30d';

export interface IssueData {
  modelId: string;
  modelName: string;
  rateLimited: number;
  unavailable: number;
  error: number;
  total: number;
}

export interface TimelinePoint {
  date: string;
  [modelId: string]: number | string;
}

interface IssuesResponse {
  issues: IssueData[];
  timeline: TimelinePoint[];
  range: TimeRange;
  lastUpdated: string;
  count: number;
}

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '15m', label: 'Last 15 minutes' },
  { value: '1h', label: 'Last 1 hour' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

export const issueKeys = {
  all: ['issues'] as const,
  byRange: (range: TimeRange) => [...issueKeys.all, range] as const,
};

async function fetchIssues(range: TimeRange): Promise<IssuesResponse> {
  const response = await fetch(`/api/issues?range=${range}`);
  if (!response.ok) {
    throw new Error('Failed to fetch issues');
  }
  return response.json();
}

export function useIssues() {
  const [range, setRange] = useState<TimeRange>('24h');

  const {
    data,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: issueKeys.byRange(range),
    queryFn: () => fetchIssues(range),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    issues: data?.issues ?? [],
    timeline: data?.timeline ?? [],
    count: data?.count ?? 0,
    lastUpdated: data?.lastUpdated ?? null,
    loading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    range,
    setRange,
  };
}
