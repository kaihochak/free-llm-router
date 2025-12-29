import { useModels } from '@/hooks/useModels';
import { UseCaseSelector } from '@/components/UseCaseSelector';
import { SortSelector } from '@/components/SortSelector';
import { ApiUsageStep } from '@/components/ApiUsageStep';
import { QueryProvider } from '@/components/QueryProvider';

function StepCard({
  id,
  number,
  title,
  description,
  children,
}: {
  id: string;
  number: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="rounded-lg border p-6 scroll-mt-20">
      <div className="flex items-center gap-3 mb-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
          {number}
        </span>
        <h3 className="text-xl font-semibold">{title}</h3>
      </div>
      <p className="mb-4 text-muted-foreground">{description}</p>
      {children}
    </div>
  );
}

export function GetStartedSection() {
  const { models, activeFilters, activeSort, apiUrl, toggleFilter, setActiveSort } = useModels();

  return (
    <section id="get-started" className="mb-12 scroll-mt-20">
      <h2 className="mb-2 text-2xl font-semibold">Get Started</h2>
      <p className="mb-8 text-muted-foreground">Start using free LLM models in your app in 3 steps.</p>

      <div className="space-y-6">
        <StepCard id="step-1" number={1} title="What are you building?" description="Filter models by capability to find the best fit for your use case.">
          <UseCaseSelector
            activeFilters={activeFilters}
            onToggleFilter={toggleFilter}
            modelCount={models.length}
          />
        </StepCard>

        <StepCard id="step-2" number={2} title="What matters most?" description="Order results by your priority.">
          <SortSelector activeSort={activeSort} onSortChange={setActiveSort} />
        </StepCard>

        <StepCard id="step-3" number={3} title="Ready to code?" description="Copy the snippet and start building.">
          <ApiUsageStep
            apiUrl={apiUrl}
            activeFilters={activeFilters}
            activeSort={activeSort}
            onToggleFilter={toggleFilter}
            onSortChange={setActiveSort}
          />
        </StepCard>
      </div>
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
