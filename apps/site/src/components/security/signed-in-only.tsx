import z from "zod";
import { useAuth } from "../auth-provider";

export const SignedInOnlySchema = z.object({ children: z.any() }).describe(`Children only visible if user is signed in`)

export function SignedInOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return null
  return <>{children}</>;
}
