import { CheckCircle2 } from "lucide-react";

/**
 * AuthIntegratedLabel component
 * 
 * Displays an "Auth integrated" label with a check circle icon.
 * Used to indicate that a provider has authentication credentials saved.
 * 
 * @example
 * ```tsx
 * <AuthIntegratedLabel />
 * ```
 */
export function AuthIntegratedLabel() {
  return (
    <div className="flex items-center gap-1 rounded-md bg-green-500/15 px-1.5 py-1 text-xs font-medium text-green-400">
      <CheckCircle2 className="h-3.5 w-3.5" />
      <span>Auth integrated</span>
    </div>
  );
}
