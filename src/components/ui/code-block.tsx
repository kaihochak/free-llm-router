import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { codeToHtml } from 'shiki';

interface CodeBlockProps {
  code: string;
  language?: string;
  showCopy?: boolean;
  copyLabel?: string;
  className?: string;
}

export function CodeBlock({
  code,
  language = 'typescript',
  showCopy = true,
  copyLabel = 'Copy',
  className = '',
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);

  useEffect(() => {
    codeToHtml(code, {
      lang: language,
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
    }).then(setHighlightedCode);
  }, [code, language]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative rounded-lg border bg-muted/50 overflow-hidden ${className}`}>
      {highlightedCode ? (
        <div
          className="p-4 text-sm text-left leading-relaxed [&_pre]:bg-transparent! [&_pre]:whitespace-pre-wrap [&_pre]:wrap-break-word [&_code]:bg-transparent!"
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      ) : (
        <pre className="p-4 text-sm font-mono text-left leading-relaxed whitespace-pre-wrap wrap-break-word">
          <code>{code}</code>
        </pre>
      )}
      {showCopy && (
        <div className="absolute right-2 top-2">
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? (
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
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
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
            )}
            {copyLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
