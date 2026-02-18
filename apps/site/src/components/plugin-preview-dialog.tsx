import { Eye } from 'lucide-react';
import { useMemo } from 'react';
import { AutoAdmin, type AutoAdminTabInput } from '@/components/auto-admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBusinessConfig } from '@/config/business-config';
import type { PluginCatalogEntry } from '@/lib/plugins/admin-plugin-catalog';

type PluginPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: PluginCatalogEntry;
  businessId: string;
  businessSlug: string;
  isInstalled: boolean;
  onInstall: () => void;
};

export function PluginPreviewDialog({
  open,
  onOpenChange,
  entry,
  businessId,
  businessSlug,
  isInstalled,
  onInstall,
}: PluginPreviewDialogProps) {
  const currentConfig = useBusinessConfig({
    slug: businessSlug,
  });

  const currentBusinessTabs = useMemo(() => {
    const firstTabSet = Object.values(currentConfig).find((tabs) =>
      Array.isArray(tabs),
    );
    return (firstTabSet ?? []) as AutoAdminTabInput[];
  }, [currentConfig]);

  const simulatedTabs = useMemo(() => {
    if (!open) return [];

    const newTabs =
      entry.latestRelease.adminTabs?.map((tab) => ({
        schema: tab.schema,
        title: tab.title ?? tab.schema,
        group: tab.group,
        slug: businessSlug,
      })) ?? [];

    return [...currentBusinessTabs, ...newTabs];
  }, [open, entry.latestRelease.adminTabs, currentBusinessTabs, businessSlug]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-screen !h-screen !max-w-none !max-h-none gap-0 p-0 flex flex-col !translate-x-0 !translate-y-0 !top-0 !left-0 !rounded-none !m-0">
        <DialogHeader className="border-b bg-linear-to-r from-primary/10 via-primary/5 to-transparent px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-foreground/90">
              <DialogTitle className="text-base font-semibold text-foreground">
                {entry.title}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground/90">
              <span className="inline-flex size-2 animate-pulse rounded-full bg-primary" />
              <span>Ready to enable this plugin?</span>
              <Badge variant="outline" className="text-[11px]">
                Recommended next step
              </Badge>
            </div>
            <Button
              size="sm"
              className="shadow-lg shadow-primary/30 ring-1 ring-primary/40 mr-8"
              disabled={isInstalled}
              onClick={() => {
                onInstall();
                onOpenChange(false);
              }}
            >
              {isInstalled ? 'Installed' : 'Install Plugin'}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-0 m-0">
          <div className="h-full flex flex-col border-0 rounded-none m-0">
            <div className="flex-1 overflow-auto m-0">
              {simulatedTabs.length > 0 ? (
                <AutoAdmin tabs={simulatedTabs} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground m-0">
                  <div className="mb-4">
                    <Eye className="h-12 w-12 mx-auto opacity-50" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    No UI Changes Preview
                  </h3>
                  <p className="text-sm">
                    This plugin doesn't add any new admin interface elements.
                    <br />
                    The changes will be visible after installation.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
