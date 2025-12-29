import { CodeBlock } from '@/components/ui/code-block';

interface DocsCodeBlockProps {
  code: string;
  showCopy?: boolean;
}

export function DocsCodeBlock({ code, showCopy = true }: DocsCodeBlockProps) {
  return <CodeBlock code={code} showCopy={showCopy} />;
}
