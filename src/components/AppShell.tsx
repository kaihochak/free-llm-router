import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { SiteHeader } from '@/components/SiteHeader';
import { QueryProvider } from '@/components/QueryProvider';
import { Toaster } from '@/components/ui/sonner';

interface AppShellProps {
  children: ReactNode;
  defaultOpen?: boolean;
}

export function AppShell({ children, defaultOpen = true }: AppShellProps) {
  return (
    <QueryProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <SiteHeader />
        <AppSidebar />
        <main className="min-h-screen w-full pt-14 pl-0 md:pl-[--sidebar-width]">
          {children}
        </main>
        <Toaster />
      </SidebarProvider>
    </QueryProvider>
  );
}
