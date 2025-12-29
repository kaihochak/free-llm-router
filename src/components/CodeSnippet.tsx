import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { generateSnippet, getFullApiUrl } from '@/hooks/useModels';

interface CodeSnippetProps {
  apiUrl: string;
  modelIds: string[];
}

export function CodeSnippet({ apiUrl, modelIds }: CodeSnippetProps) {
  const [copied, setCopied] = useState(false);

  const fullUrl = getFullApiUrl(apiUrl);
  const snippet = generateSnippet(apiUrl, modelIds);

  const copySnippet = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Split the snippet to highlight the API URL
  const urlLine = `const res = await fetch('${fullUrl}');`;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="relative rounded-xl border bg-card overflow-hidden">
        <pre className="overflow-x-auto p-4 text-xs font-mono text-left leading-relaxed">
          <code>
            <span className="text-muted-foreground">{'// 1. Fetch free models from Free Models API\n'}</span>
            <span className="text-primary">{urlLine}</span>
            {'\n'}
            <span className="text-muted-foreground">{'const { models } = await res.json();\n\n'}</span>
            <span className="text-muted-foreground">{'// 2. Use with OpenRouter SDK (with automatic fallback)\n'}</span>
            <span className="text-muted-foreground">{"import { OpenRouter } from '@openrouter/sdk';\n\n"}</span>
            <span className="text-muted-foreground">{'const openRouter = new OpenRouter({\n'}</span>
            <span className="text-muted-foreground">{'  apiKey: process.env.OPENROUTER_API_KEY,\n'}</span>
            <span className="text-muted-foreground">{'}});\n\n'}</span>
            <span className="text-muted-foreground">{'const completion = await openRouter.chat.send({\n'}</span>
            <span className="text-muted-foreground">{'  // Models are tried in order - if first fails, falls back to next\n'}</span>
            <span className="text-muted-foreground">{'  models: [\n'}</span>
            {modelIds.map((id, i) => (
              <span key={id}>
                <span className="text-primary">{`    '${id}'`}</span>
                <span className="text-muted-foreground">{i < modelIds.length - 1 ? ',\n' : '\n'}</span>
              </span>
            ))}
            <span className="text-muted-foreground">{'  ],\n'}</span>
            <span className="text-muted-foreground">{"  messages: [{ role: 'user', content: 'Hello!' }],\n"}</span>
            <span className="text-muted-foreground">{'}});\n\n'}</span>
            <span className="text-muted-foreground">{'console.log(completion.choices[0].message.content);'}</span>
          </code>
        </pre>

        <div className="absolute right-2 top-2">
          <Button variant="secondary" size="sm" onClick={copySnippet}>
            {copied ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Need more details?{' '}
        <a href="/docs" className="text-primary hover:underline">
          View documentation →
        </a>
      </p>
    </div>
  );
}
