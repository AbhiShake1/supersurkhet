import type { AuthUser } from '@/components/auth-provider';
import type { Business } from '@/lib/schema';

export type PermissionAction = 'read' | 'create' | 'update' | 'delete';

const ACTIONS: PermissionAction[] = ['read', 'create', 'update', 'delete'];

type PermissionMap = Record<string, unknown>;

function getUserRole(user: AuthUser | undefined) {
  const directRole = user?.role;
  if (typeof directRole === 'string') return directRole;

  const nestedRole = user?._?.role;
  return typeof nestedRole === 'string' ? nestedRole : undefined;
}

function resolveUserSoul(
  user: AuthUser | undefined,
  userSoul: string | undefined,
) {
  if (userSoul) return userSoul;

  const soul = user?._?.soul;
  if (typeof soul === 'string' && soul.length > 0) return soul;

  const pub = user?.pub;
  return typeof pub === 'string' && pub.length > 0 ? pub : undefined;
}

function asPermissionMap(value: unknown): PermissionMap {
  if (!value || typeof value !== 'object') return {};
  return value as PermissionMap;
}

function hasPermissionKey(
  permissions: PermissionMap,
  feature: string,
  action: PermissionAction,
) {
  return permissions[`${feature}:${action}`] === true;
}

function hasLegacyFeatureKey(permissions: PermissionMap, feature: string) {
  return permissions[feature] === true;
}

function getBusinessMember(
  business: Business | undefined,
  userSoul: string | undefined,
) {
  if (!business || !userSoul) return undefined;
  return business.members?.[userSoul];
}

export function isBusinessPrivilegedUser({
  business,
  user,
  userSoul,
}: {
  business: Business | undefined;
  user: AuthUser | undefined;
  userSoul: string | undefined;
}) {
  const resolvedSoul = resolveUserSoul(user, userSoul);
  if (getUserRole(user) === 'admin') return true;
  if (!business || !resolvedSoul) return false;
  if (business.created_by === resolvedSoul) return true;

  const member = getBusinessMember(business, resolvedSoul);
  if (!member) return false;
  return member.role === 'owner';
}

export function canAccessBusiness({
  business,
  user,
  userSoul,
}: {
  business: Business | undefined;
  user: AuthUser | undefined;
  userSoul: string | undefined;
}) {
  const resolvedSoul = resolveUserSoul(user, userSoul);
  if (!business) return false;
  if (getUserRole(user) === 'admin') return true;
  if (!resolvedSoul) return false;
  if (isBusinessPrivilegedUser({ business, user, userSoul: resolvedSoul }))
    return true;
  return Boolean(getBusinessMember(business, resolvedSoul));
}

export function canAccessFeature({
  business,
  user,
  userSoul,
  feature,
}: {
  business: Business | undefined;
  user: AuthUser | undefined;
  userSoul: string | undefined;
  feature: string;
}) {
  const resolvedSoul = resolveUserSoul(user, userSoul);
  if (!business) return false;
  if (getUserRole(user) === 'admin') return true;
  if (!resolvedSoul) return false;
  if (isBusinessPrivilegedUser({ business, user, userSoul: resolvedSoul }))
    return true;

  const member = getBusinessMember(business, resolvedSoul);
  if (!member) return false;

  const permissions = asPermissionMap(member.permissions);
  if (hasLegacyFeatureKey(permissions, feature)) return true;

  return ACTIONS.some((action) =>
    hasPermissionKey(permissions, feature, action),
  );
}

export function canPerformFeatureAction({
  business,
  user,
  userSoul,
  feature,
  action,
}: {
  business: Business | undefined;
  user: AuthUser | undefined;
  userSoul: string | undefined;
  feature: string;
  action: PermissionAction;
}) {
  const resolvedSoul = resolveUserSoul(user, userSoul);
  if (!business) return false;
  if (getUserRole(user) === 'admin') return true;
  if (!resolvedSoul) return false;
  if (isBusinessPrivilegedUser({ business, user, userSoul: resolvedSoul }))
    return true;

  const member = getBusinessMember(business, resolvedSoul);
  if (!member) return false;

  const permissions = asPermissionMap(member.permissions);
  if (hasLegacyFeatureKey(permissions, feature)) return true;
  return hasPermissionKey(permissions, feature, action);
}
