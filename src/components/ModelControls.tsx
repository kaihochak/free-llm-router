import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import type { FilterType, SortType } from '@/lib/api-definitions';
import {
  FILTER_DEFINITIONS,
  SORT_DEFINITIONS,
  LIMIT_DEFINITIONS,
  VALID_TIME_WINDOWS_WITH_LABELS,
  TIME_WINDOW_DEFINITIONS,
  DEFAULT_LIMIT,
  DEFAULT_EXCLUDE_WITH_ISSUES,
  DEFAULT_TIME_WINDOW,
  DEFAULT_USER_ONLY,
} from '@/lib/api-definitions';
import { ChevronDown } from 'lucide-react';

interface ModelControlsProps {
  activeFilters: FilterType[];
  activeSort: SortType;
  activeLimit?: number;
  activeExcludeWithIssues?: number;
  activeTimeWindow?: string;
  activeUserOnly?: boolean;
  onToggleFilter: (filter: FilterType | 'all') => void;
  onSortChange: (sort: SortType) => void;
  onLimitChange?: (limit: number | undefined) => void;
  onExcludeWithIssuesChange?: (value: number) => void;
  onTimeWindowChange?: (value: string) => void;
  onUserOnlyChange?: (value: boolean) => void;
  size?: 'sm' | 'lg';
}

export function ModelControls({
  activeFilters,
  activeSort,
  activeLimit = DEFAULT_LIMIT,
  activeExcludeWithIssues = DEFAULT_EXCLUDE_WITH_ISSUES,
  activeTimeWindow = DEFAULT_TIME_WINDOW,
  activeUserOnly = DEFAULT_USER_ONLY,
  onToggleFilter,
  onSortChange,
  onLimitChange,
  onExcludeWithIssuesChange,
  onTimeWindowChange,
  onUserOnlyChange,
  size = 'lg',
}: ModelControlsProps) {
  const isSmall = size === 'sm';

  const filterLabel = activeFilters.length === 0
    ? 'All'
    : activeFilters.length === 1
      ? FILTER_DEFINITIONS.find(f => f.key === activeFilters[0])?.label || activeFilters[0]
      : `${activeFilters.length} selected`;

  const sortLabel = SORT_DEFINITIONS.find(s => s.key === activeSort)?.label || activeSort;

  const labelClass = isSmall ? 'text-xs leading-4' : 'text-sm font-medium leading-5';
  const gapClass = isSmall ? 'gap-1' : 'gap-2';
  const buttonClass = isSmall ? 'h-10! min-w-[20px]' : 'h-12! min-w-[20px]';
  const chevronClass = isSmall ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <div className={`flex flex-wrap ${isSmall ? 'gap-4' : 'gap-3'}`}>
      <div className={`flex flex-col ${gapClass}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`text-muted-foreground ${labelClass} cursor-help`}>Filter</span>
          </TooltipTrigger>
          <TooltipContent>Filter models by capability (chat, vision, coding, long context, reasoning)</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size={size} className={`${buttonClass} gap-2`}>
              {filterLabel}
              <ChevronDown className={`${chevronClass} opacity-50`} />
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
            {FILTER_DEFINITIONS.filter(f => f.key !== 'all').map((filter) => (
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

      <div className={`flex flex-col ${gapClass}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`text-muted-foreground ${labelClass} cursor-help`}>Sort</span>
          </TooltipTrigger>
          <TooltipContent>Sort models by context length, max output, name, provider, or capabilities</TooltipContent>
        </Tooltip>
        <Select value={activeSort} onValueChange={(value) => onSortChange(value as SortType)}>
          <SelectTrigger className={`w-auto ${buttonClass}`}>
            <SelectValue>{sortLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SORT_DEFINITIONS.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {onLimitChange && (
        <div className={`flex flex-col ${gapClass} `}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`text-muted-foreground ${labelClass} cursor-help`}>Limit</span>
            </TooltipTrigger>
            <TooltipContent>Maximum number of models to display</TooltipContent>
          </Tooltip>
          <Select
            value={activeLimit?.toString() ?? 'all'}
            onValueChange={(value) => onLimitChange(value === 'all' ? undefined : parseInt(value, 10))}
          >
            <SelectTrigger className={`w-20 ${buttonClass}`}>
              <SelectValue>{activeLimit ?? 'All'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LIMIT_DEFINITIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {onExcludeWithIssuesChange && (
        <div className={`flex flex-col ${gapClass}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`text-muted-foreground ${labelClass} cursor-help`}>Max Issues</span>
            </TooltipTrigger>
            <TooltipContent>Exclude models with more reported issues than this threshold</TooltipContent>
          </Tooltip>
          <Input
            type="number"
            min="0"
            value={activeExcludeWithIssues}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              if (!isNaN(value)) {
                onExcludeWithIssuesChange(Math.max(0, value));
              }
            }}
            className={`w-20 ${buttonClass}`}
            placeholder="0"
          />
        </div>
      )}

      {onTimeWindowChange && (
        <div className={`flex flex-col ${gapClass}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`text-muted-foreground ${labelClass} cursor-help`}>Time</span>
            </TooltipTrigger>
            <TooltipContent>Time window for tracking model issues and feedback</TooltipContent>
          </Tooltip>
          <Select value={activeTimeWindow} onValueChange={onTimeWindowChange}>
            <SelectTrigger className={`w-20 ${buttonClass}`}>
              <SelectValue>{activeTimeWindow}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TIME_WINDOW_DEFINITIONS.filter(tw => VALID_TIME_WINDOWS_WITH_LABELS.includes(tw.value)).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {onUserOnlyChange && (
        <div className={`flex flex-col ${gapClass}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`text-muted-foreground ${labelClass} cursor-help`}>My Reports Only</span>
            </TooltipTrigger>
            <TooltipContent>Show only issues you have reported</TooltipContent>
          </Tooltip>
          <Button
            variant={activeUserOnly ? 'default' : 'outline'}
            size={size}
            className={buttonClass}
            onClick={() => onUserOnlyChange(!activeUserOnly)}
          >
            {activeUserOnly ? 'On' : 'Off'}
          </Button>
        </div>
      )}
    </div>
  );
}
