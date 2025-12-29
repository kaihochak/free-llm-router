import { Home, List, Book, Code } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';

const navItems = [
  { title: 'Models', href: '#models', icon: List },
  { title: 'API Reference', href: '#api-reference', icon: Book },
  { title: 'Code Examples', href: '#code-examples', icon: Code },
];

export function AppSidebar() {
  return (
    <Sidebar collapsible="none" className="sticky top-14 h-[calc(100vh-3.5rem)] border-r bg-background">
      <SidebarContent className="p-2">
        <SidebarGroup>
          {/* <SidebarGroupLabel>Navigation</SidebarGroupLabel> */}
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <a href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-4 py-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <p>Found an issue? </p>
          <a href="https://github.com" className="underline hover:text-foreground">Report it on GitHub</a>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
