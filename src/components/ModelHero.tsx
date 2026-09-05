import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { useModels } from '@/hooks/useModels';
import { QueryProvider } from '@/components/QueryProvider';
import { ArrowDown, ArrowUpRight } from 'lucide-react';

export function ModelHero() {
  const { totalModelCount, loading } = useModels({
    overrideTimeRange: '7d',
    overrideMyReports: false,
    overrideReliabilityFilterEnabled: false,
  });
  const modelCount = loading ? '' : totalModelCount || null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative flex flex-col items-center justify-center px-4 pt-6 pb-20 text-center">
        {/* Radial glow background */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.6_0.2_145/0.07)_0%,transparent_60%)]" />

        {/* Dot pattern overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle,currentColor_1px,transparent_1px)] bg-size-[24px_24px]" />

        <Badge variant="secondary" className="relative mb-4 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          {modelCount !== null ? `${modelCount} Free Models Available` : 'Free LLM Router'}
        </Badge>
        <h1 className="relative type-display">
          Models go down
          <br />
          <span className="drop-shadow-[0_0_20px_oklch(0.6_0.2_145/0.5)]">Your app stays up</span>
        </h1>
        <p className="max-w-xl type-body relative mt-5">
          Build your MVP with{' '}
          <span className="text-primary drop-shadow-[0_0_20px_oklch(0.6_0.2_145/0.5)]">$0</span> AI
          costs. A live-updated list of free LLM models from OpenRouter. We track availability so
          you don't have to.
        </p>
        <div className="relative mt-5 flex flex-wrap justify-center gap-2">
          <a href="#onboarding">
            <Button size="sm">
              Get Started
              <ArrowDown className="ml-1 h-4 w-4" />
            </Button>
          </a>
          <a href="/docs">
            <Button variant="outline" size="sm">
              Docs
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>

      {/* Onboarding Flow */}
      <div id="onboarding" className="scroll-mt-20">
        <OnboardingFlow />
      </div>
    </div>
  );
}

export function ModelHeroWithProvider() {
  return (
    <QueryProvider>
      <ModelHero />
    </QueryProvider>
  );
}
