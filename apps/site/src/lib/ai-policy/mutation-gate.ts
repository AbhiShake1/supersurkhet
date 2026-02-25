import type {
  AiPermissionPolicyDoc,
  AiPermissionPolicyStore,
} from './permission-policy-store';

export type AiMutationSurface =
  | 'global_assistant'
  | 'embedded_ai'
  | (string & {});

export type AiMutationGateBlockedReason =
  | 'permission_required'
  | 'permission_denied_session';

export interface AiMutationGateInput {
  policyStore: AiPermissionPolicyStore;
  surface: AiMutationSurface;
  actionId: string;
  at: number;
}

export type AiMutationGateDecision =
  | {
      allowed: true;
      surface: AiMutationSurface;
      actionId: string;
      policy: AiPermissionPolicyDoc;
      consumedAllowOnce: boolean;
    }
  | {
      allowed: false;
      surface: AiMutationSurface;
      actionId: string;
      reason: AiMutationGateBlockedReason;
      policy: AiPermissionPolicyDoc | null;
    };

export function preflightAiMutationGate(
  input: AiMutationGateInput,
): AiMutationGateDecision {
  const policy = input.policyStore.getPolicy();

  if (!policy) {
    return {
      allowed: false,
      surface: input.surface,
      actionId: input.actionId,
      reason: 'permission_required',
      policy: null,
    };
  }

  if (policy.choice === 'deny_session') {
    return {
      allowed: false,
      surface: input.surface,
      actionId: input.actionId,
      reason: 'permission_denied_session',
      policy,
    };
  }

  if (policy.choice === 'allow_always') {
    return {
      allowed: true,
      surface: input.surface,
      actionId: input.actionId,
      policy,
      consumedAllowOnce: false,
    };
  }

  const consumedAllowOnce = input.policyStore.consumeMutationGrant(input.at);

  return {
    allowed: true,
    surface: input.surface,
    actionId: input.actionId,
    policy,
    consumedAllowOnce,
  };
}
