import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';
import { codeExamples } from '@/lib/code-examples';

export function ApiReferenceSection() {
  return (
    <section id="api-reference" className="mb-12 scroll-mt-20">
      <h2 className="mb-6 text-2xl font-semibold">API Reference</h2>
      <div className="space-y-6">
        {/* GET /api/v1/models/openrouter */}
        <Card id="api-get-models" className="scroll-mt-20">
          <CardHeader>
            <CardTitle className="font-mono text-base">GET /api/v1/models/openrouter</CardTitle>
            <CardDescription>Returns the list of currently available free models.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="mb-2 font-medium">Query Parameters</h4>
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
              <h4 className="mb-2 font-medium">Response</h4>
              <CodeBlock code={codeExamples.modelsResponse} />
            </div>
            <p className="text-xs text-muted-foreground">
              Caching: 15-minute stale threshold.{' '}
              <code className="bg-muted px-1 py-0.5 rounded">Cache-Control: public, s-maxage=900</code>
            </p>
          </CardContent>
        </Card>

        {/* POST /api/feedback */}
        <Card id="api-post-feedback" className="scroll-mt-20">
          <CardHeader>
            <CardTitle className="font-mono text-base">POST /api/feedback</CardTitle>
            <CardDescription>Report issues with a model (rate limiting, errors, unavailability).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="mb-2 font-medium">Request Body</h4>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h4 className="mb-2 font-medium">Request Example</h4>
                <CodeBlock code={codeExamples.feedbackRequest} />
              </div>
              <div>
                <h4 className="mb-2 font-medium">Response</h4>
                <CodeBlock code={codeExamples.feedbackResponse} />
              </div>
            </div>
            <div>
              <h4 className="mb-2 font-medium">Errors</h4>
              <ul className="list-inside list-disc text-sm text-muted-foreground">
                <li>
                  <code className="bg-muted px-1 py-0.5 rounded">400</code> - Missing modelId or invalid issue type
                </li>
                <li>
                  <code className="bg-muted px-1 py-0.5 rounded">500</code> - Server error
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
