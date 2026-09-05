import { useState, useEffect } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface SubItem {
  title: string;
  href: string;
  badge?: 'GET' | 'POST';
}

interface NavItem {
  title: string;
  href: string;
  items?: SubItem[];
}

const navItems: NavItem[] = [
  {
    title: 'Get Started',
    href: '#get-started',
    items: [
      { title: 'Overview', href: '#get-started' },
      { title: '1. Set Up OpenRouter', href: '#setup-openrouter' },
      { title: '2. Get API Key', href: '#get-api-key' },
      { title: '3. Copy Helper File', href: '#copy-file' },
      { title: '4. Use It', href: '#use-it' },
    ],
  },
  {
    title: 'Parameter Configuration',
    href: '#parameter-configuration',
    items: [
      { title: 'Configure Parameters', href: '#configure-params-live' },
      { title: 'Key Defaults', href: '#key-defaults' },
      { title: 'Request Overrides', href: '#request-overrides' },
    ],
  },
  {
    title: 'Code Examples',
    href: '#code-examples',
    items: [
      { title: 'One-off API Call', href: '#example-one-off' },
      { title: 'Chatbot', href: '#example-chatbot' },
      { title: 'Tool Calling', href: '#example-tool-calling' },
    ],
  },
  {
    title: 'API Reference',
    href: '#api-reference',
    items: [
      { title: '/models/ids', href: '#api-get-models', badge: 'GET' },
      { title: '/models/full', href: '#api-get-models-full', badge: 'GET' },
      { title: '/models/feedback', href: '#api-post-feedback', badge: 'POST' },
    ],
  },
  {
    title: 'Query Parameters',
    href: '#query-params',
    items: [
      { title: 'useCase', href: '#param-useCase' },
      { title: 'sort', href: '#param-sort' },
      { title: 'topN', href: '#param-topN' },
      { title: 'maxErrorRate', href: '#param-maxErrorRate' },
      { title: 'timeRange', href: '#param-timeRange' },
      { title: 'myReports', href: '#param-myReports' },
    ],
  },
  {
    title: 'FAQ',
    href: '#faq',
  },
];

function NavItemWithSub({ item, activeHash }: { item: NavItem; activeHash: string }) {
  if (!item.items) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          tooltip={item.title}
          className={cn(activeHash === item.href.slice(1) && 'bg-accent text-accent-foreground')}
        >
          <a href={item.href}>
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
            <span>{item.title}</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="ml-4 mt-1 space-y-1 border-l pl-2">
            {item.items.map((subItem) => {
              const isFirstItem = subItem === item.items?.[0];
              const isActive =
                activeHash === subItem.href.slice(1) ||
                (isFirstItem && activeHash === item.href.slice(1));
              return (
                <li key={subItem.title}>
                  <a
                    href={subItem.href}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5 type-label transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground type-label'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    {subItem.badge && (
                      <span
                        className={cn(
                          'inline-flex items-center rounded px-1.5 py-0.5 type-caption',
                          subItem.badge === 'GET'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                        )}
                      >
                        {subItem.badge}
                      </span>
                    )}
                    <span className={subItem.badge ? 'font-mono type-caption' : ''}>
                      {subItem.title}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

const allSectionIds = navItems.flatMap((item) => [
  item.href.slice(1),
  ...(item.items?.map((subItem) => subItem.href.slice(1)) ?? []),
]);

const SCROLL_SPY_OFFSET = 96;

export function AppSidebar() {
  const [activeHash, setActiveHash] = useState('get-started');

  useEffect(() => {
    let animationFrame = 0;

    const updateActiveHash = () => {
      let nextActiveHash = allSectionIds[0];

      for (const id of allSectionIds) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= SCROLL_SPY_OFFSET) {
          nextActiveHash = id;
        }
      }

      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        nextActiveHash = allSectionIds.at(-1) ?? nextActiveHash;
      }

      setActiveHash((current) => (current === nextActiveHash ? current : nextActiveHash));
    };

    const scheduleUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        updateActiveHash();
      });
    };

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(document.body);
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    updateActiveHash();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <Sidebar
      collapsible="offcanvas"
      className="sticky top-14 h-[calc(100vh-3.5rem)] border-r bg-background"
    >
      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <NavItemWithSub key={item.title} item={item} activeHash={activeHash} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
