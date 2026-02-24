import type { AuthUser } from '@/components/auth-provider';
import type { Business } from '@/lib/schema';

type AccessUser = Pick<AuthUser, 'role' | 'pub'> & {
  _?: { soul?: string };
};

function getActorIds(user: AccessUser | null | undefined): string[] {
  const ids = [user?._?.soul, user?.pub];
  return ids.filter(
    (id): id is string => typeof id === 'string' && id.trim().length > 0,
  );
}

export function hasBusinessAccess(
  business: Business | null | undefined,
  user: AccessUser | null | undefined,
): boolean {
  if (!business || !user) return false;
  if (user.role === 'admin') return true;

  const actorIds = getActorIds(user);
  if (actorIds.length === 0) return false;

  if (actorIds.some((actorId) => business.created_by === actorId)) return true;
  return actorIds.some((actorId) => Boolean(business.members?.[actorId]));
}
