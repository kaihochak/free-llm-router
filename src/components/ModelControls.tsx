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
import { ChevronDown } from 'lucide-react';

interface ModelControlsProps {
  activeFilters: FilterType[];
  activeSort: SortType;
  activeLimit?: number;
  onToggleFilter: (filter: FilterType | 'all') => void;
  onSortChange: (sort: SortType) => void;
  onLimitChange?: (limit: number | undefined) => void;
  size?: 'sm' | 'lg';
  className?: string;
}

export function ModelControls({
  activeFilters,
  activeSort,
  activeLimit,
  onToggleFilter,
  onSortChange,
  onLimitChange,
  size = 'lg',
  className,
}: ModelControlsProps) {
  const filterLabel = activeFilters.length === 0
    ? 'All'
    : activeFilters.length === 1
      ? FILTERS.find(f => f.key === activeFilters[0])?.label || activeFilters[0]
      : `${activeFilters.length} selected`;

  const sortLabel = SORT_OPTIONS.find(s => s.key === activeSort)?.label || activeSort;
  const isSmall = size === 'sm';
  const rootClassName = `flex flex-wrap items-center ${
    isSmall ? 'gap-x-1 gap-y-2' : 'gap-x-4 gap-y-3 sm:gap-x-6 sm:gap-y-4'
  }${className ? ` ${className}` : ''}`;

  return (
    <div className={rootClassName}>
      <div className={isSmall ? 'flex flex-col gap-1' : 'flex items-center gap-3'}>
        <span className={isSmall ? 'text-[11px] text-muted-foreground' : 'text-base font-medium sm:text-lg'}>Filter:</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size={isSmall ? 'sm' : 'lg'}
              className={isSmall ? 'gap-2 h-8' : 'gap-2 h-10 text-sm sm:h-11 sm:text-base'}
            >
              {filterLabel}
              <ChevronDown className={isSmall ? 'h-3 w-3 opacity-50' : 'h-5 w-5 opacity-50'} />
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

      <div className={isSmall ? 'flex flex-col gap-1' : 'flex items-center gap-3'}>
        <span className={isSmall ? 'text-[11px] text-muted-foreground' : 'text-base font-medium sm:text-lg'}>Sort:</span>
        <Select value={activeSort} onValueChange={(value) => onSortChange(value as SortType)}>
          <SelectTrigger className={isSmall ? 'h-8 text-sm w-auto' : 'h-10 w-full text-sm sm:h-11 sm:w-auto sm:min-w-40 sm:text-base'}>
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
        <div className={isSmall ? 'flex flex-col gap-1' : 'flex items-center gap-3'}>
          <span className={isSmall ? 'text-[11px] text-muted-foreground' : 'text-base font-medium sm:text-lg'}>Limit:</span>
          <Select
            value={activeLimit?.toString() ?? 'all'}
            onValueChange={(value) => onLimitChange(value === 'all' ? undefined : parseInt(value, 10))}
          >
            <SelectTrigger className={isSmall ? 'h-8 text-sm w-20' : 'h-10 w-full text-sm sm:h-11 sm:w-24 sm:text-base'}>
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
    </div>
  );
}
