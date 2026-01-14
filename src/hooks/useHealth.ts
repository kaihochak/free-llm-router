import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  type TimeRange,
  VALID_TIME_RANGES_WITH_LABELS,
  TIME_RANGE_DEFINITIONS,
  DEFAULT_MY_REPORTS,
  DEFAULT_TIME_RANGE,
} from '@/lib/api-definitions';
import { useCachedSession } from '@/lib/auth-client';

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

export interface TimelineModelData {
  errorRate: number;
  errorCount: number;
  totalCount: number;
}

export interface TimelinePoint {
  date: string;
  [modelId: string]: number | string | TimelineModelData;
}

interface IssuesResponse {
  issues: IssueData[];
  timeline: TimelinePoint[];
  range: TimeRange;
  lastUpdated: string;
  count: number;
}

// Export TIME_RANGE_OPTIONS for backward compatibility
// Filters to only display UI-relevant time ranges (excludes 'all')
export const TIME_RANGE_OPTIONS = TIME_RANGE_DEFINITIONS.filter((tr) =>
  VALID_TIME_RANGES_WITH_LABELS.includes(tr.value)
).map((tr) => ({ value: tr.value as TimeRange, label: `Last ${tr.label}` }));

export const issueKeys = {
  all: ['issues'] as const,
  byRange: (range: TimeRange) => [...issueKeys.all, range] as const,
};

async function fetchIssues(range: TimeRange, myReports?: boolean): Promise<IssuesResponse> {
  const params = new URLSearchParams({ range });
  if (myReports !== undefined) {
    params.append('myReports', myReports.toString());
  }
  const response = await fetch(`/api/health?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch health data');
  }
  return response.json();
}

export function useHealth() {
  const [range, setRange] = useState<TimeRange>(DEFAULT_TIME_RANGE);
  const [myReports, setMyReportsState] = useState<boolean>(DEFAULT_MY_REPORTS);
  const { data: session } = useCachedSession();

  // Force myReports to false if user is not authenticated
  const effectiveMyReports = session ? myReports : false;

  useEffect(() => {
    // Reset to false if user logs out
    if (!session && myReports) {
      setMyReportsState(false);
    }
  }, [session, myReports]);

  const {
    data,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['issues', range, effectiveMyReports],
    queryFn: () => fetchIssues(range, effectiveMyReports),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const setMyReports = (value: boolean) => {
    // Only allow setting myReports to true if authenticated
    setMyReportsState(session ? value : false);
  };

  return {
    issues: data?.issues ?? [],
    timeline: data?.timeline ?? [],
    count: data?.count ?? 0,
    lastUpdated: data?.lastUpdated ?? null,
    loading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    range,
    setRange,
    myReports: effectiveMyReports,
    setMyReports,
  };
}
