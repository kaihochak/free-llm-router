import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CodeBlock } from '@/components/ui/code-block';
import { Loader2 } from 'lucide-react';

interface ParamConfig {
  name: string;
  placeholder?: string;
  defaultValue?: string;
}

interface TryItPanelProps {
  endpoint: string;
  method: 'GET' | 'POST';
  baseUrl?: string;
  params?: ParamConfig[];
  defaultBody?: object;
}

export function TryItPanel({
  endpoint,
  method,
  baseUrl = '',
  params = [],
  defaultBody,
}: TryItPanelProps) {
  const [paramValues, setParamValues] = useState<Record<string, string>>(
    params.reduce((acc, p) => ({ ...acc, [p.name]: p.defaultValue || '' }), {})
  );
  const [body, setBody] = useState(defaultBody ? JSON.stringify(defaultBody, null, 2) : '');
  const [response, setResponse] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const buildUrl = () => {
    const searchParams = new URLSearchParams();
    Object.entries(paramValues).forEach(([key, value]) => {
      if (value) searchParams.set(key, value);
    });
    const queryString = searchParams.toString();
    return `${baseUrl}${endpoint}${queryString ? `?${queryString}` : ''}`;
  };

  const handleSend = async () => {
    setLoading(true);
    setResponse(null);
    setStatusCode(null);

    try {
      const url = buildUrl();
      const options: RequestInit = {
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
        body: method === 'POST' && body ? body : undefined,
      };

      const res = await fetch(url, options);
      setStatusCode(res.status);
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setResponse(JSON.stringify({ error: err instanceof Error ? err.message : 'Request failed' }, null, 2));
      setStatusCode(500);
    } finally {
      setLoading(false);
    }
  };

  const handleParamChange = (name: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-4">
      {/* Request Block */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
          <h4 className="text-sm font-medium">Request</h4>
          <Button size="sm" onClick={handleSend} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
          </Button>
        </div>

        {/* Parameters (for GET) */}
        {method === 'GET' && params.length > 0 && (
          <div className="px-4 py-3 space-y-3">
            <div className="space-y-2">
              {params.map((param) => (
                <div key={param.name} className="flex items-center gap-2">
                  <label className="w-24 shrink-0 text-xs font-mono text-muted-foreground">
                    {param.name}
                  </label>
                  <Input
                    size={1}
                    className="h-8 text-sm"
                    placeholder={param.placeholder}
                    value={paramValues[param.name] || ''}
                    onChange={(e) => handleParamChange(param.name, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Body (for POST) */}
        {method === 'POST' && (
          <div className="px-4 py-3">
            <textarea
              className="w-full h-32 rounded-lg border bg-muted/50 px-4 py-4 text-sm font-mono resize-none focus:outline-none leading-relaxed"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder='{"key": "value"}'
            />
          </div>
        )}
      </div>

      {/* Response Block */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
          <h4 className="text-sm font-medium">Response</h4>
          {statusCode !== null && (
            <span
              className={`text-xs font-medium ${
                statusCode >= 200 && statusCode < 300
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {statusCode}
            </span>
          )}
        </div>
        <div className="px-4 py-3">
          <div className="max-h-80 overflow-auto">
            <CodeBlock
              code={response || '// Click "Send" to make a request'}
              language="json"
              showCopy={!!response}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
