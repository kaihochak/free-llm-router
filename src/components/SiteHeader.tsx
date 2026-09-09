import { ThemeToggle } from '@/components/ThemeToggle';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import { useCachedSession } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface SiteHeaderProps {
  showSidebarTrigger?: boolean;
}

export function SiteHeader({ showSidebarTrigger = true }: SiteHeaderProps) {
  const { data: session, isPending } = useCachedSession();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 shrink-0 items-center border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex w-full items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <div className="flex items-center gap-2 md:gap-6">
          {showSidebarTrigger && <SidebarTrigger className="md:hidden" />}
          <a href="/" className="flex items-center gap-2 type-label">
            <img src="/favicon.svg" alt="" className="h-5 w-5" />
            <span className="type-label hidden sm:inline">Free LLM Router</span>
          </a>
          <nav className="flex items-center gap-2 sm:gap-4">
            <a href="/docs" className="type-label text-muted-foreground hover:text-foreground">
              Docs
            </a>
            <a href="/pricing" className="type-label text-muted-foreground hover:text-foreground">
              Pricing
            </a>
            <a href="/models" className="type-label text-muted-foreground hover:text-foreground">
              Health
            </a>
            <a
              href="/availability"
              className="type-label text-muted-foreground hover:text-foreground"
            >
              Availability
            </a>
            <div className="hidden md:block">
              <FeedbackDialog />
            </div>
          </nav>
        </div>
        <div className="flex-1" />
        {!isPending &&
          (session?.user ? (
            <Button variant="outline" size="sm" className="type-caption h-8 px-2 sm:px-3" asChild>
              <a href="/dashboard">Dashboard</a>
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="type-caption h-8 px-2 sm:px-3" asChild>
              <a href="/login">Sign In</a>
            </Button>
          ))}
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
