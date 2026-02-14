import { useMemo, useCallback, useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useHealth, type TimeRange } from '@/hooks/useHealth';
import { ModelList } from '@/components/ModelList';
import { IssuesChart } from '@/components/model-health/HealthChart';
import { ModelControls } from '@/components/ModelControls';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { authClient, useCachedSession } from '@/lib/auth-client';
import type { ApiKeyPreferences } from '@/lib/api-definitions';
import { filterModelsByUseCase, sortModels } from '@/lib/model-types';
import {
  DEFAULT_MY_REPORTS,
  DEFAULT_SORT,
  DEFAULT_TIME_RANGE,
  DEFAULT_TOP_N,
  DEFAULT_USE_CASE,
} from '@/lib/api-definitions';
import type { Model } from '@/hooks/useModels';

interface ApiKeyOption {
  id: string;
  name: string;
  enabled: boolean;
}

const NO_API_KEY_VALUE = '__no_api_key__';

interface FeedbackEntry {
  rateLimited: number;
  unavailable: number;
  error: number;
  successCount: number;
  errorRate: number;
}

async function fetchApiKeys(): Promise<ApiKeyOption[]> {
  const response = await authClient.apiKey.list();
  return ((response.data as ApiKeyOption[]) || []).filter((key) => key.enabled);
}

async function fetchPreferences(apiKeyId: string): Promise<ApiKeyPreferences> {
  const response = await fetch(`/api/auth/preferences?apiKeyId=${apiKeyId}`, {
    credentials: 'include',
  });
  if (!response.ok) return {};
  const data = await response.json();
  return data.preferences || {};
}

async function savePreferences(apiKeyId: string, preferences: ApiKeyPreferences): Promise<void> {
  const response = await fetch('/api/auth/preferences', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKeyId, preferences }),
  });
  if (!response.ok) {
    throw new Error('Failed to save preferences');
  }
}

