import { useState } from 'react';
import { useHistory, type ApiRequestLog, type FeedbackItem } from '@/hooks/useHistory';
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Clock, FileText, RefreshCw } from 'lucide-react';

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

function getStatusBadgeVariant(statusCode: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (statusCode >= 200 && statusCode < 300) return 'default';
  if (statusCode >= 400 && statusCode < 500) return 'secondary';
  if (statusCode >= 500) return 'destructive';
  return 'outline';
}

function RequestHistoryTable() {
  const { items, pagination, isLoading, error, nextPage, prevPage, goToPage, refresh } =
    useHistory<ApiRequestLog>('requests', 15);

  if (isLoading && items.length === 0) {
    return <p className="text-center text-muted-foreground py-8">Loading request history...</p>;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={refresh}>
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
            <TableHead>Endpoint</TableHead>
            <TableHead>API Key</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Time</TableHead>
            <TableHead className="text-right">Response</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {item.method}
                  </Badge>
                  <code className="text-sm truncate max-w-[200px]">{item.endpoint}</code>
                </div>
              </TableCell>
              <TableCell>
                <code className="text-xs text-muted-foreground">
                  {item.apiKeyName || item.apiKeyPrefix || 'Deleted'}
                </code>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(item.statusCode)}>
                  {item.statusCode}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatTimeAgo(item.createdAt)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground text-sm">
                {item.responseTimeMs ? `${item.responseTimeMs}ms` : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {pagination.total > pagination.limit && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={prevPage}
                className={pagination.page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink isActive>
                {pagination.page} / {Math.ceil(pagination.total / pagination.limit)}
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={nextPage}
                className={!pagination.hasMore ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

function UsageReportsTable() {
  const { items, pagination, isLoading, error, nextPage, prevPage, refresh } =
    useHistory<FeedbackItem>('feedback', 15);

  if (isLoading && items.length === 0) {
    return <p className="text-center text-muted-foreground py-8">Loading usage reports...</p>;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={refresh}>
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
            <TableHead>Model</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <code className="text-sm truncate max-w-[200px] block">{item.modelId}</code>
              </TableCell>
              <TableCell>
                {item.isSuccess ? (
                  <Badge variant="default">Success</Badge>
                ) : (
                  <Badge variant="destructive">{item.issue || 'Error'}</Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                {item.details || '-'}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatTimeAgo(item.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {pagination.total > pagination.limit && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={prevPage}
                className={pagination.page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink isActive>
                {pagination.page} / {Math.ceil(pagination.total / pagination.limit)}
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={nextPage}
                className={!pagination.hasMore ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

export function HistoryTab() {
  const [activeSection, setActiveSection] = useState<'requests' | 'reports'>('requests');

  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>
          View your API request history and usage reports
        </CardDescription>
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant={activeSection === 'requests' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveSection('requests')}
          >
            <Clock className="h-4 w-4 mr-2" />
            API Requests
          </Button>
          <Button
            variant={activeSection === 'reports' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveSection('reports')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Usage Reports
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activeSection === 'requests' ? <RequestHistoryTable /> : <UsageReportsTable />}
      </CardContent>
    </Card>
  );
}
