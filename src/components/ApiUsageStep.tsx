import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/code-block';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  generateSnippet,
  FILTERS,
  SORT_OPTIONS,
  type FilterType,
  type SortType,
} from '@/hooks/useModels';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { ModelCountHeader } from '@/components/ModelCountHeader';

interface ApiUsageStepProps {
  apiUrl: string;
  activeFilters: FilterType[];
  activeSort: SortType;
  activeLimit?: number;
  onToggleFilter: (filter: FilterType | 'all') => void;
  onSortChange: (sort: SortType) => void;
  onLimitChange?: (limit: number | undefined) => void;
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
  const snippet = generateSnippet(apiUrl);

  const filterLabel = activeFilters.length === 0
    ? 'All'
    : activeFilters.length === 1
      ? FILTERS.find(f => f.key === activeFilters[0])?.label || activeFilters[0]
      : `${activeFilters.length} selected`;

  const sortLabel = SORT_OPTIONS.find(s => s.key === activeSort)?.label || activeSort;

  return (
    <div className="w-full space-y-12">
      {/* Step 1: Set Up OpenRouter */}
      <div id="setup-openrouter" className="space-y-3 scroll-mt-20">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">1</span>
          <h3 className="text-2xl font-semibold">Set Up OpenRouter</h3>
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
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">2</span>
            <h3 className="text-2xl font-semibold">Preview Your Model List</h3>
          </div>
          <p className="text-muted-foreground">
            Configure filters and sorting to customize which models you'll get. This is a live preview - your app will fetch these dynamically.
          </p>

          {/* Large Filter & Sort Controls */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <div className="flex items-center gap-3">
              <span className="text-lg font-medium">Filter:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="lg" className="gap-2 text-base">
                    {filterLabel}
                    <ChevronDown className="h-5 w-5 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuCheckboxItem
                    checked={activeFilters.length === 0}
                    onCheckedChange={() => onToggleFilter('all')}
                  >
                    All
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  {FILTERS.filter(f => f.key !== 'all').map((filter) => (
                    <DropdownMenuCheckboxItem
                      key={filter.key}
                      checked={activeFilters.includes(filter.key as FilterType)}
                      onCheckedChange={() => onToggleFilter(filter.key as FilterType)}
                    >
                      {filter.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-lg font-medium">Sort:</span>
              <Select value={activeSort} onValueChange={(value) => onSortChange(value as SortType)}>
                <SelectTrigger className="h-11 text-base min-w-40">
                  <SelectValue>{sortLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {onLimitChange && (
              <div className="flex items-center gap-3">
                <span className="text-lg font-medium">Limit:</span>
                <Select
                  value={activeLimit?.toString() ?? 'all'}
                  onValueChange={(value) => onLimitChange(value === 'all' ? undefined : parseInt(value, 10))}
                >
                  <SelectTrigger className="h-11 text-base w-24">
                    <SelectValue>{activeLimit ?? 'All'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-4 w-full justify-between">
              {modelCount !== undefined && <ModelCountHeader count={modelCount} />}

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
          </div>

          {/* Model List (passed as children) */}
          {children}

          {/* getModelIds call - shows the equivalent function call */}
          <div className="flex items-center justify-between gap-2 rounded border border-dashed bg-muted/30 px-3 py-2">
            <code className="text-xs font-mono text-muted-foreground">
              {`getModelIds(${activeFilters[0] ? `'${activeFilters[0]}'` : 'undefined'}, '${activeSort}'${activeLimit ? `, ${activeLimit}` : ''})`}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const call = `getModelIds(${activeFilters[0] ? `'${activeFilters[0]}'` : ''}, '${activeSort}'${activeLimit ? `, ${activeLimit}` : ''})`;
                await navigator.clipboard.writeText(call);
                toast.success('Function call copied');
              }}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Get Your API Key (placeholder) */}
      <div id="get-api-key" className="space-y-3 scroll-mt-20">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">{showBrowseModels ? 3 : 2}</span>
          <h3 className="text-2xl font-semibold">Get Your API Key</h3>
        </div>
        <p className="text-muted-foreground">
          Get an API key to access the Free Models API. This helps us track usage and improve the service.
        </p>
        <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">API key authentication coming soon</p>
        </div>
      </div>

      {/* Step 4: Copy free-models.ts */}
      <div id="copy-file" className="space-y-3 scroll-mt-20">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">{showBrowseModels ? 4 : 3}</span>
          <h3 className="text-2xl font-semibold">Copy <code className="font-mono text-xl bg-muted px-1.5 py-0.5 rounded">free-models.ts</code></h3>
        </div>
        <p className="text-muted-foreground">
          This helper fetches free model IDs from our API and reports issues back. It's a single file with no dependencies.
        </p>
        <CodeBlock code={snippet} copyLabel="Copy" />
      </div>

      {/* Step 5: Use It */}
      <div id="use-it" className="space-y-3 scroll-mt-20">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">{showBrowseModels ? 5 : 4}</span>
          <h3 className="text-2xl font-semibold">Use It</h3>
        </div>
        <p className="text-muted-foreground">
          Loop through models until one succeeds. Free models may be rate-limited, so we try multiple and optionally fall back to stable models you trust. See{' '}
          <a href="#code-examples" className="text-primary hover:underline">Code Examples</a> for more patterns.
        </p>
        <CodeBlock code={`// 1. Fetch free models with your selected filter and sort
const freeModels = await getModelIds('${activeFilters[0] || 'tools'}', '${activeSort}'${activeLimit ? `, ${activeLimit}` : ', 5'});

// 2. Add stable fallback models you trust (usually paid)
const stableFallback = ['anthropic/claude-3.5-sonnet'];
const models = [...freeModels, ...stableFallback];

// 3. Try models until one succeeds
for (const id of models) {
  try {
    // Use any OpenAI-compatible SDK
    return await client.chat.completions.create({ model: id, messages });
  } catch (e) {
    // Report failures to help improve the free model list
    reportIssue(id, 'error', e.message);
  }
}`} copyLabel="Copy" />
      </div>
    </div>
  );
}
