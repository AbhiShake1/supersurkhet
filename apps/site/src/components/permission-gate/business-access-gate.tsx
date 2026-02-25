import { Loader2 } from 'lucide-react';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { hasBusinessAccess } from '@/lib/business-access';
import type { Business } from '@/lib/schema';
import { useAuth } from '../auth-provider';
import {
  AiMutationPermissionDialog,
  type AiMutationPermissionOptionValue,
} from './ai-mutation-permission-dialog';

export interface AiPermissionPolicyDoc {
  version: 1;
  selection: AiMutationPermissionOptionValue;
  updatedAt: number;
}

export interface AiMutationGateResult {
  allowed: boolean;
  blockedByPolicy: boolean;
  requiresPrompt: boolean;
  consumedAllowOnce: boolean;
  nextPolicy: AiPermissionPolicyDoc | null;
}

export interface AiMutationPermissionGate {
  policy: AiPermissionPolicyDoc | null;
  isDialogOpen: boolean;
  previewMutationGate: () => AiMutationGateResult;
  preflightMutationGate: () => AiMutationGateResult;
  requestMutationPermission: () => Promise<AiMutationGateResult>;
  setPolicySelection: (selection: AiMutationPermissionOptionValue) => void;
  clearPolicy: () => void;
}

export interface BusinessAccessGateProps extends PropsWithChildren {
  business: Business;
  enableAiMutationGate?: boolean;
  aiPolicyStorageKey?: string;
  onMirrorPolicyChange?: (
    policy: AiPermissionPolicyDoc | null,
  ) => void | Promise<void>;
}

const AI_PERMISSION_POLICY_STORAGE_KEY = 'ss-ai-permission-policy';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function createAiPermissionPolicy(
  selection: AiMutationPermissionOptionValue,
  now = Date.now(),
): AiPermissionPolicyDoc {
  return {
    version: 1,
    selection,
    updatedAt: now,
  };
}

function parseAiPermissionPolicy(value: unknown): AiPermissionPolicyDoc | null {
  if (!isRecord(value)) return null;
  if (value.version !== 1) return null;
  if (
    value.selection !== 'allow_once' &&
    value.selection !== 'allow_always' &&
    value.selection !== 'deny_session'
  ) {
    return null;
  }
  if (
    typeof value.updatedAt !== 'number' ||
    !Number.isFinite(value.updatedAt)
  ) {
    return null;
  }

  return {
    version: 1,
    selection: value.selection,
    updatedAt: value.updatedAt,
  };
}

function resolveStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function readAiPermissionPolicyFromStorage(options?: {
  storage?: Storage;
  storageKey?: string;
}): AiPermissionPolicyDoc | null {
  const storage = resolveStorage(options?.storage);
  if (!storage) return null;

  try {
    const raw = storage.getItem(
      options?.storageKey ?? AI_PERMISSION_POLICY_STORAGE_KEY,
    );
    if (!raw) return null;
    return parseAiPermissionPolicy(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function persistAiPermissionPolicyLocalFirst(
  policy: AiPermissionPolicyDoc | null,
  options?: {
    storage?: Storage;
    storageKey?: string;
    mirrorHook?: (policy: AiPermissionPolicyDoc | null) => void | Promise<void>;
  },
): Promise<void> {
  const storage = resolveStorage(options?.storage);
  const storageKey = options?.storageKey ?? AI_PERMISSION_POLICY_STORAGE_KEY;

  try {
    if (storage) {
      if (policy) {
        storage.setItem(storageKey, JSON.stringify(policy));
      } else {
        storage.removeItem(storageKey);
      }
    }
  } catch {
    // Storage failures should not block in-memory policy behavior.
  }

  if (options?.mirrorHook) {
    await options.mirrorHook(policy);
  }
}

export function evaluateAiMutationGate(
  policy: AiPermissionPolicyDoc | null,
): AiMutationGateResult {
  if (!policy) {
    return {
      allowed: false,
      blockedByPolicy: false,
      requiresPrompt: true,
      consumedAllowOnce: false,
      nextPolicy: null,
    };
  }

  if (policy.selection === 'deny_session') {
    return {
      allowed: false,
      blockedByPolicy: true,
      requiresPrompt: false,
      consumedAllowOnce: false,
      nextPolicy: policy,
    };
  }

  if (policy.selection === 'allow_always') {
    return {
      allowed: true,
      blockedByPolicy: false,
      requiresPrompt: false,
      consumedAllowOnce: false,
      nextPolicy: policy,
    };
  }

  return {
    allowed: true,
    blockedByPolicy: false,
    requiresPrompt: false,
    consumedAllowOnce: true,
    nextPolicy: null,
  };
}

const defaultAiMutationPermissionGate: AiMutationPermissionGate = {
  policy: null,
  isDialogOpen: false,
  previewMutationGate: () => evaluateAiMutationGate(null),
  preflightMutationGate: () => evaluateAiMutationGate(null),
  requestMutationPermission: async () => evaluateAiMutationGate(null),
  setPolicySelection: () => {},
  clearPolicy: () => {},
};

const AiMutationPermissionGateContext = createContext<AiMutationPermissionGate>(
  defaultAiMutationPermissionGate,
);

export function useAiMutationPermissionGate(): AiMutationPermissionGate {
  return useContext(AiMutationPermissionGateContext);
}

export function BusinessAccessGate({
  business,
  children,
  enableAiMutationGate = true,
  aiPolicyStorageKey = AI_PERMISSION_POLICY_STORAGE_KEY,
  onMirrorPolicyChange,
}: BusinessAccessGateProps) {
  const { user, isLoading } = useAuth();
  const [policy, setPolicy] = useState<AiPermissionPolicyDoc | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const pendingDialogResolveRef = useRef<
    ((result: AiMutationGateResult) => void) | null
  >(null);

  useEffect(() => {
    if (!enableAiMutationGate) return;
    setPolicy(
      readAiPermissionPolicyFromStorage({
        storageKey: aiPolicyStorageKey,
      }),
    );
  }, [enableAiMutationGate, aiPolicyStorageKey]);

  const commitPolicy = useCallback(
    (nextPolicy: AiPermissionPolicyDoc | null) => {
      setPolicy(nextPolicy);
      void persistAiPermissionPolicyLocalFirst(nextPolicy, {
        storageKey: aiPolicyStorageKey,
        mirrorHook: onMirrorPolicyChange,
      });
    },
    [aiPolicyStorageKey, onMirrorPolicyChange],
  );

  const setPolicySelection = useCallback(
    (selection: AiMutationPermissionOptionValue) => {
      commitPolicy(createAiPermissionPolicy(selection));
    },
    [commitPolicy],
  );

  const clearPolicy = useCallback(() => {
    commitPolicy(null);
  }, [commitPolicy]);

  const previewMutationGate = useCallback(() => {
    if (!enableAiMutationGate) {
      return {
        allowed: true,
        blockedByPolicy: false,
        requiresPrompt: false,
        consumedAllowOnce: false,
        nextPolicy: policy,
      };
    }
    return evaluateAiMutationGate(policy);
  }, [enableAiMutationGate, policy]);

  const preflightMutationGate = useCallback(() => {
    const evaluation = previewMutationGate();
    if (evaluation.consumedAllowOnce) {
      clearPolicy();
    }
    return evaluation;
  }, [clearPolicy, previewMutationGate]);

  const resolveDialogResult = useCallback(
    (selection: AiMutationPermissionOptionValue) => {
      setPolicySelection(selection);
      setIsDialogOpen(false);

      if (pendingDialogResolveRef.current) {
        pendingDialogResolveRef.current(preflightMutationGate());
        pendingDialogResolveRef.current = null;
      }
    },
    [preflightMutationGate, setPolicySelection],
  );

  const requestMutationPermission = useCallback(async () => {
    const preflight = preflightMutationGate();
    if (!preflight.requiresPrompt) {
      return preflight;
    }

    return new Promise<AiMutationGateResult>((resolve) => {
      pendingDialogResolveRef.current = resolve;
      setIsDialogOpen(true);
    });
  }, [preflightMutationGate]);

  const handleDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setIsDialogOpen(true);
        return;
      }

      setIsDialogOpen(false);

      if (pendingDialogResolveRef.current) {
        resolveDialogResult('deny_session');
      }
    },
    [resolveDialogResult],
  );

  const gateValue = useMemo<AiMutationPermissionGate>(
    () => ({
      policy,
      isDialogOpen,
      previewMutationGate,
      preflightMutationGate,
      requestMutationPermission,
      setPolicySelection,
      clearPolicy,
    }),
    [
      clearPolicy,
      isDialogOpen,
      policy,
      preflightMutationGate,
      previewMutationGate,
      requestMutationPermission,
      setPolicySelection,
    ],
  );

  if (!business) return null;

  if (isLoading) return <Loader2 className="size-4 animate-spin" />;

  if (!hasBusinessAccess(business, user)) return null;

  return (
    <AiMutationPermissionGateContext.Provider value={gateValue}>
      {children}
      {enableAiMutationGate ? (
        <AiMutationPermissionDialog
          open={isDialogOpen}
          onOpenChange={handleDialogOpenChange}
          onSelect={resolveDialogResult}
        />
      ) : null}
    </AiMutationPermissionGateContext.Provider>
  );
}
