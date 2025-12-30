import { ThemeToggle } from '@/components/ThemeToggle';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import { useCachedSession } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';

export function SiteHeader() {
  const { data: session, isPending } = useCachedSession();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 shrink-0 items-center border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex w-full items-center px-4">
        <div className="flex items-center gap-6">
          <a href="/" className="flex items-center gap-2 font-semibold">
            <img src="/favicon.svg" alt="" className="h-5 w-5" />
            <span>Free Models API</span>
          </a>
          <nav className="flex items-center gap-4">
            <a href="/docs" className="text-sm text-muted-foreground hover:text-foreground">
              Docs
            </a>
            <FeedbackDialog />
          </nav>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          {!isPending && (
            session?.user ? (
              <Button variant="outline" size="sm" asChild>
                <a href="/dashboard">Dashboard</a>
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <a href="/login">Sign In</a>
              </Button>
            )
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
