import { TryItPanel } from './TryItPanel';
import { ApiEndpoint } from './ApiEndpoint';
import { EndpointHeader } from './EndpointHeader';
import { ParamsTable } from './ParamsTable';
import { ResponseTable } from './ResponseTable';
import { ErrorsList } from './ErrorsList';
import { CacheNote } from './CacheNote';
import { codeExamples } from '@/lib/code-examples';
import {
  VALID_FILTERS,
  VALID_SORTS,
  VALID_TIME_WINDOWS_WITH_LABELS,
  DEFAULT_EXCLUDE_WITH_ISSUES,
  DEFAULT_TIME_WINDOW,
} from '@/lib/api-definitions';

export function ApiReferenceSection() {
  return (
    <section id="api-reference" className="mt-20 scroll-mt-20">
      <h2 className="mb-4 text-5xl font-bold">API Reference</h2>
      <p className="mb-12 text-muted-foreground">
        Complete reference for all available endpoints. See{' '}
        <a href="#filters-sorting" className="text-primary hover:underline">
          Filters & Sorting
        </a>{' '}
        for query parameter details.
      </p>

      <div className="space-y-16">
        {/* GET /api/v1/models/ids */}
        <ApiEndpoint id="api-get-models">
          <EndpointHeader
            method="GET"
            endpoint="/api/v1/models/ids"
            description="Lightweight endpoint returning only model IDs. Fast and small payload - use this in production."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <ParamsTable
                type="query"
                params={[
                  {
                    name: 'filter',
                    type: 'string',
                    description: (
                      <>
                        Comma-separated: {VALID_FILTERS.map((filter, idx) => (
                          <span key={filter}>
                            {idx > 0 && ', '}
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">{filter}</code>
                          </span>
                        ))}
                      </>
                    ),
                  },
                  {
                    name: 'sort',
                    type: 'string',
                    description: (
                      <>
                        One of: {VALID_SORTS.map((sort, idx) => (
                          <span key={sort}>
                            {idx > 0 && ', '}
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">{sort}</code>
                          </span>
                        ))}
                      </>
                    ),
                  },
                  {
                    name: 'limit',
                    type: 'number',
                    description: 'Max models to return (1-100)',
                  },
                  {
                    name: 'excludeWithIssues',
                    type: 'number',
                    description: (
                      <>
                        Exclude models with more than N reported issues. Default:{' '}
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {DEFAULT_EXCLUDE_WITH_ISSUES}
                        </code>
                        . Set to 0 to disable filtering.
                      </>
                    ),
                  },
                  {
                    name: 'timeWindow',
                    type: 'string',
                    description: (
                      <>
                        Time period for error rates: {VALID_TIME_WINDOWS_WITH_LABELS.map((tw, idx) => (
                          <span key={tw}>
                            {idx > 0 && ', '}
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">{tw}</code>
                          </span>
                        ))}
                        . Default:{' '}
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{DEFAULT_TIME_WINDOW}</code>.
                      </>
                    ),
                  },
                  {
                    name: 'userOnly',
                    type: 'boolean',
                    description:
                      'If true, show feedback counts from only your own reported issues (requires API key). Default: false (shows all community reports).',
                  },
                ]}
              />

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
            description="Full model objects with metadata, feedback counts, and timestamps. Use for browsing or debugging."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h4 className="mb-3 font-medium">Query Parameters</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Same parameters as{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">/models/ids</code>:{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">filter</code>,{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">sort</code>,{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">limit</code>,{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">excludeWithIssues</code>,{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">timeWindow</code>, and{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">userOnly</code>.
                </p>
                <p className="text-xs text-muted-foreground">
                  See <code className="bg-muted px-1 py-0.5 rounded">/models/ids</code> documentation
                  above for parameter details.
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
                    name: 'filters',
                    type: 'string[]',
                    description: 'Applied filter values',
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
                Report model feedback: successes or issues (rate limiting, errors, unavailability).{' '}
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
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
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">rate_limited</code>,{' '}
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">unavailable</code>,{' '}
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">error</code>
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
                    description: 'If true, validates request but doesn\'t save (for testing)',
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
