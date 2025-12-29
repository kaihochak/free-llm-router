import { useModels } from '@/hooks/useModels';
import { ApiUsageStep } from '@/components/ApiUsageStep';
import { ModelList } from '@/components/ModelList';
import { QueryProvider } from '@/components/QueryProvider';

export function GetStartedSection() {
  const { models, loading, error, activeFilters, activeSort, apiUrl, toggleFilter, setActiveSort } = useModels();

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
      <p className="mb-4 text-base text-muted-foreground">
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
      <p className="mb-12 text-base text-muted-foreground">
        If you encounter issues with a model, please{' '}
        <a href="#api-post-feedback" className="text-primary hover:underline">report it</a>{' '}
        so we can update the list for everyone.
      </p>

      <ApiUsageStep
        apiUrl={apiUrl}
        activeFilters={activeFilters}
        activeSort={activeSort}
        onToggleFilter={toggleFilter}
        onSortChange={setActiveSort}
        modelCount={models.length}
      >
        <ModelList models={models} loading={loading} error={error} itemsPerPage={5} />
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
