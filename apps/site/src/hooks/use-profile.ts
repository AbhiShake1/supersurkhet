import { useAuth } from '@/components/auth-provider';

export function useProfile() {
  const { user } = useAuth();
  return user;
}
