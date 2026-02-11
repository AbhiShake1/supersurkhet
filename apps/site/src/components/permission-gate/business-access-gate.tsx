import type { Business } from '@/lib/schema';
import { useAuth } from '../auth-provider';
import { Loader2 } from 'lucide-react';

export function BusinessAccessGate({
  business,
  children,
}: React.PropsWithChildren<{ business: Business }>) {
  const { user, isLoading } = useAuth();

  if (!business) return null;

  if (isLoading) return <Loader2 className="animate-spin size-4" />;

  if (!user?._?.soul) return null;

  if (user?.role === 'admin') return children;

  if (business.created_by === user?._?.soul) return children;

  if (business.members?.[user?._?.soul]) return children;

  return null;
}
