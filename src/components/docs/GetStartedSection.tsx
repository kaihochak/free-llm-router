import { useState } from 'react';
import { useModels } from '@/hooks/useModels';
import { ApiUsageStep } from '@/components/ApiUsageStep';
import { ModelList } from '@/components/ModelList';
import { QueryProvider } from '@/components/QueryProvider';

const ITEMS_PER_PAGE = 5;

export function GetStartedSection() {
  const { models, loading, error, activeFilters, activeSort, activeLimit, apiUrl, toggleFilter, setActiveSort, setActiveLimit } = useModels();

  const [currentPage, setCurrentPage] = useState(1);
  const effectiveModelCount = activeLimit ? Math.min(models.length, activeLimit) : models.length;
  const totalPages = Math.ceil(effectiveModelCount / ITEMS_PER_PAGE);

  // Reset to page 1 when models change (e.g., filter/sort changes)
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  return (
    <section id="get-started" className="scroll-mt-20">
      <h2 className="mb-4 text-5xl font-bold">Get Started</h2>
      <p className="mb-4 text-lg text-muted-foreground">
        Building a demo or prototyping an MVP? You shouldn't have to pay for API costs just to validate an idea.
      </p>
      <p className="mb-4 text-base text-muted-foreground">
        <a
          href="https://openrouter.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          OpenRouter
        </a>'s free tier is great for early development, but free models come with trade-offs.
        They get rate limited, hit capacity, or get removed without notice. That's expected for free resources.
      </p>
      <p className="mb-12 text-base text-muted-foreground">
        We maintain a live-updated list of available free models so you don't have to track availability yourself.
        Set your preferences using filters and sorting, fetch the list from our API, and pass the model IDs to{' '}
        <a
          href="https://openrouter.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          OpenRouter
        </a>.
        It will automatically try each model in the order you specified until one responds. No need to manage fallbacks or check which models are currently working.
      </p>
      <ApiUsageStep
        apiUrl={apiUrl}
        activeFilters={activeFilters}
        activeSort={activeSort}
        activeLimit={activeLimit}
        onToggleFilter={toggleFilter}
        onSortChange={setActiveSort}
        onLimitChange={setActiveLimit}
        modelCount={effectiveModelCount}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      >
        <ModelList
          models={activeLimit ? models.slice(0, activeLimit) : models}
          loading={loading}
          error={error}
          currentPage={currentPage}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      </ApiUsageStep>
    </section>
  );
}

export function GetStartedSectionWithProvider() {
  return (
    <QueryProvider>
      <GetStartedSection />
    </QueryProvider>
  );
}
