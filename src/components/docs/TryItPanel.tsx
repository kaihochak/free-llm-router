import { useState } from 'react';
import { CodeBlock } from '@/components/ui/code-block';
import { Button } from '@/components/ui/button';
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
import { FILTERS, SORT_OPTIONS, type FilterType, type SortType } from '@/hooks/useModels';
import { ChevronDown, Loader2 } from 'lucide-react';

const BASE_URL = 'https://free-models-api.pages.dev';

interface TryItPanelProps {
  endpoint: string;
  method: 'GET' | 'POST';
  defaultBody?: object;
  exampleResponse: string;
}

export function TryItPanel({
  endpoint,
  method,
  defaultBody,
  exampleResponse,
}: TryItPanelProps) {
  const [activeFilters, setActiveFilters] = useState<FilterType[]>([]);
  const [activeSort, setActiveSort] = useState<SortType>('contextLength');
  const [response, setResponse] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleFilter = (filter: FilterType | 'all') => {
    if (filter === 'all') {
      setActiveFilters([]);
    } else {
      setActiveFilters((prev) =>
        prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
      );
    }
  };

  const filterLabel =
    activeFilters.length === 0
      ? 'All'
      : activeFilters.length === 1
        ? FILTERS.find((f) => f.key === activeFilters[0])?.label || activeFilters[0]
        : `${activeFilters.length} selected`;

  const sortLabel = SORT_OPTIONS.find((s) => s.key === activeSort)?.label || activeSort;

  const buildUrl = () => {
    const params = new URLSearchParams();
    if (activeFilters.length > 0) params.set('filter', activeFilters.join(','));
    params.set('sort', activeSort);
    return `${endpoint}?${params.toString()}`;
  };

  const buildCurlCommand = () => {
    if (method === 'POST') {
      const body = defaultBody ? JSON.stringify(defaultBody, null, 2) : '{}';
      return `curl -X POST ${BASE_URL}${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '${body.replace(/\n/g, '\n  ')}'`;
    }
    return `curl ${BASE_URL}${buildUrl()}`;
  };

  const handleSend = async () => {
    setLoading(true);
    setResponse(null);
    setStatusCode(null);

    try {
      const url = method === 'GET' ? buildUrl() : endpoint;
      const body = defaultBody ? JSON.stringify(defaultBody) : undefined;
      const options: RequestInit = {
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
        body: method === 'POST' ? body : undefined,
      };

      const res = await fetch(url, options);
      setStatusCode(res.status);
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setResponse(JSON.stringify({ error: err instanceof Error ? err.message : 'Request failed' }, null, 2));
      setStatusCode(500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Request Block */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
          <h4 className="text-sm font-medium">Request</h4>
          <Button size="sm" onClick={handleSend} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
          </Button>
        </div>

        {/* Filter/Sort selectors (for GET) */}
        {method === 'GET' && (
          <div className="px-4 py-3 border-b">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Filter:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 h-8">
                      {filterLabel}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuCheckboxItem
                      checked={activeFilters.length === 0}
                      onCheckedChange={() => toggleFilter('all')}
                    >
                      All
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    {FILTERS.filter((f) => f.key !== 'all').map((filter) => (
                      <DropdownMenuCheckboxItem
                        key={filter.key}
                        checked={activeFilters.includes(filter.key as FilterType)}
                        onCheckedChange={() => toggleFilter(filter.key as FilterType)}
                      >
                        {filter.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Sort:</span>
                <Select value={activeSort} onValueChange={(value) => setActiveSort(value as SortType)}>
                  <SelectTrigger className="h-8 text-sm w-auto">
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
          </div>
        )}

        <CodeBlock code={buildCurlCommand()} language="bash" showCopy={false} className="rounded-none border-none" />
      </div>

      {/* Response Block */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
          <h4 className="text-sm font-medium">Response</h4>
          {statusCode !== null && (
            <span
              className={`text-xs font-medium ${
                statusCode >= 200 && statusCode < 300
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {statusCode}
            </span>
          )}
        </div>
        <div className="max-h-64 overflow-auto custom-scrollbar">
          <CodeBlock
            code={response || exampleResponse}
            language="json"
            showCopy={!!response}
            className="rounded-none border-none"
          />
        </div>
      </div>
    </div>
  );
}
