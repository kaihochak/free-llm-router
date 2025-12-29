import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { generateSnippet, getFullApiUrl } from '@/hooks/useModels';

interface CodeSnippetProps {
  apiUrl: string;
}

export function CodeSnippet({ apiUrl }: CodeSnippetProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const fullUrl = getFullApiUrl(apiUrl);
  const snippet = generateSnippet(apiUrl);

  const copyUrl = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const copySnippet = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* API URL */}
      <div className="rounded-2xl border bg-linear-to-br from-muted/30 to-muted/10 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 rounded-lg bg-background/80 backdrop-blur px-4 py-3 border overflow-x-auto">
            <code className="text-sm font-mono text-primary whitespace-nowrap">
              GET {fullUrl}
            </code>
          </div>
          <Button variant="outline" size="sm" onClick={copyUrl} className="shrink-0">
            {copiedUrl ? 'Copied!' : 'Copy URL'}
          </Button>
        </div>

        {/* Code Snippet */}
        <div className="relative">
          <pre className="overflow-x-auto rounded-lg bg-background/80 backdrop-blur border p-4 text-xs font-mono text-muted-foreground text-left">
            <code>{snippet}</code>
          </pre>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2"
            onClick={copySnippet}
          >
            {copiedSnippet ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </div>
    </div>
  );
}
