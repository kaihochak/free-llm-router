import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CodeBlock } from '@/components/ui/code-block';
import { useModels, generateSnippet } from '@/hooks/useModels';
import { codeExamples } from '@/lib/code-examples/index';
import { useCachedSession, authClient } from '@/lib/auth-client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import {
  type ApiKeyPreferences,
  DEFAULT_USE_CASE,
  DEFAULT_SORT,
  DEFAULT_TIME_RANGE,
  DEFAULT_MY_REPORTS,
} from '@/lib/api-definitions';

interface ApiKeyOption {
  id: string;
  name: string;
  enabled: boolean;
}

const NO_API_KEY_VALUE = '__no_api_key__';

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

interface ApiUsageStepProps {
  variant?: 'full' | 'compact';
}

export function ApiUsageStep({ variant = 'full' }: ApiUsageStepProps) {
  const isCompact = variant === 'compact';
  const { data: session } = useCachedSession();
  const modelsData = useModels();
  const {
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
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string>(NO_API_KEY_VALUE);
  const snippet = generateSnippet(apiUrl);
  const [useItMode, setUseItMode] = useState<'default' | 'override'>('default');

  const { data: apiKeys = [] } = useQuery({
    queryKey: ['stepApiKeys'],
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
    }
  }, [session?.user, apiKeys, selectedApiKeyId]);

  const { data: selectedPreferences } = useQuery({
    queryKey: ['stepApiKeyPreferences', selectedApiKeyId],
    queryFn: () => fetchPreferences(selectedApiKeyId),
    enabled: !!session?.user && selectedApiKeyId !== NO_API_KEY_VALUE,
  });

  useEffect(() => {
    if (
      !session?.user ||
      selectedApiKeyId === NO_API_KEY_VALUE ||
      selectedPreferences === undefined
    ) {
      return;
    }

    setActiveUseCases(selectedPreferences.useCases ?? DEFAULT_USE_CASE);
    setActiveSort(selectedPreferences.sort ?? DEFAULT_SORT);
    setActiveTopN(selectedPreferences.topN);
    setReliabilityFilterEnabled(selectedPreferences.maxErrorRate !== undefined);
    setActiveMaxErrorRate(selectedPreferences.maxErrorRate);
    setActiveTimeRange(selectedPreferences.timeRange ?? DEFAULT_TIME_RANGE);
    setActiveMyReports(selectedPreferences.myReports ?? DEFAULT_MY_REPORTS);
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

  const defaultBasicSnippet = codeExamples.basicUsageDefault();
  const overrideBasicSnippet = codeExamples.basicUsage(
    activeUseCases,
    activeSort,
    activeTopN,
    reliabilityFilterEnabled ? activeMaxErrorRate : undefined,
    reliabilityFilterEnabled ? activeTimeRange : undefined,
    reliabilityFilterEnabled ? activeMyReports : undefined
  );

  return (
    <div className="w-full space-y-12">
      {isCompact && (
        <p className="type-label text-muted-foreground">
          Need full setup and configuration?{' '}
          <a href="/docs" className="text-primary hover:underline">
            See the docs
          </a>
          .
        </p>
      )}

      {!isCompact && (
        <>
          {/* Step 1: Set Up OpenRouter */}
          <div id="setup-openrouter" className="space-y-3 md:space-y-4 scroll-mt-20">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground type-label">
                1
              </span>
              <h3 className="type-title">Set Up OpenRouter</h3>
            </div>
            <p className="text-muted-foreground">
              Create a dedicated{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                OpenRouter API key
              </a>{' '}
              for free-model requests.
            </p>
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Set a small{' '}
                <a
                  href="https://openrouter.ai/settings/limits"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline type-label"
                >
                  credit limit
                </a>{' '}
                to prevent accidental charges.
              </AlertDescription>
            </Alert>
          </div>

          {/* Step 2: Get Your API Key */}
          <div id="get-api-key" className="space-y-3 md:space-y-4 scroll-mt-20">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground type-label">
                2
              </span>
              <h3 className="type-title">Get Your API Key</h3>
            </div>
            <p className="text-muted-foreground">
              <a href="/login" className="text-primary type-label hover:underline hover:opacity-90">
                Sign in with GitHub
              </a>{' '}
              to create a Free LLM Router key.
            </p>
          </div>
        </>
      )}

      {/* Step 3: Copy free-llm-router.ts */}
      <div id="copy-file" className="space-y-3 md:space-y-4 scroll-mt-20">
        <div className="flex flex-wrap items-center gap-3">
          {!isCompact && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground type-label">
              3
            </span>
          )}
          <h3 className="type-title">
            Copy{' '}
            <code className="type-title rounded bg-muted px-1.5 py-0.5 font-mono">
              free-llm-router.ts
            </code>
          </h3>
        </div>
        <p className="text-muted-foreground">
          The helper fetches model IDs, caches them, and reports results.
        </p>
        <CodeBlock code={snippet} copyLabel="Copy" className="[&>div:first-child]:max-h-[26vh]" />
      </div>

      {/* Step 5: Use It */}
      <div id="use-it" className="space-y-3 md:space-y-4 scroll-mt-20">
        <div className="flex flex-wrap items-center gap-3">
          {!isCompact && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground type-label">
              4
            </span>
          )}
          <h3 className="type-title">Use It</h3>
        </div>
        <p className="text-muted-foreground">
          Use saved defaults or override them for one request.
        </p>
        {!isCompact && (
          <div className="flex items-center justify-between gap-3">
            <Tabs
              value={useItMode}
              onValueChange={(value) => setUseItMode(value as 'default' | 'override')}
            >
              <TabsList className="h-8">
                <TabsTrigger value="default" className="type-caption">
                  Default
                </TabsTrigger>
                <TabsTrigger value="override" className="type-caption">
                  Override
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {useItMode === 'override' && session?.user && apiKeys.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="type-caption text-muted-foreground">API key</span>
                <Select value={selectedApiKeyId} onValueChange={setSelectedApiKeyId}>
                  <SelectTrigger className="w-full sm:w-56 h-9" size="default">
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
              </div>
            )}
          </div>
        )}
        <CodeBlock
          code={isCompact || useItMode === 'default' ? defaultBasicSnippet : overrideBasicSnippet}
          language="typescript"
          className="type-label"
        />
      </div>

      {isCompact && (
        <div id="further-configure-params" className="space-y-3 md:space-y-4 scroll-mt-20">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="type-title">Further Configure Parameters</h3>
          </div>
          <p className="text-muted-foreground">
            Tune model selection in{' '}
            <a href="/docs/parameter-configuration" className="text-primary hover:underline">
              Parameter Configuration
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}
