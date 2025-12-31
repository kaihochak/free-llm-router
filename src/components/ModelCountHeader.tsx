interface ModelCountHeaderProps {
  count: number;
  showLive?: boolean;
}

export function ModelCountHeader({ count, showLive = true }: ModelCountHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {showLive && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      )}
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{count}</span> free models
        {showLive && (
          <>
            <span className="mx-1.5">·</span>
            <span className="text-xs">Updated in real-time</span>
          </>
        )}
      </p>
    </div>
  );
}
