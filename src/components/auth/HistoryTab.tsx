import { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';
import {
  useHistory,
  type ApiRequestLog,
  type FeedbackItem,
  type UnifiedHistoryItem,
  type LinkedFeedbackItem,
} from '@/hooks/useHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, RefreshCw, ChevronDown, Key } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getStatusBadgeVariant(
  statusCode: number
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (statusCode >= 200 && statusCode < 300) return 'default';
  if (statusCode >= 400 && statusCode < 500) return 'secondary';
  if (statusCode >= 500) return 'destructive';
  return 'outline';
}

interface ParsedResponseData {
  ids: string[];
  count: number;
  params?: {
    useCases?: string[];
    sort?: string;
    topN?: number;
    maxErrorRate?: number;
    timeRange?: string;
    myReports?: boolean;
  };
}

function parseResponseData(responseData: string | null): ParsedResponseData | null {
  if (!responseData) return null;
  try {
    return JSON.parse(responseData);
  } catch {
    return null;
  }
}

function formatParams(params: ParsedResponseData['params']): string {
  if (!params) return '-';
  const parts: string[] = [];
  if (params.useCases?.length) parts.push(params.useCases.join(', '));
  if (params.sort) parts.push(params.sort);
  if (params.topN) parts.push(`top${params.topN}`);
  if (params.maxErrorRate !== undefined) parts.push(`err<${params.maxErrorRate}`);
  if (params.timeRange) parts.push(params.timeRange);
  if (params.myReports) parts.push('myReports');
  return parts.length > 0 ? parts.join(', ') : '-';
}

function TruncatedWithTooltip({ text, className }: { text: string; className?: string }) {
  if (text === '-' || text.length < 30) {
    return <span className={className}>{text}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`cursor-help ${className || ''}`}>{text}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs wrap-break-word">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function SeeMoreButton({
  hasMore,
  isFetchingMore,
  onLoadMore,
}: {
  hasMore: boolean;
  isFetchingMore: boolean;
  onLoadMore: () => void;
}) {
  if (!hasMore) return null;

  return (
    <div className="flex justify-center pt-4">
      <Button variant="outline" onClick={onLoadMore} disabled={isFetchingMore}>
        {isFetchingMore ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4 mr-2" />
            See More
          </>
        )}
      </Button>
    </div>
  );
}

