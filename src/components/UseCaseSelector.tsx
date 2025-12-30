import { Button } from '@/components/ui/button';
import { FILTERS, type FilterType } from '@/hooks/useModels';
import { ChevronRight } from 'lucide-react';

interface UseCaseSelectorProps {
  activeFilters: FilterType[];
  onToggleFilter: (filter: FilterType | 'all') => void;
  onConfirm?: () => void;
}

export function UseCaseSelector({
  activeFilters,
  onToggleFilter,
  onConfirm,
}: UseCaseSelectorProps) {
  return (
    <div className="space-y-6">
      {/* Filter Buttons + Continue */}
      <div className="flex flex-wrap justify-center items-center gap-2">
        {FILTERS.map((filter) => {
          const isActive =
            filter.key === 'all' ? activeFilters.length === 0 : activeFilters.includes(filter.key as FilterType);
          return (
            <Button
              key={filter.key}
              variant={isActive ? 'secondary' : 'outline'}
              size="xl"
              onClick={() => onToggleFilter(filter.key)}
            >
              {filter.label}
            </Button>
          );
        })}
        {onConfirm && (
          <Button size="xl" onClick={onConfirm} variant="default">
            Continue
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
