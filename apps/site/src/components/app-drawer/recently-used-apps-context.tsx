import type { NestedSchemaType } from '@gta/react-hooks';
import { createContext, useContext, useMemo } from 'react';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';

export type RecentlyUsedApp = NestedSchemaType<'recentlyUsedApp'>;

interface RecentlyUsedAppsContextType {
  recentlyUsedApps: RecentlyUsedApp[];
  addRecentlyUsedApp: (businessId: string) => Promise<void>;
  isLoading: boolean;
}

const RecentlyUsedAppsContext = createContext<
  RecentlyUsedAppsContextType | undefined
>(undefined);

export function RecentlyUsedAppsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  const userId = user?._?.soul?.split('.')[1] || '';

  const { data: fetchedApps = [], isLoading } = api.recentlyUsedApp.useGet({
    keys: [userId],
  });

  const createRecentlyUsedApp = api.recentlyUsedApp.useCreate({
    keys: [userId],
  });

  // Process fetched apps to get only the user's recently used apps, sorted and limited to 5
  const recentlyUsedApps = useMemo(() => {
    if (!fetchedApps?.length) return [];

    const appWithTotalUsage = fetchedApps.reduce((acc, app) => {
      const existingApp = acc.find((a) => a.appId === app.appId);
      if (existingApp) {
        existingApp.usageCount += app.usageCount ?? 0;
      } else {
        acc.push({ ...app, usageCount: app.usageCount });
      }
      return acc;
    }, [] as RecentlyUsedApp[]);

    // Filter to only include apps for this specific user and sort by timestamp
    const sortedApps = [...appWithTotalUsage]
      .sort((a, b) => {
        if (a.usageCount === b.usageCount)
          return (b.timestamp ?? 0) - (a.timestamp ?? 0);
        return b.usageCount - a.usageCount;
      })
      .slice(0, 5); // Only take the 5 most recent
    return Object.values(
      Object.fromEntries(sortedApps.map((app) => [app.appId, app])),
    );
  }, [fetchedApps]);

  const addRecentlyUsedApp = async (businessId: string) => {
    if (!userId || !businessId) return;

    try {
      // Create the recently used app record using the pre-captured mutation hook
      await createRecentlyUsedApp.mutateAsync({
        appId: businessId,
        timestamp: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
        usageCount: 1,
        created_by: user?._?.soul ?? 'anon',
      });
    } catch (error) {
      console.error('Error adding recently used app:', error);
    }
  };

  return (
    <RecentlyUsedAppsContext.Provider
      value={{
        recentlyUsedApps,
        addRecentlyUsedApp,
        isLoading,
      }}
    >
      {children}
    </RecentlyUsedAppsContext.Provider>
  );
}

export function useRecentlyUsedApps() {
  const context = useContext(RecentlyUsedAppsContext);
  if (context === undefined) {
    throw new Error(
      'useRecentlyUsedApps must be used within a RecentlyUsedAppsProvider',
    );
  }
  return context;
}
