import { preflightAiMutationGate } from '@/lib/ai-policy/mutation-gate';
import type { AiPermissionPolicyStore } from '@/lib/ai-policy/permission-policy-store';
import {
  type AiActionSurface,
  resolveAiActionCapability,
} from '@/lib/ui-builder/registry/ai-action-capability';

export type AiSurfaceGateBlockedReason =
  | 'auth_required'
  | 'byo_ai_required'
  | 'mutation_policy_required'
  | 'mutation_denied_session';

export type AiSurfaceGateDecision =
  | {
      allowed: true;
      actionId: string;
      surface: AiActionSurface;
      consumedAllowOnce: boolean;
    }
  | {
      allowed: false;
      actionId: string;
      surface: AiActionSurface;
      reason: AiSurfaceGateBlockedReason;
      message: string;
    };

export interface AiSurfaceGateInput {
  actionId: string;
  surface: AiActionSurface;
  isAuthenticated: boolean;
  hasByoAiCredential: boolean;
  at: number;
  policyStore?: AiPermissionPolicyStore;
}

function buildBlockedDecision(
  input: Pick<AiSurfaceGateInput, 'actionId' | 'surface'>,
  reason: AiSurfaceGateBlockedReason,
): Extract<AiSurfaceGateDecision, { allowed: false }> {
  if (reason === 'auth_required') {
    return {
      allowed: false,
      actionId: input.actionId,
      surface: input.surface,
      reason,
      message: 'Sign in to use AI actions.',
    };
  }

  if (reason === 'byo_ai_required') {
    return {
      allowed: false,
      actionId: input.actionId,
      surface: input.surface,
      reason,
      message: 'Connect a BYO-AI provider to use this AI action.',
    };
  }

  if (reason === 'mutation_denied_session') {
    return {
      allowed: false,
      actionId: input.actionId,
      surface: input.surface,
      reason,
      message:
        'AI mutations are blocked for this session. Update permission policy to continue.',
    };
  }

  return {
    allowed: false,
    actionId: input.actionId,
    surface: input.surface,
    reason,
    message:
      'AI mutation permission is required. Choose allow once or always allow.',
  };
}

export function evaluateAiSurfaceGate(
  input: AiSurfaceGateInput,
): AiSurfaceGateDecision {
  if (!input.isAuthenticated) {
    return buildBlockedDecision(input, 'auth_required');
  }

  if (!input.hasByoAiCredential) {
    return buildBlockedDecision(input, 'byo_ai_required');
  }

  const capability = resolveAiActionCapability(input.actionId);

  if (capability.intent === 'read-only') {
    return {
      allowed: true,
      actionId: input.actionId,
      surface: input.surface,
      consumedAllowOnce: false,
    };
  }

  if (!input.policyStore) {
    return buildBlockedDecision(input, 'mutation_policy_required');
  }

  const mutationDecision = preflightAiMutationGate({
    policyStore: input.policyStore,
    surface: input.surface,
    actionId: input.actionId,
    at: input.at,
  });

  if (!mutationDecision.allowed) {
    if (mutationDecision.reason === 'permission_denied_session') {
      return buildBlockedDecision(input, 'mutation_denied_session');
    }
    return buildBlockedDecision(input, 'mutation_policy_required');
  }

  return {
    allowed: true,
    actionId: input.actionId,
    surface: input.surface,
    consumedAllowOnce: mutationDecision.consumedAllowOnce,
  };
}
