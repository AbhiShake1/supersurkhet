import type React from 'react';
import { useAuth } from '@/components/auth-provider';
import { useBusinessSafe } from '@/contexts/business-context';
import {
  canAccessFeature,
  canPerformFeatureAction,
  type PermissionAction,
} from '@/lib/permissions/business-permissions';
import { getSoulFromUnknown } from '@/lib/utils';

export interface PermissionGateProps {
  feature: string;
  action?: PermissionAction;
  fallback?: React.ReactNode;
}

export function PermissionGate({
  feature,
  action,
  fallback = null,
  children,
}: React.PropsWithChildren<PermissionGateProps>) {
  const { user, isLoading } = useAuth();
  const businessContext = useBusinessSafe();
  const userSoul = getSoulFromUnknown(user);
  const business = businessContext?.business;

  if (isLoading) return null;
  if (!business) return fallback;

  const isAllowed = action
    ? canPerformFeatureAction({ business, user, userSoul, feature, action })
    : canAccessFeature({ business, user, userSoul, feature });

  if (!isAllowed) return fallback;

  return children;
}
