import { Settings } from 'lucide-react';

export function FiltersSortingSection() {
  return (
    <section id="filters-sorting" className="mt-20 scroll-mt-20">
      <h2 className="mb-4 text-5xl font-bold">Filters & Sorting</h2>
      <p className="mb-12 text-muted-foreground">
        Use filters to narrow models by capability, and sorting to control the order they're returned.
        When using models as fallbacks, the sort order becomes your fallback priority - first model is tried first.
      </p>

      <div className="space-y-12">
        {/* Filters */}
        <div className="space-y-4">
          <h3 className="text-2xl font-semibold">Filters</h3>
          <p className="text-muted-foreground">
            Pass one or more filters as a comma-separated list: <code className="bg-muted px-1.5 py-0.5 rounded text-sm">?filter=vision,coding</code>
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
                <tr className="border-b">
                  <td className="py-2 pr-4 font-mono text-xs">chat</td>
                  <td className="py-2">Text-to-text models optimized for conversation</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-mono text-xs">vision</td>
                  <td className="py-2">Models that accept image inputs</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-mono text-xs">coding</td>
                  <td className="py-2">Models that support function/tool calling</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-mono text-xs">longContext</td>
                  <td className="py-2">Models with 100k+ token context windows</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">reasoning</td>
                  <td className="py-2">Models with advanced reasoning capabilities (e.g., o1, QwQ, DeepSeek R1)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Sort Options */}
        <div className="space-y-4">
          <h3 className="text-2xl font-semibold">Sort Options</h3>
          <p className="text-muted-foreground">
            Choose how models are ordered. This determines fallback priority when iterating through the list.
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
                <tr className="border-b">
                  <td className="py-2 pr-4 font-mono text-xs">contextLength</td>
                  <td className="py-2 pr-4">Context Length</td>
                  <td className="py-2">Largest context window first - best for long documents</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-mono text-xs">maxOutput</td>
                  <td className="py-2 pr-4">Max Output</td>
                  <td className="py-2">Highest output token limit first - best for long-form generation</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-mono text-xs">capable</td>
                  <td className="py-2 pr-4">Most Capable</td>
                  <td className="py-2">Most supported features first - good default</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-mono text-xs">leastIssues</td>
                  <td className="py-2 pr-4">Least Reported Issues</td>
                  <td className="py-2">Fewest user-reported issues first - best for stability</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">newest</td>
                  <td className="py-2 pr-4">Newest First</td>
                  <td className="py-2">Most recently added models first - best for trying new models</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
