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
import { useFolders } from "./folders-context";
import { AppDrawerSettings } from "./settings";

export interface AppDrawerProps
  extends React.ComponentPropsWithoutRef<typeof ScrollArea> { }

export function AppDrawer(props: AppDrawerProps) {
  const { data: allBusinesses = [], isLoading } = api.business.useGet();
  const { recentlyUsedApps, isLoading: isLoadingRecentlyUsed } =
    useRecentlyUsedApps();
  const { folders } = useFolders();
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

  // Get all app IDs that are in folders
  const appIdsInFolders = useMemo(
    () => folders.flatMap((folder) => Object.keys(folder.apps || {})),
    [folders],
  );

  // Get businesses that are not in any folder
  const businessesNotInFolders = useMemo(
    () =>
      allBusinesses.filter(
        (business) => !appIdsInFolders.includes(business._?.soul || ""),
      ),
    [allBusinesses, appIdsInFolders],
  );

  // Filter businesses based on search term
  const filteredBusinesses = businessesNotInFolders.filter((business) => {
    if (!searchTerm) return true;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return business.name?.toLowerCase().includes(lowerCaseSearchTerm);
  });

  // Get recently used business objects
  const recentlyUsedBusinessObjects = useMemo(() => {
    if (!recentlyUsedApps || recentlyUsedApps.length === 0) return [];

    return recentlyUsedApps
      .map((usedApp) =>
        allBusinesses.find((business) => business._?.soul === usedApp.appId),
      )
      .filter(Boolean) as Business[]; // Remove undefined values
  }, [recentlyUsedApps, allBusinesses]);

  // Filter recently used business objects based on search term
  const filteredRecentlyUsed = useMemo(() => {
    if (!searchTerm) return recentlyUsedBusinessObjects;

    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return recentlyUsedBusinessObjects.filter((business) =>
      business?.name?.toLowerCase().includes(lowerCaseSearchTerm),
    );
  }, [recentlyUsedBusinessObjects, searchTerm]);

  // Filter all business objects based on search term (include recently used in all apps too)
  const filteredAllBusinesses = useMemo(() => {
    if (searchTerm) {
      // If searching, return all filtered businesses
      return filteredBusinesses;
    }

    // If not searching, return all businesses (including recently used ones)
    return businessesNotInFolders;
  }, [businessesNotInFolders, filteredBusinesses, searchTerm]);

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
                <AppGrid
                  businesses={filteredRecentlyUsed}
                  gridColumns={settings.gridColumns}
                  iconSize={settings.iconSize}
                  isAllApps={false}
                />
              </div>
            )}

            {/* Separator for All Apps */}
            {filteredAllBusinesses.length > 0 && (
              <div className="flex items-center my-4 flex-row">
                <div className="w-full border-t border-dotted border-muted" />
                <span className="px-4 text-muted-foreground text-sm whitespace-nowrap flex-shrink-0">All Apps</span>
                <div className="w-full border-t border-dotted border-muted" />
              </div>
            )}

            {/* All Apps Section */}
            {filteredAllBusinesses.length > 0 && (
              <div>
                <AppGrid
                  businesses={filteredAllBusinesses}
                  gridColumns={settings.gridColumns}
                  iconSize={settings.iconSize}
                  isAllApps={true}
                />
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
