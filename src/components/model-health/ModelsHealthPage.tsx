import { QueryProvider } from '@/components/QueryProvider';
import { HealthTabContent } from '@/components/model-health/HealthTabContent';

export function ModelsHealthPage() {
  return (
    <QueryProvider>
      <section className="scroll-mt-16 sm:mt-4">
        <h1 className="mb-3 text-3xl font-bold sm:mb-4 sm:text-5xl">Free Model Health</h1>
        <p className="mb-8 text-base text-muted-foreground sm:text-lg">
          Compare error rates across free OpenRouter models.
        </p>
        <HealthTabContent />
      </section>
    </QueryProvider>
  );
}
