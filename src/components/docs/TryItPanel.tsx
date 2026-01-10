import { useState } from 'react';
import { CodeBlock } from '@/components/ui/code-block';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModelControls } from '@/components/ModelControls';
import type { FilterType, SortType } from '@/lib/api-definitions';
import { Loader2 } from 'lucide-react';
import {
  DEFAULT_SORT,
  DEFAULT_FILTER,
  DEFAULT_LIMIT,
  DEFAULT_TIME_WINDOW,
  DEFAULT_USER_ONLY,
} from '@/lib/api-definitions';

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
  const [activeFilters, setActiveFilters] = useState<FilterType[]>(DEFAULT_FILTER);
  const [activeSort, setActiveSort] = useState<SortType>(DEFAULT_SORT);
  const [activeLimit, setActiveLimit] = useState<number | undefined>(DEFAULT_LIMIT);
  const [activeExcludeWithIssues, setActiveExcludeWithIssues] = useState(Infinity);
  const [activeTimeWindow, setActiveTimeWindow] = useState(DEFAULT_TIME_WINDOW);
  const [activeUserOnly, setActiveUserOnly] = useState(DEFAULT_USER_ONLY);
  const [apiKey, setApiKey] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const canSend = apiKey.trim().length > 0;

  const toggleFilter = (filter: FilterType | 'all') => {
    if (filter === 'all') {
      setActiveFilters([]);
    } else {
      setActiveFilters((prev) =>
        prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
      );
    }
  };

  const buildUrl = () => {
    const params = new URLSearchParams();
    if (activeFilters.length > 0) params.set('filter', activeFilters.join(','));
    params.set('sort', activeSort);
    if (activeLimit) params.set('limit', String(activeLimit));
    if (activeExcludeWithIssues !== Infinity) params.set('excludeWithIssues', String(activeExcludeWithIssues));
    if (activeTimeWindow !== '24h') params.set('timeWindow', activeTimeWindow);
    if (activeUserOnly) params.set('userOnly', 'true');
    return `${endpoint}?${params.toString()}`;
  };

  const buildCurlCommand = () => {
    const token = apiKey.trim() || 'YOUR_API_KEY';
    const authHeader = `-H "Authorization: Bearer ${token}" \\`;
    if (method === 'POST') {
      const body = defaultBody ? JSON.stringify(defaultBody, null, 2) : '{}';
      return `curl -X POST ${BASE_URL}${endpoint} \\
  ${authHeader}
  -H "Content-Type: application/json" \\
  -d '${body.replace(/\n/g, '\n  ')}'`;
    }
    return `curl ${BASE_URL}${buildUrl()} \\
  ${authHeader}`;
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
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
        },
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
          <Button size="sm" onClick={handleSend} disabled={loading || !canSend}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
          </Button>
        </div>

        <div className="px-4 py-3 border-b">
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">API Key</span>
            <Input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="fma_..."
              type="text"
              className="h-8 text-sm"
              autoComplete="off"
            />
          </div>
          {!canSend && (
            <p className="mt-2 text-xs text-muted-foreground">
              Required to send requests.
            </p>
          )}
        </div>

        {/* Filter/Sort selectors (for GET) */}
        {method === 'GET' && (
          <div className="px-4 py-3 border-b">
            <ModelControls
              activeFilters={activeFilters}
              activeSort={activeSort}
              activeLimit={activeLimit}
              activeExcludeWithIssues={activeExcludeWithIssues}
              activeTimeWindow={activeTimeWindow}
              activeUserOnly={activeUserOnly}
              onToggleFilter={toggleFilter}
              onSortChange={setActiveSort}
              onLimitChange={setActiveLimit}
              onExcludeWithIssuesChange={setActiveExcludeWithIssues}
              onTimeWindowChange={(value) => setActiveTimeWindow(value as any)}
              onUserOnlyChange={setActiveUserOnly}
              size="sm"
            />
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
