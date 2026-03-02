import { Loader2 } from 'lucide-react';
import { canAccessBusiness } from '@/lib/permissions/business-permissions';
import type { Business } from '@/lib/schema';
import { getSoulFromUnknown } from '@/lib/utils';
import { useAuth } from '../auth-provider';

export function BusinessAccessGate({
  business,
  children,
}: React.PropsWithChildren<{ business: Business }>) {
  const { user, isLoading } = useAuth();
  const userSoul = getSoulFromUnknown(user);

  if (!business) return null;

  if (isLoading) return <Loader2 className="animate-spin size-4" />;

  if (
    canAccessBusiness({
      business,
      user,
      userSoul,
    })
  ) {
    return children;
  }

  return null;
}
