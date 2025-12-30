import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useModels, FILTERS, SORT_OPTIONS, type FilterType } from '@/hooks/useModels';
import { ModelList } from '@/components/ModelList';
import { QueryProvider } from '@/components/QueryProvider';

const ITEMS_PER_PAGE = 10;

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

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(models.length / ITEMS_PER_PAGE);

  // Reset to page 1 when models change (e.g., filter/sort changes)
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

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

      {/* Models Count & Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{models.length}</span> free models
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </Button>
            <span className="text-sm text-muted-foreground px-1">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </Button>
          </div>
        )}
      </div>

      {/* Model List */}
      <ModelList models={models} loading={loading} error={error} currentPage={currentPage} itemsPerPage={ITEMS_PER_PAGE} />
    </div>
  );
}

export function ModelTableWithProvider() {
  return (
    <QueryProvider>
      <ModelTable />
    </QueryProvider>
  );
}
