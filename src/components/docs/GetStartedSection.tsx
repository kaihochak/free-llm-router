import { ApiUsageStep } from '@/components/ApiUsageStep';
import { QueryProvider } from '@/components/QueryProvider';
import { useModels } from '@/hooks/useModels';
import { ModelControls } from '@/components/ModelControls';
import { ModelList } from '@/components/ModelList';
import { ModelCountHeader } from '@/components/ModelCountHeader';

export function GetStartedSection() {
  const {
    models,
    loading,
    error,
    activeUseCases,
    activeSort,
    activeTopN,
    reliabilityFilterEnabled,
    activeMaxErrorRate,
    activeTimeRange,
    activeMyReports,
    lastUpdated,
    toggleUseCase,
    setActiveSort,
    setActiveTopN,
    setReliabilityFilterEnabled,
    setActiveMaxErrorRate,
    setActiveTimeRange,
    setActiveMyReports,
    resetToDefaults,
  } = useModels();

  const previewModels = activeTopN ? models.slice(0, activeTopN) : models;

  return (
    <section id="get-started" className="mt-20 scroll-mt-20">
      <h2 className="mb-4 text-5xl font-bold">Get Started</h2>
      <p className="mb-4 text-2xl text-muted-foreground">
        Building a demo or prototyping an MVP but don’t want to pay API costs just to validate an idea?
      </p>
      <p className="mb-4 text-base text-muted-foreground">
        <a
          href="https://openrouter.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          OpenRouter
        </a>'s free tier is generous for early development, but free models come with maintenance trade-offs.
        They can get rate limited, hit capacity, or disappear without notice—leaving you to juggle fallbacks and slow down shipping.
      </p>
      <p className="mb-12 text-base text-muted-foreground">
        We maintain a live-updated list of available free models so you don't have to track availability yourself.
        Set your preferences using use case and sorting, fetch the list from our API, and pass the model IDs to{' '}
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

      {/* Live preview block, shown immediately after the intro */}
      <div id="live-preview" className="mb-12 space-y-4 scroll-mt-20">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-xl font-semibold sm:text-2xl">Preview Your Live Model List</h3>
        </div>
        <p className="text-muted-foreground">
          Configure use case and sorting to preview the live, health-scored list your app will fetch dynamically.
        </p>
        <ModelControls
          activeUseCases={activeUseCases}
          activeSort={activeSort}
          activeTopN={activeTopN}
          reliabilityFilterEnabled={reliabilityFilterEnabled}
          activeMaxErrorRate={activeMaxErrorRate}
          activeTimeRange={activeTimeRange}
          activeMyReports={activeMyReports}
          onToggleUseCase={toggleUseCase}
          onSortChange={setActiveSort}
          onTopNChange={setActiveTopN}
          onReliabilityFilterEnabledChange={setReliabilityFilterEnabled}
          onMaxErrorRateChange={setActiveMaxErrorRate}
          onTimeRangeChange={setActiveTimeRange}
          onMyReportsChange={setActiveMyReports}
          onReset={resetToDefaults}
        />
        <ModelCountHeader count={previewModels.length} lastUpdated={lastUpdated} />
        <ModelList
          models={previewModels}
          loading={loading}
          error={error}
          currentPage={1}
          itemsPerPage={5}
        />
      </div>

      {/* Docs usage steps without the embedded preview to avoid duplication */}
      <ApiUsageStep showBrowseModels={false} />
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
