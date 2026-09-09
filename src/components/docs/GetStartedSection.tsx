import { ApiUsageStep } from '@/components/ApiUsageStep';
import { QueryProvider } from '@/components/QueryProvider';

export function GetStartedSection() {
  return (
    <section id="get-started" className="mt-20 scroll-mt-20">
      <h2 className="mb-4 type-heading">Get Started</h2>
      <p className="type-body mb-12 text-muted-foreground">
        Use free OpenRouter models without managing availability or fallbacks.
      </p>

      <ApiUsageStep />
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
