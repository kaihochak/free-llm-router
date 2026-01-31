import { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import type { AvailabilityData } from '@/hooks/useAvailability';

interface AvailabilityMatrixProps {
  models: AvailabilityData[];
  dates: string[];
  loading?: boolean;
  error?: string | null;
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00Z');
  return date.getUTCDate().toString();
}

function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00Z');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function formatMonthHeader(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00Z');
  return date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
}

function getAvailableDaysCount(model: AvailabilityData, dates: string[]): number {
  return dates.filter((date) => model.availability[date] === true).length;
}

function getShortModelName(name: string): string {
  // Remove provider prefix (e.g., "meta-llama/" or "google/") and ":free" suffix
  return name.replace(/^[^/]+\//, '').replace(/:free$/, '');
}

export function AvailabilityMatrix({ models, dates, loading, error }: AvailabilityMatrixProps) {
  // Show last 30 days by default, with pagination options
  const [visibleDays, setVisibleDays] = useState(30);

  const visibleDates = useMemo(() => {
    return dates.slice(-visibleDays);
  }, [dates, visibleDays]);

  // Group dates by month for header
  const monthHeaders = useMemo(() => {
    const headers: { month: string; startIndex: number; span: number }[] = [];
    let currentMonth = '';
    let currentStart = 0;

    visibleDates.forEach((date, index) => {
      const month = formatMonthHeader(date);
      if (month !== currentMonth) {
        if (currentMonth) {
          headers.push({ month: currentMonth, startIndex: currentStart, span: index - currentStart });
        }
        currentMonth = month;
        currentStart = index;
      }
    });

    // Add last month
    if (currentMonth) {
      headers.push({
        month: currentMonth,
        startIndex: currentStart,
        span: visibleDates.length - currentStart,
      });
    }

    return headers;
  }, [visibleDates]);

  if (loading && models.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        Loading availability data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-destructive">Error: {error}</div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        No availability data yet. Data will appear after the first model sync from OpenRouter.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {/* Month header row */}
            <TableRow className="border-b-0">
              <TableHead className="sticky left-0 z-20 bg-card" />
              <TableHead className="bg-card" />
              {monthHeaders.map((header, idx) => (
                <TableHead
                  key={`${header.month}-${idx}`}
                  colSpan={header.span}
                  className="text-center text-xs font-normal text-muted-foreground bg-card border-b-0"
                >
                  {header.month}
                </TableHead>
              ))}
            </TableRow>
            {/* Day header row */}
            <TableRow>
              <TableHead className="sticky left-0 z-20 bg-card min-w-[180px]">Model</TableHead>
              <TableHead className="text-right min-w-[60px] bg-card">Days</TableHead>
              {visibleDates.map((date) => (
                <TableHead key={date} className="text-center px-0.5 min-w-[20px] bg-card">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-[10px] text-muted-foreground cursor-help">
                        {formatDateShort(date)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{formatDateFull(date)}</TooltipContent>
                  </Tooltip>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map((model) => {
              const daysAvailable = getAvailableDaysCount(model, visibleDates);

              return (
                <TableRow key={model.modelId}>
                  <TableCell className="sticky left-0 z-10 bg-card font-medium">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="truncate block max-w-[180px] cursor-help text-sm">
                          {getShortModelName(model.modelName)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{model.modelName}</p>
                        <p className="text-xs opacity-80">{model.modelId}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                    {daysAvailable}
                  </TableCell>
                  {visibleDates.map((date) => {
                    const isAvailable = model.availability[date];

                    return (
                      <TableCell key={date} className="text-center px-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-3 h-3 rounded-sm mx-auto ${
                                isAvailable === undefined
                                  ? 'bg-muted'
                                  : isAvailable
                                    ? 'bg-emerald-500'
                                    : 'bg-red-500'
                              }`}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{formatDateFull(date)}</p>
                            <p className="font-medium">
                              {isAvailable === undefined
                                ? 'No data'
                                : isAvailable
                                  ? 'Available'
                                  : 'Unavailable'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls for date range */}
      {dates.length > 30 && (
        <div className="flex justify-center gap-2 p-4 border-t">
          <Button
            variant={visibleDays === 30 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setVisibleDays(30)}
          >
            30 days
          </Button>
          <Button
            variant={visibleDays === 60 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setVisibleDays(60)}
          >
            60 days
          </Button>
          <Button
            variant={visibleDays === 90 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setVisibleDays(90)}
          >
            90 days
          </Button>
        </div>
      )}
    </div>
  );
}
