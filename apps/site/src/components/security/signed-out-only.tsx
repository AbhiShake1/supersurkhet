import z from 'zod';
import { useAuth } from '../auth-provider';

export const SignedOutOnlySchema = z
  .object({ children: z.any() })
  .describe(`Children only visible if user is signed out`);

export function SignedOutOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return null;
  return <>{children}</>;
}
