import { describe, expect, it } from 'vitest';
import { createAiPermissionPolicyStore } from '@/lib/ai-policy/permission-policy-store';
import { evaluateAiSurfaceGate } from './ai-surface-gates';

describe('ai-surface-gates', () => {
  it('allows read-only global assistant actions when authenticated and BYO-AI is connected', () => {
    const decision = evaluateAiSurfaceGate({
      actionId: 'global-assistant.open',
      surface: 'global_assistant',
      isAuthenticated: true,
      hasByoAiCredential: true,
      at: 100,
    });

    expect(decision.allowed).toBe(true);
  });

  it('blocks read-only actions until BYO-AI is connected', () => {
    const decision = evaluateAiSurfaceGate({
      actionId: 'embedded-ai.explain-selection',
      surface: 'embedded_ai',
      isAuthenticated: true,
      hasByoAiCredential: false,
      at: 100,
    });

    expect(decision.allowed).toBe(false);
    if (decision.allowed) {
      throw new Error('Expected blocked decision');
    }
    expect(decision.reason).toBe('byo_ai_required');
  });

  it('blocks read-only actions when unauthenticated', () => {
    const decision = evaluateAiSurfaceGate({
      actionId: 'embedded-ai.explain-selection',
      surface: 'embedded_ai',
      isAuthenticated: false,
      hasByoAiCredential: true,
      at: 100,
    });

    expect(decision.allowed).toBe(false);
    if (decision.allowed) {
      throw new Error('Expected blocked decision');
    }
    expect(decision.reason).toBe('auth_required');
  });

  it('blocks mutation actions when no policy exists', () => {
    const store = createAiPermissionPolicyStore();
    const decision = evaluateAiSurfaceGate({
      actionId: 'embedded-ai.apply-generated-layout',
      surface: 'embedded_ai',
      isAuthenticated: true,
      hasByoAiCredential: true,
      at: 100,
      policyStore: store,
    });

    expect(decision.allowed).toBe(false);
    if (decision.allowed) {
      throw new Error('Expected blocked decision');
    }
    expect(decision.reason).toBe('mutation_policy_required');
  });

  it('blocks mutation actions when deny_session is active', () => {
    const store = createAiPermissionPolicyStore();
    store.setPolicy('deny_session', 100);
    const decision = evaluateAiSurfaceGate({
      actionId: 'embedded-ai.apply-generated-layout',
      surface: 'embedded_ai',
      isAuthenticated: true,
      hasByoAiCredential: true,
      at: 101,
      policyStore: store,
    });

    expect(decision.allowed).toBe(false);
    if (decision.allowed) {
      throw new Error('Expected blocked decision');
    }
    expect(decision.reason).toBe('mutation_denied_session');
  });

  it('consumes allow_once grants for mutation actions', () => {
    const store = createAiPermissionPolicyStore();
    store.setPolicy('allow_once', 100);
    const decision = evaluateAiSurfaceGate({
      actionId: 'embedded-ai.apply-generated-layout',
      surface: 'embedded_ai',
      isAuthenticated: true,
      hasByoAiCredential: true,
      at: 101,
      policyStore: store,
    });

    expect(decision.allowed).toBe(true);
    if (!decision.allowed) {
      throw new Error('Expected allowed decision');
    }
    expect(decision.consumedAllowOnce).toBe(true);
    expect(store.getPolicy()).toBeNull();
  });

  it('keeps allow_always grants active across surfaces', () => {
    const store = createAiPermissionPolicyStore();
    store.setPolicy('allow_always', 100);

    const globalDecision = evaluateAiSurfaceGate({
      actionId: 'global-assistant.propose-mutation',
      surface: 'global_assistant',
      isAuthenticated: true,
      hasByoAiCredential: true,
      at: 101,
      policyStore: store,
    });
    const embeddedDecision = evaluateAiSurfaceGate({
      actionId: 'embedded-ai.apply-generated-layout',
      surface: 'embedded_ai',
      isAuthenticated: true,
      hasByoAiCredential: true,
      at: 102,
      policyStore: store,
    });

    expect(globalDecision.allowed).toBe(true);
    expect(embeddedDecision.allowed).toBe(true);
    expect(store.getPolicy()?.choice).toBe('allow_always');
  });
});
