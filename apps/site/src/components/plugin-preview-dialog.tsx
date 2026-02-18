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
  onInstall: () => void;
};

export function PluginPreviewDialog({
  open,
  onOpenChange,
  entry,
  businessId,
  businessSlug,
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
        <DialogHeader className="py-2 px-4 border-b flex items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            {entry.title}
            <Badge variant="secondary" className="text-xs">
              Preview Mode
            </Badge>
          </DialogTitle>
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

        <div className="flex flex-wrap justify-end gap-2 p-2 border-t">
          <Button
            size="sm"
            onClick={() => {
              onInstall();
              onOpenChange(false);
            }}
          >
            Install Plugin
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
