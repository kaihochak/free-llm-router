import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import { useModelCount } from '@/hooks/useModelCount';

export function ModelHero() {
  const { count: modelCount } = useModelCount();

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="relative flex min-h-[70vh] flex-col items-center justify-center text-center">
        {/* Radial glow background */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.6_0.2_145/0.15)_0%,transparent_60%)]" />

        {/* Dot pattern overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle,currentColor_1px,transparent_1px)] bg-size-[24px_24px]" />

        <Badge variant="secondary" className="relative mb-6 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          {modelCount !== null ? `${modelCount} Free Models Available` : 'Free AI Models API'}
        </Badge>
        <h1 className="relative text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
          Models go down
          <br />
          <span className="text-primary drop-shadow-[0_0_20px_oklch(0.6_0.2_145/0.5)]">
            Your app stays up
          </span>
        </h1>
        <p className="relative mt-4 text-2xl font-semibold sm:text-3xl">
          Build your MVP with{' '}
          <span className="text-primary drop-shadow-[0_0_20px_oklch(0.6_0.2_145/0.5)]">$0</span>{' '}
          AI costs
        </p>
        <p className="relative mt-6 max-w-xl text-sm text-muted-foreground sm:text-base">
          A live-updated list of free LLM models from OpenRouter. One API call, always a working model. We track availability so you don't have to.
        </p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <a href="#onboarding">
            <Button size="lg">
              Get Started
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
            </Button>
          </a>
          <a href="/docs">
            <Button variant="outline" size="lg">
              Docs
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
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
