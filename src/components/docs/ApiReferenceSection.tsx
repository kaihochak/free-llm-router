import { TryItPanel } from './TryItPanel';
import { ApiEndpoint } from './ApiEndpoint';
import { EndpointHeader } from './EndpointHeader';
import { ParamsTable } from './ParamsTable';
import { ResponseTable } from './ResponseTable';
import { ErrorsList } from './ErrorsList';
import { CacheNote } from './CacheNote';
import { codeExamples } from '@/lib/code-examples';

export function ApiReferenceSection() {
  return (
    <section id="api-reference" className="mt-20 scroll-mt-20">
      <h2 className="mb-4 type-heading">API Reference</h2>
      <p className="mb-12 text-muted-foreground">Endpoints for model selection and feedback.</p>

      <div className="space-y-16">
        {/* GET /api/v1/models/ids */}
        <ApiEndpoint id="api-get-models">
          <EndpointHeader
            method="GET"
            endpoint="/api/v1/models/ids"
            description="Returns model IDs for routing."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <p className="type-label text-muted-foreground">
                See{' '}
                <a href="#query-params" className="text-primary hover:underline">
                  Query Parameters
                </a>
                .
              </p>

              <ResponseTable
                fields={[
                  { name: 'ids', type: 'string[]', description: 'Array of model IDs' },
                  { name: 'count', type: 'number', description: 'Number of IDs returned' },
                ]}
              />

              <ErrorsList errors={[{ code: 500, description: 'Server error' }]} />

              <CacheNote maxAge={60} sdkTtl={15} />
            </div>

            <div className="lg:sticky lg:top-20 lg:self-start">
              <TryItPanel
                endpoint="/api/v1/models/ids"
                method="GET"
                exampleResponse={codeExamples.getModelsResponse}
              />
            </div>
          </div>
        </ApiEndpoint>

        {/* GET /api/v1/models/full */}
        <ApiEndpoint id="api-get-models-full">
          <EndpointHeader
            method="GET"
            endpoint="/api/v1/models/full"
            description="Returns models with metadata and health data."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h4 className="type-label mb-3">Query Parameters</h4>
                <p className="type-label text-muted-foreground">
                  Same parameters as{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">/models/ids</code>.
                </p>
              </div>

              <ResponseTable
                fields={[
                  {
                    name: 'models',
                    type: 'Model[]',
                    description: 'Full model objects with all metadata',
                  },
                  {
                    name: 'feedbackCounts',
                    type: 'object',
                    description:
                      'Per-model feedback: issue counts, success count, and error rate (percentage). Error rate shows % of failed requests.',
                  },
                  {
                    name: 'lastUpdated',
                    type: 'string',
                    description: 'ISO 8601 timestamp of last sync',
                  },
                  {
                    name: 'useCases',
                    type: 'string[]',
                    description: 'Applied use case values',
                  },
                  {
                    name: 'sort',
                    type: 'string',
                    description: 'Applied sort value',
                  },
                  {
                    name: 'count',
                    type: 'number',
                    description: 'Total number of models returned',
                  },
                ]}
              />

              <CacheNote maxAge={60} sdkTtl={15} />
            </div>

            <div className="lg:sticky lg:top-20 lg:self-start">
              <TryItPanel
                endpoint="/api/v1/models/full"
                method="GET"
                exampleResponse={codeExamples.getModelsFullResponse}
              />
            </div>
          </div>
        </ApiEndpoint>

        {/* POST /api/v1/models/feedback */}
        <ApiEndpoint id="api-post-feedback">
          <EndpointHeader
            method="POST"
            endpoint="/api/v1/models/feedback"
            description={
              <>
                Reports a successful or failed model request.{' '}
                <span className="text-emerald-600 dark:text-emerald-400 type-label">
                  Does not count towards your rate limit.
                </span>
              </>
            }
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <ParamsTable
                type="body"
                params={[
                  {
                    name: 'modelId',
                    type: 'string',
                    required: true,
                    description: 'The model ID to report',
                  },
                  {
                    name: 'success',
                    type: 'boolean',
                    required: false,
                    description:
                      'Set to true to report successful request. If omitted, reports an issue (requires issue field).',
                  },
                  {
                    name: 'issue',
                    type: 'string',
                    required: true,
                    description: (
                      <>
                        Required if success is false/omitted. One of:{' '}
                        <code className="type-caption bg-muted px-1 py-0.5 rounded">
                          rate_limited
                        </code>
                        ,{' '}
                        <code className="type-caption bg-muted px-1 py-0.5 rounded">
                          unavailable
                        </code>
                        , <code className="type-caption bg-muted px-1 py-0.5 rounded">error</code>
                      </>
                    ),
                  },
                  {
                    name: 'details',
                    type: 'string',
                    required: false,
                    description: 'Optional description of the issue',
                  },
                  {
                    name: 'dryRun',
                    type: 'boolean',
                    required: false,
                    description: "If true, validates request but doesn't save (for testing)",
                  },
                ]}
              />

              <ResponseTable
                fields={[
                  {
                    name: 'received',
                    type: 'boolean',
                    description: 'Whether feedback was recorded',
                  },
                ]}
              />

              <ErrorsList
                errors={[
                  { code: 400, description: 'Missing modelId or invalid issue type' },
                  { code: 500, description: 'Server error' },
                ]}
              />
            </div>

            <div className="lg:sticky lg:top-20 lg:self-start">
              <TryItPanel
                endpoint="/api/v1/models/feedback"
                method="POST"
                defaultBody={{
                  modelId: 'google/gemini-2.0-flash-exp:free',
                  success: true,
                  dryRun: true,
                }}
                exampleResponse={codeExamples.feedbackResponse}
              />
            </div>
          </div>
        </ApiEndpoint>
      </div>
    </section>
  );
}
