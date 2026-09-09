import { QueryProvider } from '@/components/QueryProvider';
import { AvailabilityTabContent } from '@/components/model-availability/AvailabilityTabContent';

export function ModelsAvailabilityPage() {
  return (
    <QueryProvider>
      <section className="scroll-mt-16 sm:mt-4">
        <h1 className="mb-3 text-3xl font-bold sm:mb-4 sm:text-5xl">Free Model Availability</h1>
        <p className="mb-8 text-base text-muted-foreground sm:text-lg">
          See when free OpenRouter models were available.
        </p>
        <AvailabilityTabContent />
      </section>
    </QueryProvider>
  );
}
