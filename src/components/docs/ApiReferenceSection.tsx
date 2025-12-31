import { TryItPanel } from './TryItPanel';
import { codeExamples } from '@/lib/code-examples';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

const BASE_URL = 'https://free-models-api.pages.dev';

function CopyEndpointButton({ endpoint }: { endpoint: string }) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(`${BASE_URL}${endpoint}`);
    toast.success('Endpoint URL copied');
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleCopy} className="shrink-0 h-8 w-8">
      <Copy className="h-4 w-4" />
    </Button>
  );
}

export function ApiReferenceSection() {
  return (
    <section id="api-reference" className="mt-20 scroll-mt-20">
      <h2 className="mb-4 text-5xl font-bold">API Reference</h2>
      <p className="mb-12 text-muted-foreground">
        Complete reference for all available endpoints. See <a href="#filters-sorting" className="text-primary hover:underline">Filters & Sorting</a> for query parameter details.
      </p>

      <div className="space-y-16">
        {/* GET /api/v1/models/ids - IDs only */}
        <div id="api-get-models" className="scroll-mt-20 space-y-6">
          {/* Header - spans full width, above columns */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  GET
                </span>
                <h3 className="font-mono text-lg font-medium">/api/v1/models/ids</h3>
              </div>
              <p className="text-muted-foreground">
                Lightweight endpoint returning only model IDs. Fast and small payload - use this in production.
              </p>
            </div>
            <CopyEndpointButton endpoint="/api/v1/models/ids" />
          </div>

          {/* Two columns below */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Documentation */}
            <div className="space-y-6">
              <div>
                <h4 className="mb-3 font-medium">Query Parameters</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 pr-4 text-left font-medium">Parameter</th>
                        <th className="py-2 pr-4 text-left font-medium">Type</th>
                        <th className="py-2 text-left font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b">
                        <td className="py-2 pr-4 font-mono text-xs">filter</td>
                        <td className="py-2 pr-4">string</td>
                        <td className="py-2">
                          Comma-separated:{' '}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">chat</code>,{' '}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">vision</code>,{' '}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">coding</code>,{' '}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">tools</code>,{' '}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">longContext</code>,{' '}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">reasoning</code>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 pr-4 font-mono text-xs">sort</td>
                        <td className="py-2 pr-4">string</td>
                        <td className="py-2">
                          One of:{' '}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">contextLength</code>,{' '}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">maxOutput</code>,{' '}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">capable</code>,{' '}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">leastIssues</code>,{' '}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">reliable</code>,{' '}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">newest</code>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono text-xs">limit</td>
                        <td className="py-2 pr-4">number</td>
                        <td className="py-2">Max models to return (1-100)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="mb-3 font-medium">Response</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 pr-4 text-left font-medium">Field</th>
                        <th className="py-2 pr-4 text-left font-medium">Type</th>
                        <th className="py-2 text-left font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b">
                        <td className="py-2 pr-4 font-mono text-xs">ids</td>
                        <td className="py-2 pr-4">string[]</td>
                        <td className="py-2">Array of model IDs</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono text-xs">count</td>
                        <td className="py-2 pr-4">number</td>
                        <td className="py-2">Number of IDs returned</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="mb-3 font-medium">Errors</h4>
                <ul className="list-inside list-disc text-sm text-muted-foreground space-y-1">
                  <li>
                    <code className="bg-muted px-1 py-0.5 rounded">500</code> - Server error
                  </li>
                </ul>
              </div>

              <p className="text-xs text-muted-foreground">
                <code className="bg-muted px-1 py-0.5 rounded">Cache-Control: private, max-age=60</code>
                {' '}— Responses are cached for 60 seconds at the HTTP layer and 15 minutes in the SDK.
              </p>
            </div>

            {/* Right: Try It Panel */}
            <div className="lg:sticky lg:top-20 lg:self-start">
              <TryItPanel
                endpoint="/api/v1/models/ids"
                method="GET"
                exampleResponse={codeExamples.getModelsResponse}
              />
            </div>
          </div>
        </div>

        {/* GET /api/v1/models/full - Full model objects */}
        <div id="api-get-models-full" className="scroll-mt-20 space-y-6">
          {/* Header - spans full width, above columns */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  GET
                </span>
                <h3 className="font-mono text-lg font-medium">/api/v1/models/full</h3>
              </div>
              <p className="text-muted-foreground">
                Full model objects with metadata, feedback counts, and timestamps. Use for browsing or debugging.
              </p>
            </div>
            <CopyEndpointButton endpoint="/api/v1/models/full" />
          </div>

          {/* Two columns below */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Documentation */}
            <div className="space-y-6">
              <div>
                <h4 className="mb-3 font-medium">Query Parameters</h4>
                <p className="text-sm text-muted-foreground">
                  Same as <code className="bg-muted px-1 py-0.5 rounded">/models/ids</code> - supports{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">filter</code>,{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">sort</code>, and{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">limit</code>.
                </p>
              </div>

              <div>
                <h4 className="mb-3 font-medium">Response</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 pr-4 text-left font-medium">Field</th>
                        <th className="py-2 pr-4 text-left font-medium">Type</th>
                        <th className="py-2 text-left font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b">
                        <td className="py-2 pr-4 font-mono text-xs">models</td>
                        <td className="py-2 pr-4">Model[]</td>
                        <td className="py-2">Full model objects with all metadata</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 pr-4 font-mono text-xs">feedbackCounts</td>
                        <td className="py-2 pr-4">object</td>
                        <td className="py-2">Feedback counts per model ID</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 pr-4 font-mono text-xs">lastUpdated</td>
                        <td className="py-2 pr-4">string</td>
                        <td className="py-2">ISO 8601 timestamp of last sync</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 pr-4 font-mono text-xs">filters</td>
                        <td className="py-2 pr-4">string[]</td>
                        <td className="py-2">Applied filter values</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 pr-4 font-mono text-xs">sort</td>
                        <td className="py-2 pr-4">string</td>
                        <td className="py-2">Applied sort value</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono text-xs">count</td>
                        <td className="py-2 pr-4">number</td>
                        <td className="py-2">Total number of models returned</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                <code className="bg-muted px-1 py-0.5 rounded">Cache-Control: private, max-age=60</code>
                {' '}— Responses are cached for 60 seconds at the HTTP layer and 15 minutes in the SDK.
              </p>
            </div>

            {/* Right: Try It Panel */}
            <div className="lg:sticky lg:top-20 lg:self-start">
              <TryItPanel
                endpoint="/api/v1/models/full"
                method="GET"
                exampleResponse={codeExamples.getModelsFullResponse}
              />
            </div>
          </div>
        </div>

        {/* POST /api/v1/models/feedback */}
        <div id="api-post-feedback" className="scroll-mt-20 space-y-6">
          {/* Header - spans full width, above columns */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  POST
                </span>
                <h3 className="font-mono text-lg font-medium">/api/v1/models/feedback</h3>
              </div>
              <p className="text-muted-foreground">
                Report issues with a model (rate limiting, errors, unavailability).{' '}
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Does not count towards your rate limit.
                </span>
              </p>
            </div>
            <CopyEndpointButton endpoint="/api/v1/models/feedback" />
          </div>

          {/* Two columns below */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Documentation */}
            <div className="space-y-6">
              <div>
                <h4 className="mb-3 font-medium">Request Body</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 pr-4 text-left font-medium">Field</th>
                        <th className="py-2 pr-4 text-left font-medium">Type</th>
                        <th className="py-2 pr-4 text-left font-medium">Required</th>
                        <th className="py-2 text-left font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b">
                        <td className="py-2 pr-4 font-mono text-xs">modelId</td>
                        <td className="py-2 pr-4">string</td>
                        <td className="py-2 pr-4">Yes</td>
                        <td className="py-2">The model ID to report</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 pr-4 font-mono text-xs">issue</td>
                        <td className="py-2 pr-4">string</td>
                        <td className="py-2 pr-4">Yes</td>
                        <td className="py-2">
                          One of:{' '}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">rate_limited</code>,{' '}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">unavailable</code>,{' '}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">error</code>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 pr-4 font-mono text-xs">details</td>
                        <td className="py-2 pr-4">string</td>
                        <td className="py-2 pr-4">No</td>
                        <td className="py-2">Optional description of the issue</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 pr-4 font-mono text-xs">dryRun</td>
                        <td className="py-2 pr-4">boolean</td>
                        <td className="py-2 pr-4">No</td>
                        <td className="py-2">If true, validates request but doesn't save (for testing)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="mb-3 font-medium">Response</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 pr-4 text-left font-medium">Field</th>
                        <th className="py-2 pr-4 text-left font-medium">Type</th>
                        <th className="py-2 text-left font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr>
                        <td className="py-2 pr-4 font-mono text-xs">received</td>
                        <td className="py-2 pr-4">boolean</td>
                        <td className="py-2">Whether feedback was recorded</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="mb-3 font-medium">Errors</h4>
                <ul className="list-inside list-disc text-sm text-muted-foreground space-y-1">
                  <li>
                    <code className="bg-muted px-1 py-0.5 rounded">400</code> - Missing modelId or invalid issue type
                  </li>
                  <li>
                    <code className="bg-muted px-1 py-0.5 rounded">500</code> - Server error
                  </li>
                </ul>
              </div>
            </div>

            {/* Right: Try It Panel */}
            <div className="lg:sticky lg:top-20 lg:self-start">
              <TryItPanel
                endpoint="/api/v1/models/feedback"
                method="POST"
                defaultBody={{
                  modelId: 'google/gemini-2.0-flash-exp:free',
                  issue: 'rate_limited',
                  details: 'Getting 429 after ~10 requests',
                  dryRun: true,
                }}
                exampleResponse={codeExamples.feedbackResponse}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
