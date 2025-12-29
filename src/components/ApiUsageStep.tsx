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
  getFullApiUrl,
  FILTERS,
  SORT_OPTIONS,
  type FilterType,
  type SortType,
} from '@/hooks/useModels';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface ApiUsageStepProps {
  apiUrl: string;
  activeFilters: FilterType[];
  activeSort: SortType;
  onToggleFilter: (filter: FilterType | 'all') => void;
  onSortChange: (sort: SortType) => void;
  modelCount?: number;
  showBrowseModels?: boolean;
  children?: React.ReactNode;
}

export function ApiUsageStep({
  apiUrl,
  activeFilters,
  activeSort,
  onToggleFilter,
  onSortChange,
  modelCount,
  showBrowseModels = true,
  children,
}: ApiUsageStepProps) {
  const fullUrl = getFullApiUrl(apiUrl);
  const snippet = generateSnippet(apiUrl);

  const copyUrl = async () => {
    await navigator.clipboard.writeText(fullUrl);
    toast.success('API URL copied to clipboard');
  };

  const filterLabel = activeFilters.length === 0
    ? 'All'
    : activeFilters.length === 1
      ? FILTERS.find(f => f.key === activeFilters[0])?.label || activeFilters[0]
      : `${activeFilters.length} selected`;

  const sortLabel = SORT_OPTIONS.find(s => s.key === activeSort)?.label || activeSort;

  return (
    <div className="w-full space-y-8">
      {/* Browse Models Section */}
      {showBrowseModels && (
        <div id="models" className="scroll-mt-20 space-y-6">
          {/* Header */}
          <h3 className="text-2xl font-semibold">Browse Models</h3>

          {/* Filter, Sort Controls and Model Count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filter:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      {filterLabel}
                      <ChevronDown className="h-4 w-4 opacity-50" />
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

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort:</span>
                <Select value={activeSort} onValueChange={(value) => onSortChange(value as SortType)}>
                  <SelectTrigger size="sm">
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
            </div>

            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{modelCount}</span> free models available
            </p>
          </div>

          {/* API Endpoint Display */}
          <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2">
            <code className="text-xs font-mono text-primary break-all">{fullUrl}</code>
            <Button variant="ghost" size="sm" onClick={copyUrl} className="shrink-0">
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

          {/* Model List (passed as children) */}
          {children}
        </div>
      )}

      {/* Step 1: Get an OpenRouter API Key */}
      <div id="step-1" className="space-y-3 scroll-mt-20">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">1</span>
          <h3 className="text-2xl font-semibold">Get an OpenRouter API Key</h3>
        </div>
        <p className="ml-10 text-muted-foreground">
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

      {/* Step 2: Fetch the models */}
      <div id="step-2" className="space-y-3 scroll-mt-20">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">2</span>
          <h3 className="text-2xl font-semibold">Fetch Free Models</h3>
        </div>
        <p className="ml-10 text-muted-foreground">
          Add this to your app to fetch the list of available free models.
        </p>
        <div className="ml-10">
          <CodeBlock code={snippet} copyLabel="Copy" />
        </div>
      </div>

      {/* Step 3: Pass model IDs */}
      <div id="step-3" className="space-y-3 scroll-mt-20">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">3</span>
          <h3 className="text-2xl font-semibold">Pass Model IDs to OpenRouter</h3>
        </div>
        <p className="ml-10 text-muted-foreground">
          Pass the model IDs to OpenRouter. It will automatically try each model in order until one responds.
        </p>
        <div className="ml-10">
          <CodeBlock code="models: modelIds" copyLabel="Copy" />
        </div>
      </div>
    </div>
  );
}
