import { Rocket, Book, Code, ChevronRight } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface SubItem {
  title: string;
  href: string;
  badge?: 'GET' | 'POST';
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  items?: SubItem[];
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
      { title: '/models/openrouter', href: '#api-get-models', badge: 'GET' },
      { title: '/feedback', href: '#api-post-feedback', badge: 'POST' },
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
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  {subItem.badge && (
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        subItem.badge === 'GET'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {subItem.badge}
                    </span>
                  )}
                  <span className={subItem.badge ? 'font-mono text-xs' : ''}>{subItem.title}</span>
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
          </Sidebar>
  );
}
