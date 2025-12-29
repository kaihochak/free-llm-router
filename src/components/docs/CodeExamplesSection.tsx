import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';
import { codeExamples } from '@/lib/code-examples';

const examples = [
  {
    id: 'example-basic',
    title: 'Basic Fetch',
    description: 'Fetch the list of free models and log the count.',
    code: codeExamples.basicFetch,
  },
  {
    id: 'example-filters',
    title: 'With Filters',
    description: 'Filter models by capability and sort order.',
    code: codeExamples.withFilters,
  },
  {
    id: 'example-integration',
    title: 'Full Integration with OpenRouter',
    description: 'Complete example with model fallback for reliable responses.',
    code: codeExamples.fullIntegration,
  },
  {
    id: 'example-report',
    title: 'Report an Issue',
    description: 'Help improve model availability data by reporting issues.',
    code: codeExamples.reportIssue,
  },
];

export function CodeExamplesSection() {
  return (
    <section id="code-examples" className="mt-20 scroll-mt-20">
      <h2 className="mb-4 text-5xl font-bold">Code Examples</h2>
      <p className="mb-6 text-muted-foreground">
        Ready-to-use code snippets for common integration patterns.
      </p>
      <div className="space-y-6">
        {examples.map((example) => (
          <Card key={example.id} id={example.id} className="scroll-mt-20">
            <CardHeader>
              <CardTitle className="text-base">{example.title}</CardTitle>
              <CardDescription>{example.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={example.code} />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
