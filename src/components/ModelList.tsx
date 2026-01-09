import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Model } from '@/hooks/useModels';
import { ArrowUpRight, AlertTriangle } from 'lucide-react';

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
  if (
    model.supportedParameters?.includes('reasoning') ||
    model.supportedParameters?.includes('include_reasoning')
  ) {
    badges.push('Reasoning');
  }
  if ((model.contextLength ?? 0) >= 100000) badges.push('Long Context');
  return badges;
}

function isNewModel(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  const date = new Date(createdAt);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return date > sevenDaysAgo;
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
  const paginatedModels = models.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading && models.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (error) {
    return <div className="py-8 text-center text-destructive">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card divide-y">
        {paginatedModels.map((model) => {
          const badges = getCapabilityBadges(model);
          const provider = getProvider(model.id);
          const isNew = isNewModel(model.createdAt);
          const hasIssues = (model.issueCount ?? 0) > 0;

          return (
            <a
              key={model.id}
              href={getOpenRouterUrl(model.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
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
                {isNew && (
                  <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-medium hover:bg-blue-500/15">
                    New
                  </Badge>
                )}
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
              <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                {/* Context / Output tokens */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="font-mono hidden sm:inline">
                        {formatTokens(model.contextLength)} / {formatTokens(model.maxCompletionTokens)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Context: {formatTokens(model.contextLength)} · Output: {formatTokens(model.maxCompletionTokens)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Error rate badge */}
                {model.errorRate !== undefined && model.errorRate > 0 ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant={
                            model.errorRate > 20
                              ? 'destructive'
                              : model.errorRate > 10
                                ? 'secondary'
                                : 'outline'
                          }
                          className="text-[10px] font-medium"
                        >
                          {model.errorRate.toFixed(1)}%
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Error rate: {model.errorRate.toFixed(1)}%</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : null}

                {/* Issues count */}
                {hasIssues && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          <span className="text-[10px]">{model.issueCount}</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{model.issueCount} reported issue{model.issueCount === 1 ? '' : 's'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
