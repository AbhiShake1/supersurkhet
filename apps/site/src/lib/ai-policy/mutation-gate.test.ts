import { describe, expect, it } from 'vitest';
import { createAiPermissionPolicyStore } from './permission-policy-store';
import { preflightAiMutationGate } from './mutation-gate';

describe('ai mutation gate preflight', () => {
  it('blocks mutation when no policy exists', () => {
    const store = createAiPermissionPolicyStore();

    const decision = preflightAiMutationGate({
      policyStore: store,
      surface: 'global_assistant',
      actionId: 'assistant.write.todo',
      at: 10,
    });

    expect(decision).toEqual({
      allowed: false,
      surface: 'global_assistant',
      actionId: 'assistant.write.todo',
      reason: 'permission_required',
      policy: null,
    });
  });

  it('allows repeated mutations for allow_always', () => {
    const store = createAiPermissionPolicyStore();
    store.setPolicy('allow_always', 20);

    const first = preflightAiMutationGate({
      policyStore: store,
      surface: 'global_assistant',
      actionId: 'assistant.write.todo',
      at: 21,
    });

    const second = preflightAiMutationGate({
      policyStore: store,
      surface: 'embedded_ai',
      actionId: 'embedded.write.layout',
      at: 22,
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(first.allowed && first.consumedAllowOnce).toBe(false);
    expect(second.allowed && second.consumedAllowOnce).toBe(false);
  });

  it('allows one mutation for allow_once and then resets', () => {
    const store = createAiPermissionPolicyStore();
    store.setPolicy('allow_once', 30);

    const first = preflightAiMutationGate({
      policyStore: store,
      surface: 'global_assistant',
      actionId: 'assistant.write.todo',
      at: 31,
    });

    const second = preflightAiMutationGate({
      policyStore: store,
      surface: 'embedded_ai',
      actionId: 'embedded.write.layout',
      at: 32,
    });

    expect(first.allowed).toBe(true);
    expect(first.allowed && first.consumedAllowOnce).toBe(true);
    expect(second).toEqual({
      allowed: false,
      surface: 'embedded_ai',
      actionId: 'embedded.write.layout',
      reason: 'permission_required',
      policy: null,
    });
  });

  it('blocks all mutation attempts for deny_session', () => {
    const store = createAiPermissionPolicyStore();
    store.setPolicy('deny_session', 40);

    const decision = preflightAiMutationGate({
      policyStore: store,
      surface: 'embedded_ai',
      actionId: 'embedded.write.layout',
      at: 41,
    });

    expect(decision).toEqual({
      allowed: false,
      surface: 'embedded_ai',
      actionId: 'embedded.write.layout',
      reason: 'permission_denied_session',
      policy: {
        choice: 'deny_session',
        updatedAt: 40,
      },
    });
  });

  it('uses one shared store across surfaces for AC-08 consistency', () => {
    const store = createAiPermissionPolicyStore();
    store.setPolicy('allow_once', 50);

    const assistantDecision = preflightAiMutationGate({
      policyStore: store,
      surface: 'global_assistant',
      actionId: 'assistant.write.todo',
      at: 51,
    });

    const embeddedDecision = preflightAiMutationGate({
      policyStore: store,
      surface: 'embedded_ai',
      actionId: 'embedded.write.layout',
      at: 52,
    });

    expect(assistantDecision.allowed).toBe(true);
    expect(embeddedDecision.allowed).toBe(false);
    expect(embeddedDecision).toEqual({
      allowed: false,
      surface: 'embedded_ai',
      actionId: 'embedded.write.layout',
      reason: 'permission_required',
      policy: null,
    });
  });
});
