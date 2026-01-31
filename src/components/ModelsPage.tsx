import { useState, useEffect, useCallback } from 'react';
import { QueryProvider } from '@/components/QueryProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HealthTabContent } from '@/components/HealthTabContent';
import { AvailabilityTabContent } from '@/components/model-availability/AvailabilityTabContent';

export function ModelsPage() {
  return (
    <QueryProvider>
      <ModelsPageContent />
    </QueryProvider>
  );
}

function getInitialTab(): string {
  if (typeof window === 'undefined') return 'health';
  const params = new URLSearchParams(window.location.search);
  return params.get('tab') || 'health';
}

function ModelsPageContent() {
  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Sync URL when tab changes
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    window.history.pushState({}, '', url);
  }, []);

  // Listen for browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveTab(params.get('tab') || 'health');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <section className="scroll-mt-16 sm:mt-4">
      <h2 className="mb-3 text-3xl font-bold sm:mb-4 sm:text-5xl">Models</h2>
      <p className="mb-8 text-base text-muted-foreground sm:text-lg">
        Monitor model health from community feedback and availability from OpenRouter.
      </p>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <HealthTabContent />
        </TabsContent>

        <TabsContent value="availability">
          <AvailabilityTabContent />
        </TabsContent>
      </Tabs>
    </section>
  );
}
