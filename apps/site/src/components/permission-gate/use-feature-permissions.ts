import { useAuth } from '@/components/auth-provider';
import { useBusinessSafe } from '@/contexts/business-context';
import {
  canAccessFeature,
  canPerformFeatureAction,
} from '@/lib/permissions/business-permissions';
import { getSoulFromUnknown } from '@/lib/utils';

export function useFeaturePermissions(feature: string) {
  const { user, isLoading } = useAuth();
  const businessContext = useBusinessSafe();
  const business = businessContext?.business;
  const userSoul = getSoulFromUnknown(user);

  const canRead = canAccessFeature({ business, user, userSoul, feature });
  const canCreate = canPerformFeatureAction({
    business,
    user,
    userSoul,
    feature,
    action: 'create',
  });
  const canUpdate = canPerformFeatureAction({
    business,
    user,
    userSoul,
    feature,
    action: 'update',
  });
  const canDelete = canPerformFeatureAction({
    business,
    user,
    userSoul,
    feature,
    action: 'delete',
  });

  return {
    isLoading,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
  };
}
