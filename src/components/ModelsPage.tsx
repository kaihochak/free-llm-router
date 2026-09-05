import { QueryProvider } from '@/components/QueryProvider';
import { HealthTabContent } from '@/components/model-health/HealthTabContent';
import { AvailabilityTabContent } from '@/components/model-availability/AvailabilityTabContent';
import { cn } from '@/lib/utils';

type ModelsPageView = 'health' | 'availability';

interface ModelsPageProps {
  currentView?: ModelsPageView;
}

const PAGE_CONTENT: Record<
  ModelsPageView,
  {
    heading: string;
    description: string;
  }
> = {
  health: {
    heading: 'Free Model Health',
    description: 'Compare community-reported error rates across free models.',
  },
  availability: {
    heading: 'Free Model Availability',
    description: 'See which models were available for free on each day.',
  },
};

export function ModelsPage({ currentView = 'health' }: ModelsPageProps) {
  return (
    <QueryProvider>
      <ModelsPageContent currentView={currentView} />
    </QueryProvider>
  );
}

function ModelsPageContent({ currentView = 'health' }: ModelsPageProps) {
  const content = PAGE_CONTENT[currentView];

  return (
    <section className="scroll-mt-16 sm:mt-4">
      <h1 className="type-heading mb-3 sm:mb-4">{content.heading}</h1>
      <p className="type-body mb-8 text-muted-foreground">{content.description}</p>
      <nav className="mb-6" aria-label="Model sections">
        <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
          <a
            href="/models"
            aria-current={currentView === 'health' ? 'page' : undefined}
            className={cn(
              'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 type-label ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              currentView === 'health'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            )}
          >
            Health
          </a>
          <a
            href="/availability"
            aria-current={currentView === 'availability' ? 'page' : undefined}
            className={cn(
              'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 type-label ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              currentView === 'availability'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            )}
          >
            Availability
          </a>
        </div>
      </nav>

      <div className="w-full">
        {currentView === 'health' ? <HealthTabContent /> : <AvailabilityTabContent />}
      </div>
    </section>
  );
}
