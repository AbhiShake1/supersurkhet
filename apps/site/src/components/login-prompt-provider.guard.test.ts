import { describe, expect, it } from 'vitest';
import { resolveLoginPromptGuardAction } from './login-prompt-provider';

describe('resolveLoginPromptGuardAction', () => {
  it('closes prompt when guard is disabled', () => {
    expect(
      resolveLoginPromptGuardAction({
        enabled: false,
        isAuthenticated: false,
        isLoading: false,
      }),
    ).toBe('close');
  });

  it('does nothing while auth state is loading', () => {
    expect(
      resolveLoginPromptGuardAction({
        enabled: true,
        isAuthenticated: false,
        isLoading: true,
      }),
    ).toBe('noop');
  });

  it('prompts when auth is required and user is unauthenticated', () => {
    expect(
      resolveLoginPromptGuardAction({
        enabled: true,
        isAuthenticated: false,
        isLoading: false,
      }),
    ).toBe('prompt');
  });

  it('closes prompt when auth is required and user is authenticated', () => {
    expect(
      resolveLoginPromptGuardAction({
        enabled: true,
        isAuthenticated: true,
        isLoading: false,
      }),
    ).toBe('close');
  });
});
