import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/code-block';
import { useModels, generateSnippet, getModelControlsProps } from '@/hooks/useModels';
import { codeExamples } from '@/lib/code-examples/index';
import { ModelControls } from '@/components/ModelControls';
import { ModelList } from '@/components/ModelList';
import { useCachedSession, authClient } from '@/lib/auth-client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type ApiKeyPreferences,
  DEFAULT_USE_CASE,
  DEFAULT_SORT,
  DEFAULT_TOP_N,
  DEFAULT_MAX_ERROR_RATE,
  DEFAULT_TIME_RANGE,
  DEFAULT_MY_REPORTS,
} from '@/lib/api-definitions';

interface ApiKeyOption {
  id: string;
  name: string;
  enabled: boolean;
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

export function ApiUsageStep() {
  const { data: session } = useCachedSession();
  const modelsData = useModels();
  const {
    models,
    loading,
    error,
    lastUpdated,
    activeUseCases,
    activeSort,
    activeTopN,
    reliabilityFilterEnabled,
    activeMaxErrorRate,
    activeTimeRange,
    activeMyReports,
    apiUrl,
    setActiveUseCases,
    setActiveSort,
    setActiveTopN,
    setReliabilityFilterEnabled,
    setActiveMaxErrorRate,
    setActiveTimeRange,
    setActiveMyReports,
  } = modelsData;
  const modelControlsProps = getModelControlsProps(modelsData);
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const snippet = generateSnippet(apiUrl);
  const defaultCallSnippet = codeExamples.getModelIdsDefaultCall();
  const previewModels = activeTopN ? models.slice(0, activeTopN) : models;
  const [previewPage, setPreviewPage] = useState(1);
  const previewItemsPerPage = 5;
  const totalPages = Math.ceil(previewModels.length / previewItemsPerPage);

  if (previewPage > totalPages && totalPages > 0) {
    setPreviewPage(1);
  }

  const { data: apiKeys = [] } = useQuery({
    queryKey: ['stepApiKeys'],
    queryFn: fetchApiKeys,
    enabled: !!session?.user,
  });

  useEffect(() => {
    if (!session?.user) return;
    if (!apiKeys.length) {
      setSelectedApiKeyId('');
      return;
    }
    if (!selectedApiKeyId || !apiKeys.some((key) => key.id === selectedApiKeyId)) {
      setSelectedApiKeyId(apiKeys[0].id);
    }
  }, [session?.user, apiKeys, selectedApiKeyId]);

  const { data: selectedPreferences, refetch: refetchSelectedPreferences } = useQuery({
    queryKey: ['stepApiKeyPreferences', selectedApiKeyId],
    queryFn: () => fetchPreferences(selectedApiKeyId),
    enabled: !!session?.user && !!selectedApiKeyId,
  });

  useEffect(() => {
    if (!session?.user || !selectedApiKeyId || selectedPreferences === undefined) return;

    setActiveUseCases(selectedPreferences.useCases ?? DEFAULT_USE_CASE);
    setActiveSort(selectedPreferences.sort ?? DEFAULT_SORT);
    setActiveTopN(selectedPreferences.topN ?? DEFAULT_TOP_N);
    setReliabilityFilterEnabled(selectedPreferences.maxErrorRate !== undefined);
    setActiveMaxErrorRate(selectedPreferences.maxErrorRate ?? DEFAULT_MAX_ERROR_RATE);
    setActiveTimeRange(selectedPreferences.timeRange ?? DEFAULT_TIME_RANGE);
    setActiveMyReports(selectedPreferences.myReports ?? DEFAULT_MY_REPORTS);
    setPreviewPage(1);
    setSaveStatus('idle');
  }, [
    session?.user,
    selectedApiKeyId,
    selectedPreferences,
    setActiveUseCases,
    setActiveSort,
    setActiveTopN,
    setReliabilityFilterEnabled,
    setActiveMaxErrorRate,
    setActiveTimeRange,
    setActiveMyReports,
  ]);

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
  const { mutate: savePreferencesForKey, isPending: isSavingPreferences } = savePrefsMutation;

  const currentPreferences = useMemo<ApiKeyPreferences>(
    () => ({
      useCases: activeUseCases,
      sort: activeSort,
      topN: activeTopN,
      maxErrorRate: reliabilityFilterEnabled ? activeMaxErrorRate : undefined,
      timeRange: activeTimeRange as ApiKeyPreferences['timeRange'],
      myReports: activeMyReports,
    }),
    [
      activeUseCases,
      activeSort,
      activeTopN,
      reliabilityFilterEnabled,
      activeMaxErrorRate,
      activeTimeRange,
      activeMyReports,
    ]
  );

  const isDirty = useMemo(() => {
    if (!session?.user || !selectedApiKeyId || selectedPreferences === undefined) return false;

    const baseline: ApiKeyPreferences = {
      useCases: selectedPreferences.useCases ?? DEFAULT_USE_CASE,
      sort: selectedPreferences.sort ?? DEFAULT_SORT,
      topN: selectedPreferences.topN ?? DEFAULT_TOP_N,
      maxErrorRate: selectedPreferences.maxErrorRate,
      timeRange: selectedPreferences.timeRange ?? DEFAULT_TIME_RANGE,
      myReports: selectedPreferences.myReports ?? DEFAULT_MY_REPORTS,
    };

    return JSON.stringify(currentPreferences) !== JSON.stringify(baseline);
  }, [session?.user, selectedApiKeyId, selectedPreferences, currentPreferences]);

  const handleSavePreferences = () => {
    if (!selectedApiKeyId) return;
    setSaveStatus('idle');
    savePreferencesForKey({ keyId: selectedApiKeyId, preferences: currentPreferences });
  };

  return (
    <div className="w-full space-y-12">
      {/* Step 1: Set Up OpenRouter */}
      <div id="setup-openrouter" className="space-y-3 scroll-mt-20">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            1
          </span>
          <h3 className="text-xl font-semibold sm:text-2xl">Set Up OpenRouter</h3>
        </div>
        <p className="text-muted-foreground">
          <a
            href="https://openrouter.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            OpenRouter
          </a>{' '}
          provides a unified API for accessing many LLM providers. Sign up for free and create an
          API key.
        </p>
      </div>

      {/* Step 2: Get Your API Key */}
      <div id="get-api-key" className="space-y-3 scroll-mt-20">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            2
          </span>
          <h3 className="text-xl font-semibold sm:text-2xl">Get Your API Key</h3>
        </div>
        <p className="text-muted-foreground">
          <a href="/login" className="text-primary font-medium hover:underline hover:opacity-90">
            Sign in with GitHub
          </a>{' '}
          to create your API key. All keys share a per-user limit of 200 requests per 24 hours (with
          SDK caching, this is plenty).
        </p>
      </div>

      {/* Step 3: Configure Parameters */}
      <div id="configure-params" className="space-y-3 scroll-mt-20">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            3
          </span>
          <h3 className="text-xl font-semibold sm:text-2xl">Configure Parameters</h3>
        </div>
        {session?.user && apiKeys.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Create an API key first to save these settings per key.
          </p>
        )}
        <ModelControls {...modelControlsProps} />
        <div className="mt-3">
          <ModelList
            models={previewModels}
            loading={loading}
            error={error}
            currentPage={previewPage}
            onPageChange={setPreviewPage}
            itemsPerPage={previewItemsPerPage}
            lastUpdated={lastUpdated}
          />
        </div>
        {session?.user && selectedApiKeyId && (
          <div className="flex items-center justify-between gap-3">
            <Select value={selectedApiKeyId} onValueChange={setSelectedApiKeyId}>
              <SelectTrigger className="w-full sm:w-56 md:w-auto h-9 md:h-12!" size="default">
                <SelectValue placeholder="Select API key" />
              </SelectTrigger>
              <SelectContent>
                {apiKeys.map((key) => (
                  <SelectItem key={key.id} value={key.id}>
                    {key.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                onClick={handleSavePreferences}
                disabled={isSavingPreferences || !isDirty}
              >
                {isSavingPreferences ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Tune filters and preview the output list. For full parameter details, see{' '}
          <a href="#query-params" className="text-primary hover:underline">
            Query Parameters
          </a>
          .
        </p>
      </div>

      {/* Step 4: Copy free-llm-router.ts */}
      <div id="copy-file" className="space-y-3 scroll-mt-20">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            4
          </span>
          <h3 className="text-xl font-semibold sm:text-2xl">
            Copy{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-lg sm:text-xl">
              free-llm-router.ts
            </code>
          </h3>
        </div>
        <p className="text-muted-foreground">
          This helper fetches free model IDs from our API, reports both successes and issues back,
          and handles caching automatically.
        </p>
        <CodeBlock code={snippet} copyLabel="Copy" className="[&>div:first-child]:max-h-[26vh]" />
      </div>

      {/* Step 5: Use It */}
      <div id="use-it" className="space-y-3 scroll-mt-20">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            5
          </span>
          <h3 className="text-xl font-semibold sm:text-2xl">Use It</h3>
        </div>
        <p className="text-muted-foreground">
          Two ways to call the helper: use saved defaults from Dashboard, or override per request.
        </p>
        <CodeBlock code={defaultCallSnippet} language="typescript" className="text-sm" />
        <p className="text-muted-foreground">Override mode (uses the parameters you configured):</p>
        <CodeBlock
          code={codeExamples.getModelIdsCall(
            activeUseCases,
            activeSort,
            activeTopN,
            reliabilityFilterEnabled ? activeMaxErrorRate : undefined,
            reliabilityFilterEnabled ? activeTimeRange : undefined,
            reliabilityFilterEnabled ? activeMyReports : undefined
          )}
          language="typescript"
          className="text-sm"
        />
        <p className="text-muted-foreground">
          Loop through models until one succeeds. Free models may be rate-limited, so we try
          multiple and optionally fall back to stable models you trust. See{' '}
          <a href="#code-examples" className="text-primary hover:underline">
            Code Examples
          </a>{' '}
          for more patterns.
        </p>
        <CodeBlock
          code={codeExamples.basicUsage(
            activeUseCases,
            activeSort,
            activeTopN,
            reliabilityFilterEnabled ? activeMaxErrorRate : undefined,
            reliabilityFilterEnabled ? activeTimeRange : undefined,
            reliabilityFilterEnabled ? activeMyReports : undefined
          )}
          copyLabel="Copy"
        />
      </div>
    </div>
  );
}
