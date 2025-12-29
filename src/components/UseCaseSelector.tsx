import { Button } from '@/components/ui/button';
import { FILTERS, type FilterType } from '@/hooks/useModels';

interface UseCaseSelectorProps {
  activeFilters: FilterType[];
  onToggleFilter: (filter: FilterType | 'all') => void;
  modelCount: number;
  onConfirm?: () => void;
}

export function UseCaseSelector({
  activeFilters,
  onToggleFilter,
  modelCount,
  onConfirm,
}: UseCaseSelectorProps) {
  return (
    <div className="space-y-6">
      {/* Filter Buttons + Confirm */}
      <div className="flex flex-wrap justify-center items-center gap-3">
        {FILTERS.map((filter) => {
          const isActive =
            filter.key === 'all' ? activeFilters.length === 0 : activeFilters.includes(filter.key as FilterType);
          return (
            <Button
              key={filter.key}
              variant={isActive ? 'default' : 'outline'}
              size="lg"
              onClick={() => onToggleFilter(filter.key)}
            >
              {filter.label}
            </Button>
          );
        })}
        {onConfirm && (
          <Button size="lg" onClick={onConfirm} className="ml-2">
            Continue
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-1"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Button>
        )}
      </div>

      {/* Model Count */}
      <p className="text-muted-foreground">
        <span className="font-semibold text-foreground">{modelCount}</span> free models
      </p>
    </div>
  );
}
