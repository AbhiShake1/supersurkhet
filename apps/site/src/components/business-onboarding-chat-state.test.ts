import { describe, expect, it } from 'vitest';
import {
  businessOnboardingSessionReducer,
  canTransitionToBusinessIntent,
  createInitialBusinessOnboardingSession,
} from './business-onboarding-chat-state';

describe('business onboarding chat state reducer', () => {
  it('transitions through deterministic stage order', () => {
    let state = createInitialBusinessOnboardingSession({
      selectedProviderId: 'openai',
      selectedModelId: 'gpt-5-mini',
      selectedAuthMode: 'api-key',
    });

    state = businessOnboardingSessionReducer(state, {
      type: 'select_provider',
      providerId: 'google',
      defaultAuthMode: 'oauth-access-token',
      modelId: 'gemini-2.5-flash',
      oauthMethodId: 'google-antigravity-oauth',
    });
    expect(state.stage).toBe('select_model');

    state = businessOnboardingSessionReducer(state, {
      type: 'select_model',
      modelId: 'gemini-2.5-flash',
    });
    expect(state.stage).toBe('select_auth_method');

    state = businessOnboardingSessionReducer(state, {
      type: 'select_auth_mode',
      authMode: 'oauth-access-token',
    });
    expect(state.stage).toBe('authenticate');

    state = businessOnboardingSessionReducer(state, {
      type: 'oauth_connected',
      at: 123,
    });
    expect(state.stage).toBe('auth_ready');

    state = businessOnboardingSessionReducer(state, {
      type: 'set_stage',
      stage: 'business_intent',
    });
    expect(state.stage).toBe('business_intent');
  });

  it('allows continue-without-ai without requiring auth', () => {
    const initialState = createInitialBusinessOnboardingSession({
      selectedProviderId: 'openai',
      selectedModelId: 'gpt-5-mini',
      selectedAuthMode: 'api-key',
    });

    const skipped = businessOnboardingSessionReducer(initialState, {
      type: 'skip_auth',
    });

    expect(skipped.stage).toBe('business_intent');
    expect(skipped.authStatus).toBe('skipped');
    expect(canTransitionToBusinessIntent(skipped)).toBe(true);
  });
});
