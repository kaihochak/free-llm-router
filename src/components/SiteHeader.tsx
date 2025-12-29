import { ThemeToggle } from '@/components/ThemeToggle';

export function SiteHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 shrink-0 items-center border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex w-full items-center px-4">
        <a href="/" className="flex items-center gap-2 font-semibold">
          <img src="/favicon.svg" alt="" className="h-5 w-5" />
          <span>Free Models API</span>
        </a>
        <div className="flex-1" />
        <nav className="flex items-center gap-4">
          <a href="/docs" className="text-sm text-muted-foreground hover:text-foreground">
            Docs
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
