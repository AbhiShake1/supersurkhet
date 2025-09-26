import { useState, useEffect } from "react";
import { Search, XCircle, Grid3X3, List, Folder, Settings } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { api } from "@/lib/api";
import { Skeleton } from "../ui/skeleton";
import {
  Credenza,
  CredenzaTrigger,
  CredenzaContent,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaBody,
} from "../ui/credenza";
import { AppDrawerSettings } from "./settings";
import { AppGrid } from "./app-grid";
import { AppList } from "./app-list";
import { AppGrouping } from "./grouping";

export interface AppDrawerProps
  extends React.ComponentPropsWithoutRef<typeof ScrollArea> { }

export function AppDrawer(props: AppDrawerProps) {
  const { data: allBusinesses = [], isLoading } = api.business.useGet();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "group">("grid");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gridColumns, setGridColumns] = useState(4);
  const [iconSize, setIconSize] = useState<"sm" | "md" | "lg">("md");

  // Settings for app drawer customization
  const [settings, setSettings] = useState({
    gridColumns: 4,
    iconSize: "md" as "sm" | "md" | "lg",
    viewMode: "grid" as "grid" | "list" | "group",
  });

  // Load saved settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("appDrawerSettings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        setGridColumns(parsed.gridColumns);
        setIconSize(parsed.iconSize);
        setViewMode(parsed.viewMode);
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

  // Filter businesses based on search term
  const filteredBusinesses = allBusinesses.filter((business) => {
    if (!searchTerm) return true;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return business.name?.toLowerCase().includes(lowerCaseSearchTerm);
  });

  // Handler for settings changes
  const handleSettingsChange = (newSettings: Partial<typeof settings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    saveSettings(updatedSettings);
  };

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

        <div className="flex gap-2">
          {/* View mode toggle */}
          <div className="flex border rounded-md p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8 w-8 p-0"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "group" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("group")}
              className="h-8 w-8 p-0"
            >
              <Folder className="h-4 w-4" />
            </Button>
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
      </div>

      {/* App display area */}
      <ScrollArea {...props}>
        {isLoading ? (
          <div className={`grid grid-cols-${settings.gridColumns || 4} gap-4`}>
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={`skeleton-${i}`} className="w-full h-32" />
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
        ) : viewMode === "grid" ? (
          <AppGrid
            businesses={filteredBusinesses}
            gridColumns={settings.gridColumns}
            iconSize={settings.iconSize}
          />
        ) : viewMode === "list" ? (
          <AppList
            businesses={filteredBusinesses}
            iconSize={settings.iconSize}
          />
        ) : (
          <AppGrouping
            businesses={filteredBusinesses}
            gridColumns={settings.gridColumns}
            iconSize={settings.iconSize}
            onBusinessesChange={(newBusinessesOrder) => {
              // Update the display to reflect the new order
              // For now, we'll just log it, but eventually we'd update state to reorder
              console.log("Businesses reordered:", newBusinessesOrder);
            }}
          />
        )}
      </ScrollArea>
    </div>
  );
}
