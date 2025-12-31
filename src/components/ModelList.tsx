import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Model } from '@/hooks/useModels';
import { Check, Copy, ArrowUpRight } from 'lucide-react';

interface ModelListProps {
  models: Model[];
  loading?: boolean;
  error?: string | null;
  currentPage: number;
  itemsPerPage?: number;
}

const DEFAULT_ITEMS_PER_PAGE = 10;

function formatTokens(count: number | null): string {
  if (!count) return '-';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return count.toString();
}

function getProvider(modelId: string): string {
  return modelId.split('/')[0] || modelId;
}

function getOpenRouterUrl(modelId: string): string {
  // Keep the :free suffix in the URL
  return `https://openrouter.ai/${modelId}`;
}

function getProviderLogoUrl(provider: string): string {
  return `https://models.dev/logos/${provider}.svg`;
}

function getCapabilityBadges(model: Model): string[] {
  const badges: string[] = [];
  if (model.inputModalities?.includes('image')) badges.push('Vision');
  if (model.supportedParameters?.includes('tools')) badges.push('Tools');
  if (model.supportedParameters?.includes('reasoning')) badges.push('Reasoning');
  if ((model.contextLength ?? 0) >= 100000) badges.push('Long Context');
  return badges;
}

function ProviderLogo({ provider }: { provider: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <img
            src={getProviderLogoUrl(provider)}
            alt={provider}
            className="h-5 w-5 object-contain opacity-70 dark:invert dark:opacity-80"
            onError={() => setHasError(true)}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p className="capitalize">{provider}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ModelList({ models, loading, error, currentPage, itemsPerPage = DEFAULT_ITEMS_PER_PAGE }: ModelListProps) {
  const [copiedModelId, setCopiedModelId] = useState<string | null>(null);

  const paginatedModels = models.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const copyModelId = async (e: React.MouseEvent, modelId: string) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(modelId);
    setCopiedModelId(modelId);
    setTimeout(() => setCopiedModelId(null), 2000);
  };

  if (loading && models.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (error) {
    return <div className="py-8 text-center text-destructive">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Compact Model List */}
      <div className="rounded-xl border bg-card divide-y">
        {paginatedModels.map((model) => {
          const badges = getCapabilityBadges(model);
          const provider = getProvider(model.id);

          return (
            <a
              key={model.id}
              href={getOpenRouterUrl(model.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-start gap-2 px-4 py-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:gap-3"
            >
              {/* Provider Logo */}
              <div className="shrink-0">
                <ProviderLogo provider={provider} />
              </div>

              {/* Model Name & Badges */}
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                  {model.name}
                </span>
                {badges.length > 0 && (
                  <div className="hidden sm:flex gap-1">
                    {badges.map((badge) => (
                      <Badge
                        key={badge}
                        variant="secondary"
                        className="text-[10px] font-medium"
                      >
                        {badge}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex w-full items-center justify-between gap-4 text-xs text-muted-foreground sm:w-auto sm:justify-end">
                <span className="font-mono hidden sm:inline">{formatTokens(model.contextLength)}</span>
                <button
                  onClick={(e) => copyModelId(e, model.id)}
                  className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
                  title="Copy model ID"
                >
                  {copiedModelId === model.id ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
