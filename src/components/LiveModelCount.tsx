import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface Model {
  id: string;
  name: string;
  contextLength: number;
}

interface ApiResponse {
  models: Model[];
  lastUpdated: string;
  count: number;
}

export function LiveModelCount() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/models/full')
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-8">
        <div className="h-12 w-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const topModels = data.models.slice(0, 5);
  const lastUpdated = new Date(data.lastUpdated);
  const minutesAgo = Math.round((Date.now() - lastUpdated.getTime()) / 60000);

  return (
    <div className="flex flex-col items-center gap-6 rounded-xl border bg-card p-8">
      <div className="text-center">
        <div className="text-5xl font-bold tabular-nums">{data.count}</div>
        <div className="mt-1 text-sm text-muted-foreground">free models available</div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {topModels.map((model) => (
          <Badge key={model.id} variant="secondary" className="text-xs">
            {model.name}
          </Badge>
        ))}
        {data.count > 5 && (
          <Badge variant="outline" className="text-xs">
            +{data.count - 5} more
          </Badge>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Updated {minutesAgo === 0 ? 'just now' : `${minutesAgo}m ago`}
      </div>
    </div>
  );
}
