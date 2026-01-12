import { useMemo } from 'react';
import { useHealth, TIME_RANGE_OPTIONS, type TimeRange } from '@/hooks/useHealth';
import { ModelList } from '@/components/ModelList';
import { ModelCountHeader } from '@/components/ModelCountHeader';
import { IssuesChart } from '@/components/IssuesChart';
import { QueryProvider } from '@/components/QueryProvider';
import type { Model } from '@/hooks/useModels';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function IssuesPageContent() {
  const { issues, timeline, loading, error, range, setRange, count, lastUpdated } = useHealth();

  // Convert IssueData to Model format for ModelList
  const models: Model[] = useMemo(() => {
    return issues.map((issue) => ({
      id: issue.modelId,
      name: issue.modelName,
      contextLength: null,
      maxCompletionTokens: null,
      description: null,
      modality: null,
      inputModalities: null,
      outputModalities: null,
      supportedParameters: null,
      isModerated: null,
      issueCount: issue.total,
    }));
  }, [issues]);

  return (
    <section className="scroll-mt-16 sm:mt-4">
      <h2 className="mb-3 text-3xl font-bold sm:mb-4 sm:text-5xl">Model Health</h2>
      <p className="mb-3 text-base text-muted-foreground sm:mb-4 sm:text-lg">
        Community-reported model health data based on both successful requests and reported issues.
      </p>
      <p className="mb-8 text-sm text-muted-foreground sm:mb-12 sm:text-base">
        Error rates show the percentage of failed requests relative to total reports. Lower percentages indicate healthier models.
        Help improve this data by reporting both successes and issues via the API.
      </p>

      {/* Controls */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <ModelCountHeader
          count={count}
          lastUpdated={lastUpdated}
          label={`model${count === 1 ? '' : 's'} with reported issues`}
        />
        <Select value={range} onValueChange={(v) => setRange(v as TimeRange)}>
          <SelectTrigger className="w-full sm:w-45">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Chart */}
      <div className="mb-8">
        <IssuesChart timeline={timeline} issues={issues} range={range} />
      </div>

      {/* Issues list */}
      <ModelList models={models} loading={loading} error={error} currentPage={1} />
    </section>
  );
}

export function IssuesPage() {
  return (
    <QueryProvider>
      <IssuesPageContent />
    </QueryProvider>
  );
}
