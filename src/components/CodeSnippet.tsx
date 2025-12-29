import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/code-block';
import { generateSnippet, getFullApiUrl } from '@/hooks/useModels';
import { toast } from 'sonner';

interface CodeSnippetProps {
  apiUrl: string;
}

export function CodeSnippet({ apiUrl }: CodeSnippetProps) {
  const fullUrl = getFullApiUrl(apiUrl);
  const snippet = generateSnippet(apiUrl);

  const copyUrl = async () => {
    await navigator.clipboard.writeText(fullUrl);
    toast.success('API URL copied to clipboard');
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* API Endpoint Display */}
      <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2">
        <code className="text-xs font-mono text-primary break-all">{fullUrl}</code>
        <Button variant="ghost" size="sm" onClick={copyUrl} className="shrink-0">
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
          >
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
        </Button>
      </div>

      {/* Substep 1: OpenRouter Setup */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium">1</span>
          <span>Set up OpenRouter</span>
        </div>
        <p className="text-sm text-muted-foreground pl-7">
          <a
            href="https://openrouter.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Go to OpenRouter →
          </a>
        </p>
      </div>

      {/* Substep 2: Code */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium">2</span>
          <span>Use the models</span>
        </div>
        <CodeBlock code={snippet} copyLabel="Copy full snippet" />
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
