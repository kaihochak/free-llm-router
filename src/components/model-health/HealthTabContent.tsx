import { useMemo, useCallback } from 'react';
import { useHealth, type TimeRange } from '@/hooks/useHealth';
import { ModelList } from '@/components/ModelList';
import { ModelCountHeader } from '@/components/ModelCountHeader';
import { IssuesChart } from '@/components/model-health/HealthChart';
import { ModelControls } from '@/components/ModelControls';
import type { Model } from '@/hooks/useModels';

export function HealthTabContent() {
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
    setActiveSort,
    setActiveTopN,
    setReliabilityFilterEnabled,
    setActiveMaxErrorRate,
    resetToDefaults,
  } = useHealth();

  // Wrapper to cast string to TimeRange for ModelControls compatibility
  const handleTimeRangeChange = useCallback(
    (value: string) => setRange(value as TimeRange),
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

      {/* Controls */}
      <ModelControls
        activeUseCases={activeUseCases}
        activeSort={activeSort}
        activeTopN={activeTopN}
        reliabilityFilterEnabled={reliabilityFilterEnabled}
        activeMaxErrorRate={activeMaxErrorRate}
        activeTimeRange={range}
        activeMyReports={myReports}
        onToggleUseCase={toggleUseCase}
        onSortChange={setActiveSort}
        onTopNChange={setActiveTopN}
        onReliabilityFilterEnabledChange={setReliabilityFilterEnabled}
        onMaxErrorRateChange={setActiveMaxErrorRate}
        onTimeRangeChange={handleTimeRangeChange}
        onMyReportsChange={setMyReports}
        onReset={resetToDefaults}
        size="lg"
      />

      <ModelCountHeader
        count={issues.length}
        lastUpdated={lastUpdated}
        label={`model${issues.length === 1 ? '' : 's'} shown (${count} total with reported usage)`}
      />

      {/* Chart */}
      <div className="mt-6 mb-3 flex items-center gap-2">
        <span className="font-medium">Error Rate Over Time</span>
        <span className="text-sm text-emerald-600 dark:text-emerald-400">&#8595; Lower is better</span>
      </div>
      <div className="mb-8">
        <IssuesChart timeline={timeline} issues={issues} range={range} />
      </div>

      {/* Issues list */}
      <div className="mb-3 flex items-center gap-2">
        <span className="font-medium">Models by Error Rate</span>
        <span className="text-sm text-emerald-600 dark:text-emerald-400">&#8595; Lower is better</span>
      </div>
      <ModelList models={models} loading={loading} error={error} currentPage={1} />
    </div>
  );
}
