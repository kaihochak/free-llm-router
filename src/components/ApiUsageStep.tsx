import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/code-block';
import { useModels, generateSnippet, getModelControlsProps } from '@/hooks/useModels';
import { codeExamples } from '@/lib/code-examples/index';
import { useCachedSession } from '@/lib/auth-client';
import { ModelControls } from '@/components/ModelControls';

export function ApiUsageStep() {
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
  } = modelsData;
  const modelControlsProps = getModelControlsProps(modelsData);

  const snippet = generateSnippet(apiUrl);

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
          Sign in with GitHub to create your API key. All keys share a per-user limit of 200
          requests per 24 hours (with SDK caching, this is plenty).
        </p>
        <div className="flex justify-center py-4">
          {session?.user ? (
            <Button asChild size="xl">
              <a href="/dashboard">Go to Dashboard</a>
            </Button>
          ) : (
            <Button asChild size="xl">
              <a href="/login">Sign in with GitHub</a>
            </Button>
          )}
        </div>
      </div>

      {/* Step 3: Copy free-llm-router.ts */}
      <div id="copy-file" className="space-y-3 scroll-mt-20">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            3
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
          and handles caching automatically. It's a single file with no dependencies.
        </p>
        <CodeBlock code={snippet} copyLabel="Copy" />
      </div>

      {/* Step 4: Use It */}
      <div id="use-it" className="space-y-3 scroll-mt-20">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            4
          </span>
          <h3 className="text-xl font-semibold sm:text-2xl">Use It</h3>
        </div>
        <p className="text-muted-foreground">
          This is the exact `getModelIds` call for your current use case, sort, and top N.
        </p>
        <ModelControls {...modelControlsProps} />
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
