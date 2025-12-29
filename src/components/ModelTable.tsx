import { Button } from '@/components/ui/button';
import { useModels, FILTERS, SORT_OPTIONS, type FilterType } from '@/hooks/useModels';
import { ModelList } from '@/components/ModelList';

/**
 * Standalone ModelTable component with filters, sort, and model list.
 * This is a simpler non-onboarding version that can be used on other pages.
 */
export function ModelTable() {
  const {
    models,
    loading,
    error,
    activeFilters,
    activeSort,
    toggleFilter,
    setActiveSort,
  } = useModels();

  return (
    <div className="space-y-6">
      {/* Filters & Sort Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground mr-1">Filter:</span>
          {FILTERS.map((filter) => {
            const isActive =
              filter.key === 'all'
                ? activeFilters.length === 0
                : activeFilters.includes(filter.key as FilterType);
            return (
              <Button
                key={filter.key}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleFilter(filter.key)}
              >
                {filter.label}
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by</span>
          <select
            value={activeSort}
            onChange={(e) => setActiveSort(e.target.value as typeof activeSort)}
            className="rounded-lg border bg-card px-3 py-1.5 text-sm font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Models Count */}
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{models.length}</span> free models
      </p>

      {/* Model List */}
      <ModelList models={models} loading={loading} error={error} />
    </div>
  );
}
