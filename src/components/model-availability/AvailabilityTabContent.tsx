import { useAvailability } from '@/hooks/useAvailability';
import { ModelCountHeader } from '@/components/ModelCountHeader';
import { AvailabilityMatrix } from '@/components/model-availability/AvailabilityMatrix';
import { ModelControls } from '@/components/ModelControls';

export function AvailabilityTabContent() {
  const {
    models,
    dates,
    loading,
    error,
    count,
    lastUpdated,
    activeUseCases,
    activeSort,
    toggleUseCase,
    setActiveSort,
    resetToDefaults,
  } = useAvailability();

  return (
    <div>
      {/* Controls - reuse ModelControls with subset of options */}
      <ModelControls
        activeUseCases={activeUseCases}
        activeSort={activeSort}
        onToggleUseCase={toggleUseCase}
        onSortChange={setActiveSort}
        onReset={resetToDefaults}
        size="lg"
      />

      <ModelCountHeader
        count={count}
        lastUpdated={lastUpdated}
        label={`model${count === 1 ? '' : 's'} tracked`}
      />

      {/* Availability Matrix */}
      <div className="mt-6">
        <AvailabilityMatrix models={models} dates={dates} loading={loading} error={error} />
      </div>
    </div>
  );
}
