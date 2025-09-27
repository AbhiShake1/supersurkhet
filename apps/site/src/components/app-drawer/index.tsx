import { api } from "@/lib/api";
import type { Business } from "@/lib/schema";
import { Search, Settings, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaTrigger,
} from "../ui/credenza";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { Skeleton } from "../ui/skeleton";
import { AppGrid } from "./app-grid";
import { useRecentlyUsedApps } from "./recently-used-apps-context";
import { AppDrawerSettings } from "./settings";

export interface AppDrawerProps
  extends React.ComponentPropsWithoutRef<typeof ScrollArea> { }

export function AppDrawer(props: AppDrawerProps) {
  const { data: allBusinesses = [], isLoading } = api.business.useGet();
  const { recentlyUsedApps, isLoading: isLoadingRecentlyUsed } = useRecentlyUsedApps();
  const [searchTerm, setSearchTerm] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Settings for app drawer customization
  const [settings, setSettings] = useState({
    gridColumns: 4,
    iconSize: "md" as "sm" | "md" | "lg",
  });

  // Load saved settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("appDrawerSettings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Ensure we only use the properties we need
        setSettings({
          gridColumns: parsed.gridColumns || 4,
          iconSize: parsed.iconSize || "md",
        });
      } catch (e) {
        console.error("Failed to parse app drawer settings", e);
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
    localStorage.setItem("appDrawerSettings", JSON.stringify(newSettings));
  };

  // Handler for settings changes
  const handleSettingsChange = (newSettings: Partial<typeof settings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    saveSettings(updatedSettings);
  };

  // Create stable skeleton IDs for loading state
  const skeletonIds = useMemo(() => Array.from({ length: 10 }, (_, i) => `skeleton-${i}`), []);

  // Filter businesses based on search term
  const filteredBusinesses = allBusinesses.filter((business) => {
    if (!searchTerm) return true;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return business.name?.toLowerCase().includes(lowerCaseSearchTerm);
  });

  // Get recently used business objects
  const recentlyUsedBusinessObjects = useMemo(() => {
    if (!recentlyUsedApps || recentlyUsedApps.length === 0) return [];

    return recentlyUsedApps
      .map(usedApp => allBusinesses.find(business => business._?.soul === usedApp.appId))
      .filter(Boolean) as Business[]; // Remove undefined values
  }, [recentlyUsedApps, allBusinesses]);

  // Filter recently used business objects based on search term
  const filteredRecentlyUsed = useMemo(() => {
    if (!searchTerm) return recentlyUsedBusinessObjects;

    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return recentlyUsedBusinessObjects.filter(business =>
      business?.name?.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [recentlyUsedBusinessObjects, searchTerm]);

  // Filter all other business objects based on search term and exclude recently used
  const filteredAllBusinesses = useMemo(() => {
    if (searchTerm) {
      // If searching, return all filtered businesses (already done above)
      // but exclude the recently used ones to avoid duplication
      const recentlyUsedIds = new Set(recentlyUsedBusinessObjects.map(b => b._?.soul));
      return filteredBusinesses.filter(business => !recentlyUsedIds.has(business._?.soul));
    }

    // If not searching, return all businesses except the recently used ones
    const recentlyUsedIds = new Set(recentlyUsedBusinessObjects.map(b => b._?.soul));
    return allBusinesses.filter(business => !recentlyUsedIds.has(business._?.soul));
  }, [allBusinesses, filteredBusinesses, recentlyUsedBusinessObjects, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Search and controls bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search apps by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchTerm("")}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Settings button */}
        <Credenza open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CredenzaTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </CredenzaTrigger>
          <CredenzaContent>
            <CredenzaHeader>
              <CredenzaTitle>App Drawer Settings</CredenzaTitle>
            </CredenzaHeader>
            <CredenzaBody>
              <AppDrawerSettings
                settings={settings}
                onSettingsChange={handleSettingsChange}
                onClose={() => setSettingsOpen(false)}
              />
            </CredenzaBody>
          </CredenzaContent>
        </Credenza>
      </div>

      {/* App display area */}
      <ScrollArea {...props}>
        {isLoading || isLoadingRecentlyUsed ? (
          <div className={`grid grid-cols-${settings.gridColumns} gap-4`}>
            {skeletonIds.map((id) => (
              <Skeleton key={id} className="w-full h-32" />
            ))}
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p>No apps found matching your search.</p>
            {searchTerm && (
              <div className="mt-4">
                <Button variant="ghost" onClick={() => setSearchTerm("")}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Clear Search
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Recently Used Apps Section */}
            {filteredRecentlyUsed.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Recently Used</h2>
                <AppGrid
                  businesses={filteredRecentlyUsed}
                  gridColumns={settings.gridColumns}
                  iconSize={settings.iconSize}
                />
              </div>
            )}

            {/* Separator for All Apps */}
            {(filteredRecentlyUsed.length > 0 && filteredAllBusinesses.length > 0) && (
              <div className="flex items-center my-4">
                <Separator className="flex-grow" />
                <span className="px-4 text-muted-foreground text-sm">All Apps</span>
                <Separator className="flex-grow" />
              </div>
            )}

            {/* All Apps Section */}
            {filteredAllBusinesses.length > 0 && (
              <div>
                {filteredRecentlyUsed.length === 0 && <h2 className="text-lg font-semibold mb-3">All Apps</h2>}
                <AppGrid
                  businesses={filteredAllBusinesses}
                  gridColumns={settings.gridColumns}
                  iconSize={settings.iconSize}
                />
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
