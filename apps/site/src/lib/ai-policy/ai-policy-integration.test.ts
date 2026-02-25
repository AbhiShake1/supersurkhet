import { describe, expect, it, vi } from 'vitest';
import {
  AI_MUTATION_PERMISSION_OPTIONS,
  type AiMutationPermissionOptionValue,
} from '@/components/permission-gate/ai-mutation-permission-dialog';
import {
  createAiPermissionPolicy,
  evaluateAiMutationGate,
  persistAiPermissionPolicyLocalFirst,
  readAiPermissionPolicyFromStorage,
} from '@/components/permission-gate/business-access-gate';
import { buildCapabilityDisclosure } from './capability-disclosure';

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe('ai policy integration', () => {
  it('exposes canonical prompt options exactly as required', () => {
    const labels = AI_MUTATION_PERMISSION_OPTIONS.map((option) => option.label);
    expect(labels).toEqual(['allow once', 'always allow', 'deny (session)']);

    const values = AI_MUTATION_PERMISSION_OPTIONS.map((option) => option.value);
    expect(values).toEqual<AiMutationPermissionOptionValue[]>([
      'allow_once',
      'allow_always',
      'deny_session',
    ]);
  });

  it('allow_once permits one mutation and then requires prompt again', () => {
    const allowOnce = createAiPermissionPolicy('allow_once', 1);

    const firstMutation = evaluateAiMutationGate(allowOnce);
    expect(firstMutation.allowed).toBe(true);
    expect(firstMutation.consumedAllowOnce).toBe(true);
    expect(firstMutation.nextPolicy).toBeNull();

    const secondMutation = evaluateAiMutationGate(firstMutation.nextPolicy);
    expect(secondMutation.allowed).toBe(false);
    expect(secondMutation.requiresPrompt).toBe(true);
    expect(secondMutation.blockedByPolicy).toBe(false);
  });

  it('allow_always persists repeated mutation access', () => {
    const allowAlways = createAiPermissionPolicy('allow_always', 2);

    const firstMutation = evaluateAiMutationGate(allowAlways);
    expect(firstMutation.allowed).toBe(true);
    expect(firstMutation.consumedAllowOnce).toBe(false);
    expect(firstMutation.nextPolicy).toEqual(allowAlways);

    const secondMutation = evaluateAiMutationGate(firstMutation.nextPolicy);
    expect(secondMutation.allowed).toBe(true);
    expect(secondMutation.requiresPrompt).toBe(false);
    expect(secondMutation.nextPolicy).toEqual(allowAlways);
  });

  it('deny_session blocks all mutating actions for the active session', () => {
    const denySession = createAiPermissionPolicy('deny_session', 3);

    const evaluation = evaluateAiMutationGate(denySession);
    expect(evaluation.allowed).toBe(false);
    expect(evaluation.blockedByPolicy).toBe(true);
    expect(evaluation.requiresPrompt).toBe(false);
    expect(evaluation.nextPolicy).toEqual(denySession);
  });

  it('persists policy locally first and mirrors optionally', async () => {
    const storage = new MemoryStorage();
    const mirrorHook = vi.fn(async () => {});
    const storageKey = 'test-ai-policy';
    const policy = createAiPermissionPolicy('allow_always', 5);

    await persistAiPermissionPolicyLocalFirst(policy, {
      storage,
      storageKey,
      mirrorHook,
    });

    const persisted = readAiPermissionPolicyFromStorage({
      storage,
      storageKey,
    });
    expect(persisted).toEqual(policy);
    expect(mirrorHook).toHaveBeenCalledWith(policy);

    await persistAiPermissionPolicyLocalFirst(null, {
      storage,
      storageKey,
      mirrorHook,
    });
    expect(
      readAiPermissionPolicyFromStorage({ storage, storageKey }),
    ).toBeNull();
    expect(mirrorHook).toHaveBeenCalledWith(null);
  });

  it('returns high-level capability disclosures and denies sensitive requests', () => {
    const disclosure = buildCapabilityDisclosure({
      requestedClasses: ['write_data', 'integrations', 'token', 'raw payload'],
    });

    expect(disclosure.capabilities.map((item) => item.id)).toEqual([
      'write_data',
      'integrations',
    ]);
    expect(disclosure.deniedRequests).toEqual(['token', 'raw payload']);

    const loweredSummary = disclosure.summary.toLowerCase();
    expect(loweredSummary.includes('token')).toBe(false);
    expect(loweredSummary.includes('secret')).toBe(false);
  });
});
