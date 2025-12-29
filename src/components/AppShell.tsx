import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { SiteHeader } from '@/components/SiteHeader';

interface AppShellProps {
  children: ReactNode;
  defaultOpen?: boolean;
}

export function AppShell({ children, defaultOpen = true }: AppShellProps) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <SiteHeader />
      <AppSidebar />
      <main className="min-h-screen w-full pt-14 pl-[--sidebar-width]">
        {children}
      </main>
    </SidebarProvider>
  );
}
