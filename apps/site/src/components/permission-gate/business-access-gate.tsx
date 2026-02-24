import type { Business } from '@/lib/schema';
import { useAuth } from '../auth-provider';
import { Loader2 } from 'lucide-react';
import { hasBusinessAccess } from '@/lib/business-access';

export function BusinessAccessGate({
  business,
  children,
}: React.PropsWithChildren<{ business: Business }>) {
  const { user, isLoading } = useAuth();

  if (!business) return null;

  if (isLoading) return <Loader2 className="animate-spin size-4" />;

  if (!hasBusinessAccess(business, user)) return null;

  return children;
}
