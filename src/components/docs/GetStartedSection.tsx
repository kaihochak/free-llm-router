import { useModels } from '@/hooks/useModels';
import { ApiUsageStep } from '@/components/ApiUsageStep';
import { ModelList } from '@/components/ModelList';
import { QueryProvider } from '@/components/QueryProvider';

export function GetStartedSection() {
  const { models, loading, error, activeFilters, activeSort, apiUrl, toggleFilter, setActiveSort } = useModels();

  return (
    <section id="get-started" className="mb-12 scroll-mt-20">
      <h2 className="mb-2 text-2xl font-semibold">Get Started</h2>
      <p className="mb-6 text-muted-foreground">
        Free Models API provides a curated list of free LLM models available on OpenRouter.
        Use our API to dynamically fetch model IDs and pass them to OpenRouter for automatic fallback support.
      </p>

      <ApiUsageStep
        apiUrl={apiUrl}
        activeFilters={activeFilters}
        activeSort={activeSort}
        onToggleFilter={toggleFilter}
        onSortChange={setActiveSort}
      >
        {/* Model list showing filtered results - appears after URL, before steps */}
        <div id="models" className="mt-6 scroll-mt-20">
          <h3 className="mb-4 text-lg font-medium">
            <span className="font-semibold text-foreground">{models.length}</span>{' '}
            <span className="text-muted-foreground">free models available</span>
          </h3>
          <ModelList models={models} loading={loading} error={error} itemsPerPage={5} />
        </div>
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