function RequestHistoryTable({ enabled, apiKeyId }: { enabled?: boolean; apiKeyId?: string | null }) {
  const { items, hasMore, isLoading, isFetchingMore, error, loadMore, refresh } =
    useHistory<ApiRequestLog>('requests', 15, { enabled, apiKeyId });

  if (isLoading && items.length === 0) {
    return <p className="text-center text-muted-foreground py-8">Loading request history...</p>;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={() => refresh()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No API requests yet. Make your first API call to see it here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Target</TableHead>
            <TableHead>API Key</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const responseData = parseResponseData(item.responseData);
            return (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {item.method}
                    </Badge>
                    <code className="text-sm truncate max-w-50">{item.endpoint}</code>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs text-muted-foreground">
                    {item.apiKeyName || item.apiKeyPrefix || 'Deleted'}
                  </code>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(item.statusCode)}>{item.statusCode}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatTimeAgo(item.createdAt)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-50 truncate">
                  <TruncatedWithTooltip text={formatParams(responseData?.params)} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <SeeMoreButton hasMore={hasMore} isFetchingMore={isFetchingMore} onLoadMore={loadMore} />
    </div>
  );
}

function UsageReportsTable({ enabled, apiKeyId }: { enabled?: boolean; apiKeyId?: string | null }) {
  const { items, hasMore, isLoading, isFetchingMore, error, loadMore, refresh } =
    useHistory<FeedbackItem>('feedback', 15, { enabled, apiKeyId });

  if (isLoading && items.length === 0) {
    return <p className="text-center text-muted-foreground py-8">Loading usage reports...</p>;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={() => refresh()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No usage reports yet. Report model successes or issues to see them here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Target</TableHead>
            <TableHead>API Key</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <code className="text-sm truncate max-w-50 block">{item.modelId}</code>
              </TableCell>
              <TableCell>
                <code className="text-xs text-muted-foreground">
                  {item.apiKeyName || item.apiKeyPrefix || '-'}
                </code>
              </TableCell>
              <TableCell>
                {item.isSuccess ? (
                  <Badge variant="default">Success</Badge>
                ) : (
                  <Badge variant="destructive">{item.issue || 'Error'}</Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatTimeAgo(item.createdAt)}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm max-w-50 truncate">
                <TruncatedWithTooltip text={item.details || '-'} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <SeeMoreButton hasMore={hasMore} isFetchingMore={isFetchingMore} onLoadMore={loadMore} />
    </div>
  );
}

function RequestRow({ item }: { item: UnifiedHistoryItem }) {
  const responseData = parseResponseData(item.responseData);

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {item.method}
          </Badge>
          <code className="text-sm truncate max-w-50">{item.endpoint}</code>
        </div>
      </TableCell>
      <TableCell>
        <code className="text-xs text-muted-foreground">
          {item.apiKeyName || item.apiKeyPrefix || 'Deleted'}
        </code>
      </TableCell>
      <TableCell>
        <Badge variant={getStatusBadgeVariant(item.statusCode!)}>{item.statusCode}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {formatTimeAgo(item.createdAt)}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm max-w-50 truncate">
        <TruncatedWithTooltip text={formatParams(responseData?.params)} />
      </TableCell>
    </TableRow>
  );
}

function FeedbackRow({ item }: { item: UnifiedHistoryItem }) {
  return (
    <TableRow>
      <TableCell>
        <code className="text-sm truncate max-w-50">{item.modelId}</code>
      </TableCell>
      <TableCell>
        <span className="text-muted-foreground">-</span>
      </TableCell>
      <TableCell>
        {item.isSuccess ? (
          <Badge variant="default">Success</Badge>
        ) : (
          <Badge variant="destructive">{item.issue || 'Error'}</Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {formatTimeAgo(item.createdAt)}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm max-w-50 truncate">
        <TruncatedWithTooltip text={item.details || '-'} />
      </TableCell>
    </TableRow>
  );
}

function ChildFeedbackRow({ feedback, isUsed }: { feedback: LinkedFeedbackItem; isUsed: boolean }) {
  return (
    <TableRow className={isUsed ? 'bg-green-500/5' : 'bg-muted/20'}>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">↳</span>
          <code className="text-sm truncate max-w-50">{feedback.modelId}</code>
          {isUsed && <span className="text-xs text-green-600 font-medium">used</span>}
        </div>
      </TableCell>
      <TableCell>
        <span className="text-muted-foreground">-</span>
      </TableCell>
      <TableCell>
        {feedback.isSuccess ? (
          <Badge variant="default">Success</Badge>
        ) : (
          <Badge variant="destructive">{feedback.issue || 'Error'}</Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {feedback.createdAt ? formatTimeAgo(feedback.createdAt) : '-'}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm max-w-50 truncate">
        <TruncatedWithTooltip text={feedback.details || '-'} />
      </TableCell>
    </TableRow>
  );
}

function UnifiedHistoryRows({ items }: { items: UnifiedHistoryItem[] }) {
  return (
    <>
      {items.flatMap((item): React.ReactElement[] => {
        if (item.type === 'request') {
          const usedModelId = item.linkedFeedback?.find((f) => f.isSuccess)?.modelId;
          const rows: React.ReactElement[] = [<RequestRow key={item.id} item={item} />];

          if (item.linkedFeedback?.length) {
            rows.push(
              ...item.linkedFeedback.map((fb) => (
                <ChildFeedbackRow
                  key={fb.id}
                  feedback={fb}
                  isUsed={fb.modelId === usedModelId}
                />
              ))
            );
          }

          return rows;
        }

        // Unlinked feedback
        return [<FeedbackRow key={item.id} item={item} />];
      })}
    </>
  );
}

function UnifiedHistoryTable({ enabled, apiKeyId }: { enabled?: boolean; apiKeyId?: string | null }) {
  const { items, hasMore, isLoading, isFetchingMore, error, loadMore, refresh } =
    useHistory<UnifiedHistoryItem>('unified', 15, { enabled, apiKeyId });

  if (isLoading && items.length === 0) {
    return <p className="text-center text-muted-foreground py-8">Loading activity...</p>;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={() => refresh()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No activity yet. Make API calls or report model usage to see them here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Target</TableHead>
            <TableHead>API Key</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <UnifiedHistoryRows items={items} />
        </TableBody>
      </Table>

      <SeeMoreButton hasMore={hasMore} isFetchingMore={isFetchingMore} onLoadMore={loadMore} />
    </div>
  );
}

export function HistoryTab({ isSessionReady }: { isSessionReady?: boolean }) {
  const [filter, setFilter] = useState<'unified' | 'requests' | 'feedback'>('unified');
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string }[]>([]);
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string | null>(null);

  useEffect(() => {
    if (isSessionReady) {
      authClient.apiKey.list().then((res) => {
        if (res.data) {
          setApiKeys(res.data.map((k) => ({ id: k.id, name: k.name || 'Unnamed' })));
        }
      });
    }
  }, [isSessionReady]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>View your API request history and usage reports</CardDescription>
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant={filter === 'unified' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unified')}
          >
            All Activity
          </Button>
          <Button
            variant={filter === 'requests' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('requests')}
          >
            <Clock className="h-4 w-4 mr-2" />
            Requests
          </Button>
          <Button
            variant={filter === 'feedback' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('feedback')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Feedback
          </Button>
          <div className="flex-1" />
          <Select
            value={selectedApiKeyId || 'all'}
            onValueChange={(v) => setSelectedApiKeyId(v === 'all' ? null : v)}
          >
            <SelectTrigger size="sm" className="w-45">
              <Key className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All API Keys" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All API Keys</SelectItem>
              {apiKeys.map((key) => (
                <SelectItem key={key.id} value={key.id}>
                  {key.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Keep all components mounted to prevent refetching on filter switch */}
        <div className={filter === 'unified' ? '' : 'hidden'}>
          <UnifiedHistoryTable enabled={isSessionReady} apiKeyId={selectedApiKeyId} />
        </div>
        <div className={filter === 'requests' ? '' : 'hidden'}>
          <RequestHistoryTable enabled={isSessionReady} apiKeyId={selectedApiKeyId} />
        </div>
        <div className={filter === 'feedback' ? '' : 'hidden'}>
          <UsageReportsTable enabled={isSessionReady} apiKeyId={selectedApiKeyId} />
        </div>
      </CardContent>
    </Card>
  );
}
