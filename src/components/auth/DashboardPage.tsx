import { useState, useEffect, useCallback } from 'react';
import { useCachedSession } from '@/lib/auth-client';
import { QueryProvider } from '@/components/QueryProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserInfo } from './UserInfoCard';
import { ApiKeysTab } from './ApiKeysTab';
import { HistoryTab } from './HistoryTab';

export function DashboardPage() {
  return (
    <QueryProvider>
      <DashboardPageContent />
    </QueryProvider>
  );
}

function DashboardPageContent() {
  const { data: session, isPending } = useCachedSession();
  const [userRateLimit, setUserRateLimit] = useState<{
    remaining: number;
    limit: number;
    requestCount: number;
  } | null>(null);

  const fetchUserRateLimit = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/rate-limit', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUserRateLimit({
          remaining: data.remaining,
          limit: data.limit,
          requestCount: data.requestCount,
        });
      }
    } catch (err) {
      console.error('Failed to fetch user rate limit:', err);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchUserRateLimit();
    }
  }, [session?.user, fetchUserRateLimit]);

  // Loading state
  if (isPending) {
    return (
      <Card className="w-full">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  // Not logged in - redirect to login
  if (!session?.user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return (
      <Card className="w-full">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <UserInfo user={session.user} />

      <Tabs defaultValue="api" className="w-full">
        <TabsList>
          <TabsTrigger value="api">API Keys</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="mt-6">
          <ApiKeysTab userRateLimit={userRateLimit} onRefreshRateLimit={fetchUserRateLimit} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <HistoryTab isSessionReady={!!session?.user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
