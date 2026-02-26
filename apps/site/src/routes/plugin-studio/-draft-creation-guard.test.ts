import { describe, expect, it } from 'vitest';
import { shouldCreatePluginDraft } from './-draft-creation-guard';

describe('shouldCreatePluginDraft', () => {
  it('returns true when draft should be created', () => {
    expect(
      shouldCreatePluginDraft({
        pluginId: 'orders-plugin',
        isDraftLoading: false,
        isActorIdentityReady: true,
        activeDraftPluginId: null,
        hasAttemptedDraftCreation: false,
      }),
    ).toBe(true);
  });

  it('returns false for empty plugin id', () => {
    expect(
      shouldCreatePluginDraft({
        pluginId: '   ',
        isDraftLoading: false,
        isActorIdentityReady: true,
        activeDraftPluginId: null,
        hasAttemptedDraftCreation: false,
      }),
    ).toBe(false);
  });

  it('returns false while draft rows are loading', () => {
    expect(
      shouldCreatePluginDraft({
        pluginId: 'orders-plugin',
        isDraftLoading: true,
        isActorIdentityReady: true,
        activeDraftPluginId: null,
        hasAttemptedDraftCreation: false,
      }),
    ).toBe(false);
  });

  it('returns false when actor identity is not ready', () => {
    expect(
      shouldCreatePluginDraft({
        pluginId: 'orders-plugin',
        isDraftLoading: false,
        isActorIdentityReady: false,
        activeDraftPluginId: null,
        hasAttemptedDraftCreation: false,
      }),
    ).toBe(false);
  });

  it('returns false when active draft already matches plugin', () => {
    expect(
      shouldCreatePluginDraft({
        pluginId: 'orders-plugin',
        isDraftLoading: false,
        isActorIdentityReady: true,
        activeDraftPluginId: 'orders-plugin',
        hasAttemptedDraftCreation: false,
      }),
    ).toBe(false);
  });

  it('returns false when creation was already attempted for draft id', () => {
    expect(
      shouldCreatePluginDraft({
        pluginId: 'orders-plugin',
        isDraftLoading: false,
        isActorIdentityReady: true,
        activeDraftPluginId: null,
        hasAttemptedDraftCreation: true,
      }),
    ).toBe(false);
  });
});
