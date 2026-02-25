import { useLocation } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { AutoAdmin, type AutoAdminTabInput } from '@/components/auto-admin';
import { useBusinessConfigState } from '@/config/business-config';
import { api } from '@/lib/api';

export function AutoAdminResolved() {
  const { pathname } = useLocation();
  const pathSegment = pathname.split('/').filter(Boolean)[0] ?? '';

  const { data: businessRows = [], isLoading: isBusinessLoading } =
    api.business.useGet({
      keys: [pathSegment],
      single: true,
    });
  const business = businessRows[0];
  const businessId =
    business?.basePath?.trim() || business?.id?.trim() || pathSegment;

  const { tabs, isLoading: isConfigLoading } = useBusinessConfigState({
    slug: pathSegment,
    businessId,
  });

  if (isBusinessLoading || isConfigLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2
          className="size-8 animate-spin text-muted-foreground"
          aria-label="Loading admin configuration..."
        />
      </div>
    );
  }

  if (!tabs?.length) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        No admin tabs available.
      </div>
    );
  }

  return <AutoAdmin tabs={tabs as AutoAdminTabInput[]} />;
}
