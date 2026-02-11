import { QueryProvider } from '@/components/QueryProvider';
import { CodeBlock } from '@/components/ui/code-block';
import { ModelControls } from '@/components/ModelControls';
import { useModels, getModelControlsProps } from '@/hooks/useModels';
import { codeExamples } from '@/lib/code-examples';

export function ParameterConfigurationSection() {
  const modelsData = useModels();
  const {
    activeUseCases,
    activeSort,
    activeTopN,
    reliabilityFilterEnabled,
    activeMaxErrorRate,
    activeTimeRange,
    activeMyReports,
  } = modelsData;

  const modelControlsProps = getModelControlsProps(modelsData);
  const overrideCallSnippet = codeExamples.getModelIdsCall(
    activeUseCases,
    activeSort,
    activeTopN,
    reliabilityFilterEnabled ? activeMaxErrorRate : undefined,
    reliabilityFilterEnabled ? activeTimeRange : undefined,
    reliabilityFilterEnabled ? activeMyReports : undefined
  );

  return (
    <section id="parameter-configuration" className="mt-20 scroll-mt-20 space-y-6">
      <h2 className="mb-4 text-5xl font-bold">Parameter Configuration</h2>

      <section id="key-defaults" className="space-y-3">
        <h3 className="text-xl font-semibold sm:text-2xl">Key Defaults</h3>
        <p className="text-muted-foreground">
          Parameters are saved per API key. A call like <code>getModelIds()</code> uses the selected
          key&apos;s saved defaults.
        </p>
        <CodeBlock
          code={`const { ids, requestId } = await getModelIds()`}
          language="typescript"
          className="text-sm"
        />
      </section>

      <section id="request-overrides" className="space-y-3">
        <h3 className="text-xl font-semibold sm:text-2xl">Request Overrides</h3>
        <p className="text-muted-foreground">
          Passing arguments to <code>getModelIds(...)</code> overrides those defaults for that
          request only.
        </p>
        <ModelControls {...modelControlsProps} size="sm" />
        <CodeBlock code={overrideCallSnippet} language="typescript" className="text-sm" />
      </section>
    </section>
  );
}

export function ParameterConfigurationSectionWithProvider() {
  return (
    <QueryProvider>
      <ParameterConfigurationSection />
    </QueryProvider>
  );
}
