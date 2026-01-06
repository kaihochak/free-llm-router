import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/code-block';
import {
  generateSnippet,
  type FilterType,
  type SortType,
} from '@/hooks/useModels';
import { codeExamples } from '@/lib/code-examples/index';
import { ModelCountHeader } from '@/components/ModelCountHeader';
import { useCachedSession } from '@/lib/auth-client';
import { ModelControls } from '@/components/ModelControls';
import { ChevronDown } from 'lucide-react';

interface ApiUsageStepProps {
  apiUrl: string;
  activeFilters: FilterType[];
  activeSort: SortType;
  activeLimit: number | undefined;
  lastUpdated?: string | null;
  onToggleFilter: (filter: FilterType | 'all') => void;
  onSortChange: (sort: SortType) => void;
  onLimitChange: (limit: number | undefined) => void;
  modelCount?: number;
  showBrowseModels?: boolean;
  children?: React.ReactNode;
  // Pagination props (optional)
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function ApiUsageStep({
  apiUrl,
  activeFilters,
  activeSort,
  activeLimit,
  lastUpdated,
  onToggleFilter,
  onSortChange,
  onLimitChange,
  modelCount,
  showBrowseModels = true,
  children,
  currentPage,
  totalPages,
  onPageChange,
}: ApiUsageStepProps) {
  const { data: session } = useCachedSession();
  const snippet = generateSnippet(apiUrl);

  return (
    <div className="w-full space-y-12">
      {/* Step 1: Set Up OpenRouter */}
      <div id="setup-openrouter" className="space-y-3 scroll-mt-20">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">1</span>
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
          provides a unified API for accessing many LLM providers. Sign up for free and create an API key.
        </p>
      </div>

      {/* Step 2: Preview Your Model List */}
      {showBrowseModels && (
        <div id="models" className="scroll-mt-20 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">2</span>
          <h3 className="text-xl font-semibold sm:text-2xl">Preview Your Model List</h3>
        </div>
          <p className="text-muted-foreground">
            Configure filters and sorting to customize which models you'll get. This is a live preview - your app will fetch these dynamically.
          </p>

          {/* Large Filter & Sort Controls */}
          <ModelControls
            activeFilters={activeFilters}
            activeSort={activeSort}
            activeLimit={activeLimit}
            onToggleFilter={onToggleFilter}
            onSortChange={onSortChange}
            onLimitChange={onLimitChange}
          />

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {modelCount !== undefined && <ModelCountHeader count={modelCount} lastUpdated={lastUpdated} />}

            {totalPages && totalPages > 1 && onPageChange && currentPage && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronDown className="h-4 w-4 rotate-90" />
                </Button>
                <span className="text-sm text-muted-foreground px-1">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronDown className="h-4 w-4 -rotate-90" />
                </Button>
              </div>
            )}
          </div>

          {/* Model List (passed as children) */}
          {children}
        </div>
      )}

      {/* Step 3: Get Your API Key */}
      <div id="get-api-key" className="space-y-3 scroll-mt-20">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">{showBrowseModels ? 3 : 2}</span>
          <h3 className="text-xl font-semibold sm:text-2xl">Get Your API Key</h3>
        </div>
        <p className="text-muted-foreground">
          Sign in with GitHub to create your API key. All keys share a per-user limit of 200 requests per 24 hours (with SDK caching, this is plenty).
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

      {/* Step 4: Copy free-models.ts */}
      <div id="copy-file" className="space-y-3 scroll-mt-20">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">{showBrowseModels ? 4 : 3}</span>
          <h3 className="text-xl font-semibold sm:text-2xl">Copy <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-lg sm:text-xl">free-models.ts</code></h3>
        </div>
        <p className="text-muted-foreground">
          This helper fetches free model IDs from our API and reports issues back. It's a single file with no dependencies.
        </p>
        <CodeBlock code={snippet} copyLabel="Copy" />
      </div>

      {/* Step 5: Use It */}
      <div id="use-it" className="space-y-3 scroll-mt-20">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">{showBrowseModels ? 5 : 4}</span>
          <h3 className="text-xl font-semibold sm:text-2xl">Use It</h3>
        </div>
        <p className="text-muted-foreground">
          This is the exact `getModelIds` call for your current filters, sort, and limit.
        </p>
        <ModelControls
          activeFilters={activeFilters}
          activeSort={activeSort}
          activeLimit={activeLimit}
          onToggleFilter={onToggleFilter}
          onSortChange={onSortChange}
          onLimitChange={onLimitChange}
        />
        <CodeBlock
          code={codeExamples.getModelIdsCall(activeFilters, activeSort, activeLimit)}
          language="typescript"
          className="text-sm"
        />
        <p className="text-muted-foreground">
          Loop through models until one succeeds. Free models may be rate-limited, so we try multiple and optionally fall back to stable models you trust. See{' '}
          <a href="#code-examples" className="text-primary hover:underline">Code Examples</a> for more patterns.
        </p>
        <CodeBlock code={codeExamples.basicUsage(activeFilters, activeSort, activeLimit)} copyLabel="Copy" />
      </div>
    </div>
  );
}
