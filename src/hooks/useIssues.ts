import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  type TimeRange,
  VALID_TIME_WINDOWS_WITH_LABELS,
  TIME_WINDOW_DEFINITIONS,
} from '@/lib/api-definitions';

// Re-export TimeRange for backwards compatibility
export type { TimeRange };

export interface IssueData {
  modelId: string;
  modelName: string;
  rateLimited: number;
  unavailable: number;
  error: number;
  total: number;
  successCount: number;
  errorRate: number;
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

// Export TIME_RANGE_OPTIONS for backward compatibility
// Filters to only display UI-relevant time windows (excludes 'all')
export const TIME_RANGE_OPTIONS = TIME_WINDOW_DEFINITIONS.filter(tw =>
  VALID_TIME_WINDOWS_WITH_LABELS.includes(tw.value)
).map(tw => ({ value: tw.value as TimeRange, label: `Last ${tw.label}` }));

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
