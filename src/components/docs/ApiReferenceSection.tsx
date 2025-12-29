import { CodeBlock } from '@/components/ui/code-block';
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
      <p className="mb-8 text-muted-foreground">
        Complete reference for all available endpoints, parameters, and response formats.
      </p>

      <div className="space-y-12">
        {/* GET /api/v1/models/openrouter */}
        <div id="api-get-models" className="scroll-mt-20 space-y-6">
          {/* Header - spans full width, above columns */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  GET
                </span>
                <h3 className="font-mono text-lg font-medium">/api/v1/models/openrouter</h3>
              </div>
              <p className="text-muted-foreground">
                Returns the list of currently available free models with optional filtering and sorting.
              </p>
            </div>
            <CopyEndpointButton endpoint="/api/v1/models/openrouter" />
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
                      <tr>
                        <td className="py-2 pr-4 font-mono text-xs">sort</td>
                        <td className="py-2 pr-4">string</td>
                        <td className="py-2">
                          One of:{' '}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">contextLength</code>,{' '}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">maxOutput</code>,{' '}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">name</code>,{' '}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">provider</code>,{' '}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">capable</code>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="mb-3 font-medium">Response</h4>
                <CodeBlock code={codeExamples.modelsResponse} language="json" />
              </div>

              <p className="text-xs text-muted-foreground">
                Caching: 15-minute stale threshold.{' '}
                <code className="bg-muted px-1 py-0.5 rounded">Cache-Control: public, s-maxage=900</code>
              </p>
            </div>

            {/* Right: Try It Panel */}
            <div className="lg:sticky lg:top-20 lg:self-start">
              <TryItPanel
                endpoint="/api/v1/models/openrouter"
                method="GET"
                params={[
                  { name: 'filter', placeholder: 'chat,vision,tools' },
                  { name: 'sort', placeholder: 'contextLength', defaultValue: 'contextLength' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* POST /api/feedback */}
        <div id="api-post-feedback" className="scroll-mt-20 space-y-6">
          {/* Header - spans full width, above columns */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  POST
                </span>
                <h3 className="font-mono text-lg font-medium">/api/feedback</h3>
              </div>
              <p className="text-muted-foreground">
                Report issues with a model (rate limiting, errors, unavailability).
              </p>
            </div>
            <CopyEndpointButton endpoint="/api/feedback" />
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
                      <tr>
                        <td className="py-2 pr-4 font-mono text-xs">source</td>
                        <td className="py-2 pr-4">string</td>
                        <td className="py-2 pr-4">No</td>
                        <td className="py-2">Your app identifier (default: "anonymous")</td>
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
                endpoint="/api/feedback"
                method="POST"
                defaultBody={{
                  modelId: 'google/gemma-3-4b-it:free',
                  issue: 'rate_limited',
                  details: 'Getting 429 errors',
                  source: 'my-app',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
