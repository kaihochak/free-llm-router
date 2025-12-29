import { Rocket, Book, Code, ChevronRight } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  items?: { title: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    title: 'Get Started',
    href: '#get-started',
    icon: Rocket,
    items: [
      { title: 'Overview', href: '#get-started' },
      { title: 'Browse Models', href: '#models' },
      { title: '1. Get API Key', href: '#step-1' },
      { title: '2. Fetch Models', href: '#step-2' },
      { title: '3. Use Model IDs', href: '#step-3' },
    ],
  },
  {
    title: 'API Reference',
    href: '#api-reference',
    icon: Book,
    items: [
      { title: 'GET /models/openrouter', href: '#api-get-models' },
      { title: 'POST /feedback', href: '#api-post-feedback' },
    ],
  },
  {
    title: 'Code Examples',
    href: '#code-examples',
    icon: Code,
    items: [
      { title: 'Basic Fetch', href: '#example-basic' },
      { title: 'With Filters', href: '#example-filters' },
      { title: 'OpenRouter Integration', href: '#example-integration' },
      { title: 'Report an Issue', href: '#example-report' },
    ],
  },
];

function NavItemWithSub({ item }: { item: NavItem }) {
  if (!item.items) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={item.title}>
          <a href={item.href}>
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible defaultOpen className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title}>
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
            <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="ml-6 mt-1 space-y-1 border-l pl-2">
            {item.items.map((subItem) => (
              <li key={subItem.title}>
                <a
                  href={subItem.href}
                  className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  {subItem.title}
                </a>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AppSidebar() {
  return (
    <Sidebar collapsible="none" className="sticky top-14 h-[calc(100vh-3.5rem)] border-r bg-background">
      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <NavItemWithSub key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-4 py-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <p>Found an issue? </p>
          <a href="https://github.com" className="underline hover:text-foreground">
            Report it on GitHub
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