export function HealthTabContent() {
  const { data: session } = useCachedSession();
  const {
    issues,
    timeline,
    loading,
    error,
    range,
    setRange,
    count,
    lastUpdated,
    myReports,
    setMyReports,
    activeUseCases,
    activeSort,
    activeTopN,
    reliabilityFilterEnabled,
    activeMaxErrorRate,
    toggleUseCase,
    setActiveUseCases,
    setActiveSort,
    setActiveTopN,
    setReliabilityFilterEnabled,
    setActiveMaxErrorRate,
    resetToDefaults,
  } = useHealth();
  const [currentPage, setCurrentPage] = useState(1);
  const [excludedModelIds, setExcludedModelIds] = useState<string[]>([]);
  const [modelListView, setModelListView] = useState<'reported' | 'all'>('reported');
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string>(NO_API_KEY_VALUE);
  const [localSnapshot, setLocalSnapshot] = useState<ApiKeyPreferences | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const isUsingApiKey = !!session?.user && selectedApiKeyId !== NO_API_KEY_VALUE;

  const { data: apiKeys = [] } = useQuery({
    queryKey: ['healthApiKeys'],
    queryFn: fetchApiKeys,
    enabled: !!session?.user,
  });

  useEffect(() => {
    if (!session?.user) return;
    if (
      selectedApiKeyId !== NO_API_KEY_VALUE &&
      !apiKeys.some((key) => key.id === selectedApiKeyId)
    ) {
      setSelectedApiKeyId(NO_API_KEY_VALUE);
      setSaveStatus('idle');
    }
  }, [session?.user, apiKeys, selectedApiKeyId]);

  const { data: selectedPreferences, refetch: refetchSelectedPreferences } = useQuery({
    queryKey: ['healthApiKeyPreferences', selectedApiKeyId],
    queryFn: () => fetchPreferences(selectedApiKeyId),
    enabled: isUsingApiKey,
  });

  useEffect(() => {
    if (!isUsingApiKey || selectedPreferences === undefined) return;

    setActiveUseCases(selectedPreferences.useCases ?? DEFAULT_USE_CASE);
    setActiveSort(selectedPreferences.sort ?? DEFAULT_SORT);
    setActiveTopN(selectedPreferences.topN ?? DEFAULT_TOP_N);
    setReliabilityFilterEnabled(selectedPreferences.maxErrorRate !== undefined);
    setActiveMaxErrorRate(selectedPreferences.maxErrorRate);
    setRange((selectedPreferences.timeRange ?? DEFAULT_TIME_RANGE) as TimeRange);
    setMyReports(selectedPreferences.myReports ?? DEFAULT_MY_REPORTS);
    setExcludedModelIds(selectedPreferences.excludeModelIds ?? []);
    setCurrentPage(1);
    setSaveStatus('idle');
  }, [
    isUsingApiKey,
    selectedPreferences,
    setActiveUseCases,
    setActiveSort,
    setActiveTopN,
    setReliabilityFilterEnabled,
    setActiveMaxErrorRate,
    setRange,
    setMyReports,
  ]);

  const currentPreferences = useMemo<ApiKeyPreferences>(
    () => ({
      useCases: activeUseCases,
      sort: activeSort,
      topN: activeTopN,
      maxErrorRate: reliabilityFilterEnabled ? activeMaxErrorRate : undefined,
      timeRange: range as ApiKeyPreferences['timeRange'],
      myReports,
      excludeModelIds: excludedModelIds,
    }),
    [
      activeUseCases,
      activeSort,
      activeTopN,
      reliabilityFilterEnabled,
      activeMaxErrorRate,
      range,
      myReports,
      excludedModelIds,
    ]
  );

  const isDirty = useMemo(() => {
    if (!isUsingApiKey || selectedPreferences === undefined) return false;
    const baseline: ApiKeyPreferences = {
      useCases: selectedPreferences.useCases ?? DEFAULT_USE_CASE,
      sort: selectedPreferences.sort ?? DEFAULT_SORT,
      topN: selectedPreferences.topN ?? DEFAULT_TOP_N,
      maxErrorRate: selectedPreferences.maxErrorRate,
      timeRange: selectedPreferences.timeRange ?? DEFAULT_TIME_RANGE,
      myReports: selectedPreferences.myReports ?? DEFAULT_MY_REPORTS,
      excludeModelIds: selectedPreferences.excludeModelIds ?? [],
    };
    return JSON.stringify(currentPreferences) !== JSON.stringify(baseline);
  }, [isUsingApiKey, selectedPreferences, currentPreferences]);

  const savePrefsMutation = useMutation({
    mutationFn: ({ keyId, preferences }: { keyId: string; preferences: ApiKeyPreferences }) =>
      savePreferences(keyId, preferences),
    onSuccess: () => {
      setSaveStatus('saved');
      void refetchSelectedPreferences();
    },
    onError: () => {
      setSaveStatus('error');
    },
  });

  const handleApiKeyChange = (value: string) => {
    if (value === NO_API_KEY_VALUE) {
      if (localSnapshot) {
        setActiveUseCases(localSnapshot.useCases ?? DEFAULT_USE_CASE);
        setActiveSort(localSnapshot.sort ?? DEFAULT_SORT);
        setActiveTopN(localSnapshot.topN ?? DEFAULT_TOP_N);
        setReliabilityFilterEnabled(localSnapshot.maxErrorRate !== undefined);
        setActiveMaxErrorRate(localSnapshot.maxErrorRate);
        setRange((localSnapshot.timeRange ?? DEFAULT_TIME_RANGE) as TimeRange);
        setMyReports(localSnapshot.myReports ?? DEFAULT_MY_REPORTS);
        setExcludedModelIds(localSnapshot.excludeModelIds ?? []);
      }
      setSelectedApiKeyId(NO_API_KEY_VALUE);
      setSaveStatus('idle');
      return;
    }

    if (selectedApiKeyId === NO_API_KEY_VALUE) {
      setLocalSnapshot({
        useCases: activeUseCases,
        sort: activeSort,
        topN: activeTopN,
        maxErrorRate: reliabilityFilterEnabled ? activeMaxErrorRate : undefined,
        timeRange: range as ApiKeyPreferences['timeRange'],
        myReports,
        excludeModelIds: excludedModelIds,
      });
    }
    setSelectedApiKeyId(value);
    setSaveStatus('idle');
  };

  // Fetch all models for the "All" view (lazy - only when selected)
  const { data: allModelsData, isLoading: allModelsLoading } = useQuery({
    queryKey: ['healthAllModels', range],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('timeRange', range);
      const response = await fetch(`/api/demo/models?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch models');
      const data: {
        models: Omit<Model, 'issueCount'>[];
        feedbackCounts: Record<string, FeedbackEntry>;
      } = await response.json();
      return data.models.map((model) => {
        const feedback = data.feedbackCounts[model.id];
        return {
          ...model,
          issueCount: feedback
            ? feedback.rateLimited + feedback.unavailable + feedback.error
            : undefined,
          errorRate: feedback ? feedback.errorRate : undefined,
          successCount: feedback ? feedback.successCount : undefined,
          rateLimited: feedback ? feedback.rateLimited : undefined,
          unavailable: feedback ? feedback.unavailable : undefined,
          errorCount: feedback ? feedback.error : undefined,
        } as Model;
      });
    },
    enabled: modelListView === 'all',
    staleTime: 5 * 60 * 1000,
  });

  // Wrapper to cast string to TimeRange for ModelControls compatibility
  const handleTimeRangeChange = useCallback(
    (value: string) => {
      setRange(value as TimeRange);
      setSaveStatus('idle');
    },
    [setRange]
  );

  // Convert IssueData to Model format for ModelList
  const models: Model[] = useMemo(() => {
    return issues.map((issue) => ({
      id: issue.modelId,
      name: issue.modelName,
      contextLength: issue.contextLength,
      maxCompletionTokens: issue.maxCompletionTokens,
      description: null,
      modality: issue.modality,
      inputModalities: issue.inputModalities,
      outputModalities: issue.outputModalities,
      supportedParameters: issue.supportedParameters,
      isModerated: null,
      issueCount: issue.total,
      errorRate: issue.errorRate,
      successCount: issue.successCount,
      rateLimited: issue.rateLimited,
      unavailable: issue.unavailable,
      errorCount: issue.error,
    }));
  }, [issues]);

  // All models filtered/sorted client-side for the "All" view
  const allModelsFiltered: Model[] = useMemo(() => {
    if (!allModelsData) return [];
    const filtered = filterModelsByUseCase(allModelsData, activeUseCases);
    const sorted = sortModels(filtered, activeSort);
    if (activeTopN !== undefined && activeTopN > 0) {
      return sorted.slice(0, activeTopN);
    }
    return sorted;
  }, [allModelsData, activeUseCases, activeSort, activeTopN]);

  const activeModels = modelListView === 'reported' ? models : allModelsFiltered;

  const visibleModels = useMemo(() => {
    const excluded = new Set(excludedModelIds);
    return activeModels.filter((model) => !excluded.has(model.id));
  }, [activeModels, excludedModelIds]);

  const visibleIssues = useMemo(() => {
    const excluded = new Set(excludedModelIds);
    return issues.filter((issue) => !excluded.has(issue.modelId));
  }, [issues, excludedModelIds]);

  return (
    <div>
      <p className="mb-3 text-base text-muted-foreground sm:mb-4 sm:text-lg">
        {myReports ? 'Your personal' : 'Community-reported'} model health data based on both
        successful requests and reported issues.
      </p>
      <p className="mb-8 text-sm text-muted-foreground sm:text-base">
        Error rates show the percentage of failed requests relative to total reports. Lower
        percentages indicate healthier models. Help improve this data by reporting both successes
        and issues via the API.
      </p>

      {session?.user && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <Select value={selectedApiKeyId} onValueChange={handleApiKeyChange}>
            <SelectTrigger className="w-full sm:w-56 md:w-auto h-9 md:h-12!" size="default">
              <SelectValue placeholder="Select API key" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_API_KEY_VALUE}>Preview only</SelectItem>
              {apiKeys.map((key) => (
                <SelectItem key={key.id} value={key.id}>
                  {key.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isUsingApiKey && (
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground">
                {saveStatus === 'saved'
                  ? 'Preferences saved.'
                  : saveStatus === 'error'
                    ? 'Save failed. Try again.'
                    : isDirty
                      ? 'Unsaved changes.'
                      : ''}
              </p>
              <Button
                size="lg"
                onClick={() =>
                  savePrefsMutation.mutate({
                    keyId: selectedApiKeyId,
                    preferences: currentPreferences,
                  })
                }
                disabled={savePrefsMutation.isPending || !isDirty}
              >
                {savePrefsMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <ModelControls
        activeUseCases={activeUseCases}
        activeSort={activeSort}
        activeTopN={activeTopN}
        activeTimeRange={range}
        activeMyReports={myReports}
        simpleHealthControls
        showReliabilityControls={false}
        onToggleUseCase={(useCase) => {
          toggleUseCase(useCase);
          setSaveStatus('idle');
        }}
        onSortChange={(sort) => {
          setActiveSort(sort);
          setSaveStatus('idle');
        }}
        onTopNChange={(topN) => {
          setActiveTopN(topN);
          setSaveStatus('idle');
        }}
        onTimeRangeChange={handleTimeRangeChange}
        onMyReportsChange={(value) => {
          setMyReports(value);
          setSaveStatus('idle');
        }}
        excludeControlLabel={isUsingApiKey ? 'Exclude Models' : 'Hide Models'}
        excludeModels={activeModels.map((model) => ({ id: model.id, name: model.name }))}
        excludedModelIds={excludedModelIds}
        onExcludedModelIdsChange={(ids) => {
          setExcludedModelIds(ids);
          setCurrentPage(1);
          setSaveStatus('idle');
        }}
        onReset={() => {
          resetToDefaults();
          setExcludedModelIds([]);
          setCurrentPage(1);
          setSaveStatus('idle');
        }}
        size="lg"
      />

      {/* Chart */}
      <div className="mt-6 mb-3 flex items-center gap-2">
        <span className="font-medium">Error Rate Over Time</span>
        <span className="text-sm text-emerald-600 dark:text-emerald-400">
          &#8595; Lower is better
        </span>
      </div>
      <div className="mb-8">
        <IssuesChart timeline={timeline} issues={visibleIssues} range={range} />
      </div>

      {/* Issues list */}
      <div className="mb-3 flex items-center gap-2">
        <span className="font-medium">Models by Error Rate</span>
        <span className="text-sm text-emerald-600 dark:text-emerald-400">
          &#8595; Lower is better
        </span>
        <div className="ml-auto">
          <ButtonGroup>
            <Button
              variant={modelListView === 'reported' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setModelListView('reported');
                setCurrentPage(1);
              }}
            >
              Reported Usage
            </Button>
            <Button
              variant={modelListView === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setModelListView('all');
                setCurrentPage(1);
              }}
            >
              All
            </Button>
          </ButtonGroup>
        </div>
      </div>
      <ModelList
        models={visibleModels}
        loading={modelListView === 'reported' ? loading : allModelsLoading}
        error={error}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        lastUpdated={lastUpdated}
        headerCount={visibleModels.length}
        headerLabel={
          modelListView === 'reported'
            ? `model${visibleModels.length === 1 ? '' : 's'} shown (${count} total with reported usage)`
            : `model${visibleModels.length === 1 ? '' : 's'} shown (${allModelsData?.length ?? 0} total active)`
        }
        excludedModelIds={excludedModelIds}
        excludeActionMode={isUsingApiKey ? 'exclude' : 'hide'}
        onToggleExcludeModel={(modelId) => {
          setExcludedModelIds((prev) =>
            prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]
          );
        }}
      />
    </div>
  );
}
