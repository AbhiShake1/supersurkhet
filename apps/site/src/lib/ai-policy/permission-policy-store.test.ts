import { describe, expect, it } from 'vitest';
import {
  createAiPermissionPolicyStore,
  transitionAiPermissionPolicyState,
} from './permission-policy-store';

describe('ai permission policy store', () => {
  it('starts empty and blocks consumption without policy', () => {
    const store = createAiPermissionPolicyStore();

    expect(store.getPolicy()).toBeNull();
    expect(store.consumeMutationGrant(Date.now())).toBe(false);
    expect(store.getPolicy()).toBeNull();
  });

  it('resets allow_once after one mutation consumption', () => {
    const store = createAiPermissionPolicyStore();
    store.setPolicy('allow_once', 100);

    expect(store.getPolicy()).toEqual({
      choice: 'allow_once',
      updatedAt: 100,
    });

    expect(store.consumeMutationGrant(101)).toBe(true);
    expect(store.getPolicy()).toBeNull();
    expect(store.consumeMutationGrant(102)).toBe(false);
  });

  it('keeps allow_always stable across repeated consumptions', () => {
    const store = createAiPermissionPolicyStore();
    store.setPolicy('allow_always', 200);

    expect(store.consumeMutationGrant(201)).toBe(false);
    expect(store.consumeMutationGrant(202)).toBe(false);
    expect(store.getPolicy()).toEqual({
      choice: 'allow_always',
      updatedAt: 200,
    });
  });

  it('keeps deny_session stable across repeated consumptions', () => {
    const store = createAiPermissionPolicyStore();
    store.setPolicy('deny_session', 300);

    expect(store.consumeMutationGrant(301)).toBe(false);
    expect(store.getPolicy()).toEqual({
      choice: 'deny_session',
      updatedAt: 300,
    });
  });

  it('clear_policy transitions to empty state', () => {
    const store = createAiPermissionPolicyStore();
    store.setPolicy('allow_always', 400);

    store.clearPolicy();

    expect(store.getPolicy()).toBeNull();
  });

  it('provides deterministic transition behavior', () => {
    const nextState = transitionAiPermissionPolicyState(
      {
        policy: {
          choice: 'allow_once',
          updatedAt: 500,
        },
      },
      {
        type: 'consume_mutation_grant',
        at: 501,
      },
    );

    expect(nextState).toEqual({ policy: null });
  });
});
