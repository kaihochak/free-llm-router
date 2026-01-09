import {
  FILTER_DEFINITIONS,
  SORT_DEFINITIONS,
  TIME_WINDOW_DEFINITIONS,
} from '@/lib/api-definitions';

export function FiltersSortingSection() {
  return (
    <section id="filters-sorting" className="mt-20 scroll-mt-20">
      <h2 className="mb-4 text-5xl font-bold">Query Parameters</h2>
      <p className="mb-12 text-muted-foreground">
        Customize your requests by combining these parameters. All parameters are optional and can be mixed and matched.
      </p>

      <div className="space-y-8">
        {/* filter parameter */}
        <div className="scroll-mt-20 space-y-3" id="param-filter">
          <h3 className="text-xl font-semibold">filter</h3>
          <p className="text-sm text-muted-foreground">
            Filter models by capability. Pass one or more as a comma-separated list: <code className="bg-muted px-1.5 py-0.5 rounded text-sm">?filter=vision,tools</code>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4 text-left font-medium">Value</th>
                  <th className="py-2 text-left font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {FILTER_DEFINITIONS.filter(f => f.key !== 'all').map((filter) => (
                  <tr key={filter.key} className={filter.key === FILTER_DEFINITIONS[FILTER_DEFINITIONS.length - 1].key ? '' : 'border-b'}>
                    <td className="py-2 pr-4 font-mono text-xs">{filter.key}</td>
                    <td className="py-2">{filter.docDescription || filter.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* sort parameter */}
        <div className="scroll-mt-20 space-y-3" id="param-sort">
          <h3 className="text-xl font-semibold">sort</h3>
          <p className="text-sm text-muted-foreground">
            Control the order models are returned. This determines fallback priority when iterating through the list. Example: <code className="bg-muted px-1.5 py-0.5 rounded text-sm">?sort=contextLength</code>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4 text-left font-medium">Value</th>
                  <th className="py-2 pr-4 text-left font-medium">Label</th>
                  <th className="py-2 text-left font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {SORT_DEFINITIONS.map((sort, index) => (
                  <tr key={sort.key} className={index === SORT_DEFINITIONS.length - 1 ? '' : 'border-b'}>
                    <td className="py-2 pr-4 font-mono text-xs">{sort.key}</td>
                    <td className="py-2 pr-4">{sort.label}</td>
                    <td className="py-2">{sort.docDescription || sort.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* limit parameter */}
        <div className="scroll-mt-20 space-y-3" id="param-limit">
          <h3 className="text-xl font-semibold">limit</h3>
          <p className="text-sm text-muted-foreground">
            Maximum models to return. Range: 1-100. Default: unlimited. Example: <code className="bg-muted px-1 py-0.5 rounded text-sm">?limit=10</code>
          </p>
        </div>

        {/* excludeWithIssues parameter */}
        <div className="scroll-mt-20 space-y-3" id="param-exclude-issues">
          <h3 className="text-xl font-semibold">excludeWithIssues</h3>
          <p className="text-sm text-muted-foreground">
            Filter out models with more than N reported issues. Useful for excluding unreliable models. Default: 5. Set to 0 to disable filtering. Example: <code className="bg-muted px-1 py-0.5 rounded text-sm">?excludeWithIssues=3</code>
          </p>
        </div>

        {/* timeWindow parameter */}
        <div className="scroll-mt-20 space-y-3" id="param-time-window">
          <h3 className="text-xl font-semibold">timeWindow</h3>
          <p className="text-sm text-muted-foreground">
            Time period for counting issues and calculating error rates. Controls both issue filtering and reliability metrics. Default: 24h.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4 text-left font-medium">Value</th>
                  <th className="py-2 text-left font-medium">Use Case</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {TIME_WINDOW_DEFINITIONS.map((tw, index) => (
                  <tr key={tw.value} className={index === TIME_WINDOW_DEFINITIONS.length - 1 ? '' : 'border-b'}>
                    <td className="py-2 pr-4 font-mono text-xs">{tw.value}</td>
                    <td className="py-2">{tw.useCase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* userOnly parameter */}
        <div className="scroll-mt-20 space-y-3" id="param-user-only">
          <h3 className="text-xl font-semibold">userOnly</h3>
          <p className="text-sm text-muted-foreground">
            When set to true, show feedback counts from only your own reported issues instead of all community reports. Requires API key authentication. Default: false. Example: <code className="bg-muted px-1 py-0.5 rounded text-sm">?userOnly=true</code>
          </p>
        </div>
      </div>
    </section>
  );
}
